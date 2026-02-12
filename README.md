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


<img width="1331" height="740" alt="image" src="https://github.com/user-attachments/assets/f184613d-d64d-4634-801b-2b93b370d0ee" />


2. Google consent/auth flow
<img width="1592" height="791" alt="image" src="https://github.com/user-attachments/assets/6ba24a84-161b-409b-96ac-abd09754bf8c" />


<img width="1479" height="770" alt="image" src="https://github.com/user-attachments/assets/2cd460f9-3541-41b7-a332-5020a207e817" />


3. Logged-in home with profile button (top-right)

<img width="1107" height="297" alt="image" src="https://github.com/user-attachments/assets/bc44ff3a-54ef-43ec-84b2-0a8f0bae5ade" />

4. Add bookmark form + successful new bookmark shown instantly
<img width="1010" height="831" alt="image" src="https://github.com/user-attachments/assets/93a58a3f-a3fb-41fb-a71f-a85cefb97fd8" />


5. Edit bookmark mode (inline title/url inputs)
<img width="997" height="471" alt="image" src="https://github.com/user-attachments/assets/95b52c9d-e72f-405b-98ee-f24ec1f902ce" />

6. Log Out Button Click on Profile Button
7. <img width="1056" height="385" alt="image" src="https://github.com/user-attachments/assets/fcd6b149-eab0-40a3-b53d-f653e5af27ac" />


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

