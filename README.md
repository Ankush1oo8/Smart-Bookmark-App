# Smart Bookmark App

A private bookmark manager where users sign in with Google, manage only their own bookmarks, and see updates live across tabs.

## Features

- Google OAuth sign in only (no email/password)
- Add bookmark (`title` + `url`)
- Edit bookmark
- Delete bookmark
- Private per-user data enforced with Supabase RLS
- Realtime sync across tabs/windows
- Profile button (name + avatar from Google), with sign out in dropdown

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Auth, Postgres, Realtime)
- Tailwind CSS
- Vercel (deployment)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Fill `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

4. In Supabase SQL Editor, run:

- `supabase/schema.sql`

5. Configure Google OAuth:

- Supabase -> Authentication -> Providers -> Google
- Add Google Client ID and Client Secret
- Keep provider enabled

6. Configure redirect URLs:

- Supabase -> Authentication -> URL Configuration
  - `Site URL`: `http://localhost:3000`
  - Redirect URLs:
    - `http://localhost:3000/`
    - `http://localhost:3000/auth/callback`

7. Run app:

```bash
npm run dev
```

## Deploy (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add environment variables in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. Add production URLs in Supabase and Google OAuth settings:
- `https://YOUR_VERCEL_DOMAIN/`
- `https://YOUR_VERCEL_DOMAIN/auth/callback`

## Screenshots (All Screens)



1. Login screen (before auth)

```md
![Login Screen](./screenshots/01-login.png)
```

2. Google consent/auth flow

```md
![Google Auth](./screenshots/02-google-auth.png)
```

3. Logged-in home with profile button (top-right)

```md
![Home Logged In](./screenshots/03-home-logged-in.png)
```

4. Add bookmark form + successful new bookmark shown instantly

```md
![Add Bookmark](./screenshots/04-add-bookmark.png)
```

5. Edit bookmark mode (inline title/url inputs)

```md
![Edit Bookmark](./screenshots/05-edit-bookmark.png)
```

6. Delete bookmark action/result

```md
![Delete Bookmark](./screenshots/06-delete-bookmark.png)
```

7. Profile dropdown opened with sign out button

```md
![Profile Menu](./screenshots/07-profile-menu.png)
```

8. Realtime sync demo (same user in two tabs)

```md
![Realtime Sync](./screenshots/08-realtime-sync.png)
```

9. Privacy demo (different user cannot see other user's bookmarks)

```md
![Privacy Isolation](./screenshots/09-privacy-isolation.png)
```

## Notes: Problems and Solutions

1. **OAuth/session reliability during local development**
- Problem: Login could return to sign-in screen if session exchange/redirect setup was incomplete.
- Solution: Configure redirect URLs correctly in Supabase + Google, use middleware session refresh, and verify env keys.

2. **Bookmarks appearing only after refresh**
- Problem: New/deleted items were not immediately visible in the same tab.
- Solution: Added immediate local state updates after insert/delete, while keeping realtime sync as backup.

3. **Data privacy enforcement**
- Problem: Client-side filtering alone is not secure.
- Solution: Enabled RLS and strict per-user policies in `supabase/schema.sql`.

## Project Structure

- `app/page.tsx` - main page
- `app/components/bookmark-app.tsx` - auth-aware bookmark UI and interactions
- `app/auth/callback/route.ts` - OAuth callback exchange endpoint
- `middleware.ts` - Supabase auth session refresh middleware
- `supabase/schema.sql` - table, RLS policies, trigger, realtime publication

## Submission Checklist

- [ ] Live Vercel URL
- [ ] Public GitHub repository URL
- [x] README with setup + problems/solutions
- [ ] Screenshots added for all listed screens
