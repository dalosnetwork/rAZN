# RAZN Deployment Guide

This file is the operational source of truth for agents and developers before
committing, pushing, merging, or deploying this repository.

## Branch Model

RAZN uses two long-lived branches:

- `main`: production branch. This branch must always be deployable.
- `dev`: staging branch. This branch is used to integrate work before production.

All other branches must be short-lived and deleted after merge:

- `feat/<short-description>` for new features
- `fix/<short-description>` for bug fixes
- `docs/<short-description>` for documentation-only changes
- `chore/<short-description>` for maintenance work
- `refactor/<short-description>` for behavior-preserving code cleanup
- `hotfix/<short-description>` for urgent production fixes

The normal flow is:

```text
feat/*, fix/*, docs/*, chore/*, refactor/*
  -> dev
  -> main
  -> production deploy
```

Hotfix flow:

```text
hotfix/*
  -> main
  -> production deploy
  -> merge main back into dev
```

## Protected Branch Rules

`main` is production and must be protected in the Git host.

Required `main` rules:

- Direct push to `main` is forbidden.
- Force push to `main` is forbidden.
- Deleting `main` is forbidden.
- Merges into `main` must happen through a pull request.
- Required checks must pass before merging into `main`.
- At least one human review is recommended before merging production changes.

Recommended `dev` rules:

- Avoid direct pushes to `dev`.
- Prefer pull requests from short-lived branches into `dev`.
- Force push to `dev` is forbidden.
- Required checks should pass before merging into `dev`.

## AI Agent Rules

Any AI agent working in this repository must follow these rules:

- Read this file before committing, pushing, merging, or deploying.
- Never push directly to `main`.
- Never force push `main` or `dev`.
- Never deploy from a dirty working tree.
- Never commit secrets, `.env` files, private keys, tokens, dumps, or credentials.
- Never revert unrelated user changes.
- Never include unrelated files in a commit.
- Before commit, inspect `git status --short`.
- Before push, verify the current branch and upstream target.
- Before deployment, verify the exact commit SHA being deployed.
- If database schema changed, follow the migration rules in this file.

If these rules conflict with a user request, pause and ask for confirmation
before continuing.

## Commit Checklist

Before creating a commit:

```sh
git status --short
git branch --show-current
```

Check that:

- The branch is a short-lived branch such as `feat/*`, `fix/*`, `docs/*`,
  `chore/*`, `refactor/*`, or `hotfix/*`.
- The commit does not include unrelated files.
- The commit does not include secrets or local machine files.
- The change has been validated with the relevant commands below.

Use clear commit messages:

```text
feat: add redemption workflow
fix: correct auth session expiry
docs: add deployment guide
chore: update docker health check
```

## Push Checklist

Before pushing:

```sh
git status --short
git branch --show-current
git remote -v
```

Check that:

- The working tree is clean after commit.
- The branch is not `main`.
- The push target is correct.
- The branch name follows the branch model.

Pushing to `main` directly is not allowed.

## Dashboard Validation

The main application currently lives under `dashboard`.

Run validation from:

```sh
cd dashboard
```

Minimum validation before merging into `dev`:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm check-types
pnpm build
```

If API behavior changed, also run:

```sh
pnpm --filter api test
```

If infrastructure or container behavior changed, also run a production-style
smoke test when practical:

```sh
pnpm infra:up:prod
docker compose ps
```

Then verify the public health endpoint:

```sh
curl -ksSL -o /tmp/caddy_health.txt -w "%{http_code}" https://localhost/healthz
```

Expected result: `200`.

## Database Migration Rules

Database schema changes must be explicit and reviewed carefully.

When editing database schema files:

```sh
cd dashboard
pnpm db:generate
```

Before applying migrations to a persistent environment:

```sh
pnpm db:migrate:safe
```

Rules:

- Do not use `pnpm db:push` against staging or production.
- Do not edit generated migration files casually after they have been reviewed.
- Do not deploy application code that depends on an unapplied migration.
- For risky migrations, prepare a rollback or forward-fix plan before merging.
- For production migrations, confirm backup/snapshot availability first.

## Staging Deploy Flow

Staging deploys come from `dev`.

Recommended flow:

```text
short-lived branch -> pull request -> dev -> staging deploy
```

Before staging deploy:

```sh
git checkout dev
git pull --ff-only origin dev
git status --short
cd dashboard
pnpm lint
pnpm check-types
pnpm build
```

After staging deploy:

- Verify app startup.
- Verify API health.
- Verify Caddy or public health endpoint.
- Review logs for startup errors.
- Smoke test the changed user flow.

## Production Deploy Flow

Production deploys come from `main`.

Recommended flow:

```text
dev -> pull request -> main -> production deploy
```

Before production deploy:

```sh
git checkout main
git pull --ff-only origin main
git status --short
git rev-parse HEAD
cd dashboard
pnpm lint
pnpm check-types
pnpm build
```

Production environment must define:

- `CADDY_HOST`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `NEXT_PUBLIC_API_BASE_URL`
- `DATABASE_URL` or the Compose-managed Postgres settings
- `REDIS_URL` or the Compose-managed Redis settings

For the current Docker Compose production-style stack:

```sh
cd dashboard
docker compose -f docker-compose.yml up -d --build postgres pgbouncer redis api web
```

If a server uses a shared edge reverse proxy, keep that proxy outside the
application deploy. In that setup, do not restart the Compose `caddy` service
from the dashboard deploy workflow unless the edge proxy has intentionally been
moved back into this stack.

After production deploy:

- Verify public health endpoint.
- Verify login/auth flow.
- Verify API requests through the public route.
- Review container status and logs.
- Record the deployed commit SHA.

## Runtime And Secrets

Rules:

- Keep real secrets out of git.
- Use environment variables for runtime configuration.
- Keep development and production values separate.
- `BETTER_AUTH_SECRET` must be a strong production secret.
- `BETTER_AUTH_URL`, `CORS_ORIGIN`, and `NEXT_PUBLIC_API_BASE_URL` must match
  the deployed public domain.
- Do not commit `.env` files unless they are sanitized examples.

## Rollback

Preferred rollback options:

- Revert the bad commit with `git revert` and redeploy.
- Redeploy the previous known-good commit or image.
- For database changes, prefer forward fixes unless a tested rollback exists.

Rollback checklist:

- Identify the bad commit SHA.
- Identify the last known-good commit SHA.
- Check whether database migrations were applied.
- Check whether secrets or runtime configuration changed.
- Redeploy.
- Verify health endpoints and the affected user flow.

## CI/CD

This repository uses GitHub Actions for the baseline pipeline.

Workflow files:

- `.github/workflows/dashboard-ci.yml`
- `.github/workflows/dashboard-deploy.yml`

`Dashboard CI` runs on:

- Pull requests into `dev`
- Pull requests into `main`
- Pushes to `dev`
- Pushes to `main`
- Manual workflow dispatch

`Dashboard CI` runs:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm check-types`
- `pnpm --filter api test`
- `pnpm build`

