"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import type { Database } from "@/lib/database.types";

type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"];

export default function BookmarkApp() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const applyProfileFromUser = useCallback((user: { email?: string; user_metadata?: Record<string, unknown> } | null) => {
    if (!user) {
      setProfileName("");
      setProfileAvatar("");
      return;
    }

    const metadata = user.user_metadata ?? {};
    const fullName = metadata.full_name;
    const name = metadata.name;
    const avatarUrl = metadata.avatar_url;
    const picture = metadata.picture;

    const resolvedName =
      (typeof fullName === "string" && fullName) ||
      (typeof name === "string" && name) ||
      user.email ||
      "Profile";

    const resolvedAvatar =
      (typeof avatarUrl === "string" && avatarUrl) || (typeof picture === "string" && picture) || "";

    setProfileName(resolvedName);
    setProfileAvatar(resolvedAvatar);
  }, []);

  const fetchBookmarks = useCallback(
    async (uid: string) => {
      const { data, error: queryError } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        return;
      }

      setError(null);
      setBookmarks(data ?? []);
    },
    [supabase]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        let user = session?.user ?? null;
        if (!user) {
          const {
            data: { user: fetchedUser },
            error: userError
          } = await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }
          user = fetchedUser ?? null;
        }

        const nextUserId = user?.id ?? null;
        applyProfileFromUser(user);

        if (!isMounted) {
          return;
        }

        setUserId(nextUserId);
        setLoading(false);

        if (nextUserId) {
          void fetchBookmarks(nextUserId);
        } else {
          setBookmarks([]);
        }
      } catch (bootstrapError) {
        if (!isMounted) {
          return;
        }

        const message =
          bootstrapError instanceof Error
            ? bootstrapError.message
            : "Failed to load session. Please sign in again.";
        setError(message);
        setUserId(null);
        setBookmarks([]);
        applyProfileFromUser(null);
        setLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      applyProfileFromUser(session?.user ?? null);

      if (nextUserId) {
        void fetchBookmarks(nextUserId);
      } else {
        setBookmarks([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applyProfileFromUser, fetchBookmarks, supabase]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`bookmarks-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks", filter: `user_id=eq.${userId}` },
        async () => {
          await fetchBookmarks(userId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchBookmarks, supabase, userId]);

  const signInWithGoogle = async () => {
    setError(null);
    const redirectTo = `${window.location.origin}/`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });

    if (signInError) {
      setError(signInError.message);
    }
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
    setProfileMenuOpen(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !url.trim()) {
      setError("Title and URL are required.");
      return;
    }

    const { data: insertedBookmark, error: insertError } = await supabase
      .from("bookmarks")
      .insert(
        {
          title: title.trim(),
          url: url.trim()
        } as Database["public"]["Tables"]["bookmarks"]["Insert"]
      )
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setError(null);
    if (insertedBookmark) {
      setBookmarks((prev) => [insertedBookmark, ...prev]);
    } else if (userId) {
      await fetchBookmarks(userId);
    }
    setTitle("");
    setUrl("");
  };

  const deleteBookmark = async (bookmarkId: string) => {
    setError(null);
    const previousBookmarks = bookmarks;
    setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== bookmarkId));

    const { error: deleteError } = await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    if (deleteError) {
      setError(deleteError.message);
      setBookmarks(previousBookmarks);
    }
  };

  const startEdit = (bookmark: Bookmark) => {
    setError(null);
    setEditingBookmarkId(bookmark.id);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
  };

  const cancelEdit = () => {
    setEditingBookmarkId(null);
    setEditTitle("");
    setEditUrl("");
  };

  const saveEdit = async (bookmarkId: string) => {
    setError(null);

    if (!editTitle.trim() || !editUrl.trim()) {
      setError("Title and URL are required.");
      return;
    }

    const { data: updatedBookmark, error: updateError } = await supabase
      .from("bookmarks")
      .update({
        title: editTitle.trim(),
        url: editUrl.trim()
      })
      .eq("id", bookmarkId)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (updatedBookmark) {
      setBookmarks((prev) => prev.map((bookmark) => (bookmark.id === bookmarkId ? updatedBookmark : bookmark)));
    }

    cancelEdit();
  };

  if (loading) {
    return (
      <div className="surface rounded-2xl p-6">
        <p className="text-sm font-medium text-slate-600">Loading session...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="surface rounded-3xl p-8 md:p-10">
        <h2 className="text-3xl font-semibold md:text-4xl">Private bookmarks, zero clutter</h2>
        <p className="mt-3 max-w-xl text-slate-600">Sign in with Google to add, sync, and delete your own bookmarks.</p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-6 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          Continue with Google
        </button>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="surface inline-flex items-center gap-3 rounded-full px-3 py-2 text-left transition hover:shadow-md"
          >
            {profileAvatar ? (
              <Image src={profileAvatar} alt={profileName || "User"} width={36} height={36} className="rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-200 text-sm font-semibold text-orange-900">
                {(profileName || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="max-w-[180px] truncate text-sm font-semibold text-slate-800">
              {profileName || "Profile"}
            </span>
          </button>

          {profileMenuOpen ? (
            <div className="surface absolute right-0 z-10 mt-2 w-44 rounded-2xl p-2">
              <button
                type="button"
                onClick={signOut}
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-5">
        {error ? <p className="surface rounded-2xl p-4 text-sm text-red-700">{error}</p> : null}

        <div className="surface rounded-2xl border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Live updates</p>
          <p className="mt-1 text-sm text-emerald-900">Changes sync automatically between open tabs.</p>
        </div>

        <form onSubmit={onSubmit} className="surface rounded-2xl p-5">
          <h2 className="text-xl font-semibold">Add a bookmark</h2>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none ring-orange-300 transition focus:ring-2"
              type="text"
              placeholder="Title (e.g. Project docs)"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none ring-orange-300 transition focus:ring-2"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
          </div>
          <button
            className="mt-4 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
            type="submit"
          >
            Save bookmark
          </button>
        </form>

        <section className="surface rounded-2xl p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">My bookmarks</h2>
              <p className="text-sm text-slate-500">Private to your account only.</p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{bookmarks.length} total</p>
          </div>

          {bookmarks.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-600">No bookmarks yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {bookmarks.map((bookmark) => (
                <li
                  key={bookmark.id}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-orange-300 hover:shadow-sm"
                >
                  {editingBookmarkId === bookmark.id ? (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring-2"
                        type="text"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        required
                      />
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-orange-300 transition focus:ring-2"
                        type="url"
                        value={editUrl}
                        onChange={(event) => setEditUrl(event.target.value)}
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(bookmark.id)}
                          className="rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900">{bookmark.title}</p>
                        <a
                          className="mt-1 block truncate text-sm text-cyan-700 underline underline-offset-2"
                          href={bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {bookmark.url}
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(bookmark)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBookmark(bookmark.id)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
