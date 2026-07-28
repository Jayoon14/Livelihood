# Security and repository setup

## 1. Create your local environment file

Copy `.env.example` to `.env`, then enter the real values locally.

```bash
copy .env.example .env
```

Do not place terminal commands inside `.env`. It must contain only `NAME=value` entries.

## 2. Remove an already tracked environment file

Run this from the repository root if `.env` was previously committed:

```bash
git rm --cached admin-web/.env
git add admin-web/.gitignore admin-web/.env.example

git commit -m "Remove committed environment secrets"
```

If the repository root is already `admin-web`, use:

```bash
git rm --cached .env
git add .gitignore .env.example

git commit -m "Remove committed environment secrets"
```

## 3. Rotate exposed keys

Because the old `.env` was included in a shared archive or repository history:

- Rotate or regenerate the TomTom API key.
- Review Supabase API key usage and allowed origins.
- Restrict the TomTom key to the required domains and APIs where supported.

The Supabase anonymous key is intended for client applications, but it is safe only when Row Level Security policies correctly protect every exposed table.

## 4. Clean project archives

Do not include these when creating a ZIP for submission or deployment:

- `.git/`
- `node_modules/`
- `dist/`
- `.env`

Install dependencies after extraction with:

```bash
npm ci
```
