# Supabase Setup for OG's Golf

This is the safe first cloud step. The app still saves locally first. Supabase is only used to back up completed rounds.

## Step 1: Create the Supabase Project

1. Go to `https://supabase.com`.
2. Create an account or sign in.
3. Click **New project**.
4. Name the project `ogs-golf`.
5. Choose a strong database password and save it somewhere safe.
6. Pick the region closest to where the league plays.
7. Wait for Supabase to finish creating the project.

## Step 2: Create the Tables

1. In Supabase, open your `ogs-golf` project.
2. Go to **SQL Editor**.
3. Open `supabase/schema.sql` from this project.
4. Copy the SQL.
5. Paste it into the Supabase SQL editor.
6. Click **Run**.

## Step 3: Add Your Supabase Keys

1. In Supabase, go to **Project Settings**.
2. Open **API**.
3. Copy the **Project URL**.
4. Copy the **anon public** key.
5. Open `src/cloud/supabaseConfig.js`.
6. Paste those values into:

```js
url: "YOUR_PROJECT_URL",
anonKey: "YOUR_ANON_PUBLIC_KEY"
```

## Step 4: Use the App

1. Play and finish a round normally.
2. The round still saves to localStorage first.
3. On the final summary screen, tap **Save Completed Round to Cloud**.
4. If internet is available and Supabase is configured, the completed round is copied to Supabase.

## Why This Is Safe

- No live scoring yet.
- No rewrite.
- The app still works offline.
- localStorage remains the primary backup.
- Cloud save happens only after a completed round.
