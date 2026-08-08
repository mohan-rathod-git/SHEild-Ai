# Supabase — SHEildAI

This directory contains the **Supabase CLI** project for SHEildAI.
It manages database migrations, Edge Functions, and local-dev configuration.

## Prerequisites

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started):

   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase   # macOS
   ```

2. Create a Supabase Cloud project at <https://supabase.com/dashboard>.

## Link to your Supabase Cloud project

```bash
cd supabase/
supabase link --project-ref <your-project-ref>
```

> You can find your **project ref** in the Supabase Dashboard → Settings → General.

## Push migrations to Cloud

```bash
supabase db push
```

This applies all SQL files under `migrations/` (in filename order) to your
linked Supabase Cloud database.

### Current migrations

| File | Description |
|------|-------------|
| `00000000000000_enable_postgis.sql` | Enables the PostGIS extension for spatial queries |

## Local development (optional)

If you want to run Supabase locally (requires Docker):

```bash
supabase start
```

This starts a local Postgres + PostGIS, Auth, Storage, and Realtime stack.
The SHEildAI `docker-compose.yml` in `infra/` does **not** include the database —
it assumes you're using either Supabase Cloud or `supabase start` for the DB layer.