`Dashboard Deploy` runs on:

- Successful `Dashboard CI` runs on `dev`, deploying `dev` to the `staging`
  environment
- Successful `Dashboard CI` runs on `main`, deploying `main` to the
  `production` environment
- Manual workflow dispatch with `staging` or `production`

The automatic deploy path intentionally waits for CI to finish successfully
before touching staging or production.

Because `Dashboard Deploy` uses the `workflow_run` event, the deploy workflow
file must exist on the repository default branch before automatic deploys can
start. Manual dispatch remains available from the Actions UI once the workflow
exists on GitHub.

The deploy workflow connects to the configured server over SSH. It can either
run the inline deploy flow from `DEPLOY_PATH`, or call a root-owned deploy
command configured through `DEPLOY_COMMAND`.

Default inline deploy flow:

```sh
git fetch origin <branch>
git checkout <branch>
git pull --ff-only origin <branch>
cd dashboard
docker compose -f docker-compose.yml up -d --build postgres pgbouncer redis api web
docker compose -f docker-compose.yml ps postgres pgbouncer redis api web
```

By default, the deploy workflow intentionally leaves `caddy` alone because some
servers use a shared edge Caddy instance for multiple apps. Override the service
list only when the target environment is intentionally different.

For shared servers, prefer a dedicated SSH user plus a narrow root-owned deploy
command instead of giving the deploy user broad Docker access. Example command
path:

```text
/usr/local/bin/razn-dashboard-deploy
```

That command should accept only `dev` or `main`, update the known repository
path, rebuild the intended dashboard services, and leave the shared edge proxy
alone.

Required GitHub environment secrets for `staging`:

- `STAGING_SSH_HOST`
- `STAGING_SSH_PORT` (optional, defaults to `22`)
- `STAGING_SSH_USER`
- `STAGING_SSH_KEY`
- `STAGING_DEPLOY_PATH` or `STAGING_DEPLOY_COMMAND`
- `STAGING_HEALTH_URL` (optional)
- `STAGING_DEPLOY_SERVICES` (optional, defaults to `postgres pgbouncer redis api web`)

Required GitHub environment secrets for `production`:

- `PRODUCTION_SSH_HOST`
- `PRODUCTION_SSH_PORT` (optional, defaults to `22`)
- `PRODUCTION_SSH_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_DEPLOY_PATH` or `PRODUCTION_DEPLOY_COMMAND`
- `PRODUCTION_HEALTH_URL` (optional)
- `PRODUCTION_DEPLOY_SERVICES` (optional, defaults to `postgres pgbouncer redis api web`)

`STAGING_DEPLOY_PATH` and `PRODUCTION_DEPLOY_PATH`, when used, must point to the
repository root on the target server. Example:

```text
/srv/rAZN
```

The server must already have:

- Git access to `dalosnetwork/rAZN`
- Docker and Docker Compose
- A valid `dashboard/.env` file for that environment
- Production secrets outside git

Recommended required checks:

- `Lint, typecheck, test, build`

## Manual Git Host Setup

Configure the Git host with:

- `main` branch protection.
- Optional `dev` branch protection.
- Required status checks once CI exists.
- Pull request review requirement for `main`.
- Disabled force pushes for `main` and `dev`.
- Disabled branch deletion for `main`.

Until CI/CD is added, treat this file as the manual deployment gate.
