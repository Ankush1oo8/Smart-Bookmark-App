import BookmarkApp from "@/app/components/bookmark-app";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <header className="surface reveal mb-7 rounded-3xl p-6 md:p-8">
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Smart Bookmark App</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 md:text-lg">Save and organize your private bookmarks.</p>
      </header>
      <section className="reveal-delay">
        <BookmarkApp />
      </section>
    </main>
  );
}
