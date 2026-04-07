# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## Local Infrastructure

This repo includes two Docker Compose setups:

- `docker-compose.dev.yml`: `postgres`, `pgbouncer`, `redis`, `redisinsight` (no `web` or `api`)
- `docker-compose.yml`: full stack (`caddy` + `web` + `api` + infra) for production-style runs

For local development with hot reload, start infra-only containers and run apps on host:

```sh
pnpm infra:up:dev
pnpm dev
```

Run the full production-style container stack:

```sh
pnpm infra:up:prod
```

Shorthand defaults to dev:

```sh
pnpm infra:up
pnpm infra:down
pnpm infra:logs
```

Explicit stop/log commands:

```sh
pnpm infra:down:dev
pnpm infra:down:prod
pnpm infra:logs:dev
pnpm infra:logs:prod
```

Run local API + Web together (host, one command):

```sh
pnpm dev
```

Services:

- Web: `http://localhost:3000`
- API: `http://localhost:3002`
- Postgres: `localhost:5432`
  - database: `dashboard`
  - user: `dashboard`
  - password: `dashboard`
- pgBouncer: `localhost:6432`
  - database: `dashboard`
  - user: `dashboard`
  - password: `dashboard`
- Redis: `localhost:6379`
- RedisInsight UI: `http://localhost:5540`

When running the full production-style stack (`pnpm infra:up:prod`):

- Public entrypoint (Caddy): `https://$CADDY_HOST` (for local smoke tests: `CADDY_HOST=localhost` and use `https://localhost`)
- Caddy health endpoint: `https://$CADDY_HOST/healthz`
- `web` and `api` are internal-only behind Caddy
- `redisinsight` is disabled by default in prod (`debug` profile only)
- If your local `.env` pins `BETTER_AUTH_URL` / `CORS_ORIGIN` to `http://localhost:3000`,
  update them to `https://$CADDY_HOST` for this mode.

### Production Deployment

In production, this stack uses Caddy as reverse proxy to:

- Expose the web app at `https://your-domain` with automatic TLS
- Forward `/api/*` requests to the API service (port 3002)
- Configure environment variables:
  - `CADDY_HOST=your-domain`
  - `BETTER_AUTH_SECRET=<long-random-secret>` (required in prod compose)
  - `BETTER_AUTH_URL=https://your-domain`
  - `CORS_ORIGIN=https://your-domain`
  - `NEXT_PUBLIC_API_BASE_URL=https://your-domain/api`

Postgres is initialized on first run with:

- `identity` schema
- `public.test` table

Quick DB checks:

```sh
docker compose -f docker-compose.dev.yml exec postgres psql -U dashboard -d dashboard -c "\dn"
docker compose -f docker-compose.dev.yml exec postgres psql -U dashboard -d dashboard -c "\dt public.*"
docker compose -f docker-compose.dev.yml exec postgres psql -U dashboard -d dashboard -c "select * from public.test limit 5;"
```

pgBouncer check:

```sh
psql "postgresql://dashboard:dashboard@localhost:6432/dashboard" -c "select 1;"
```

### RBAC Seeding

This repo includes an RBAC seed script for roles, permissions, and demo users.
RBAC tables are stored in the `identity` schema (`identity.roles`, `identity.permissions`, `identity.user_roles`, `identity.role_permissions`).
Role/permission definitions are centralized in [`packages/auth/src/rbac.ts`](packages/auth/src/rbac.ts), and the seed script syncs DB tables from that file.

Seeded roles:

- `super_admin`
- `compliance_officer`
- `treasurer`
- `risk_officer`
- `redemption_officer`
- `user`
- `read_only`

Run the seed:

```sh
pnpm seed:rbac
```

Default seeded users:

- `super.admin@dashboard.local`
- `compliance@dashboard.local`
- `treasurer@dashboard.local`
- `risk@dashboard.local`
- `redemption@dashboard.local`
- `user@dashboard.local`
- `readonly@dashboard.local`

Override seeded emails/passwords with:

- `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`
- `SEED_COMPLIANCE_EMAIL`, `SEED_COMPLIANCE_PASSWORD`
- `SEED_TREASURER_EMAIL`, `SEED_TREASURER_PASSWORD`
- `SEED_RISK_EMAIL`, `SEED_RISK_PASSWORD`
- `SEED_REDEMPTION_EMAIL`, `SEED_REDEMPTION_PASSWORD`
- `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`
- `SEED_READ_ONLY_EMAIL`, `SEED_READ_ONLY_PASSWORD`

Dashboard domain demo seeding has been intentionally removed to keep data organic in staging and production. Use real product flows after RBAC seed.

### Drizzle Migrations

`@repo/db` now has `drizzle-kit` migration scripts for running schema changes on existing volumes.

Generate a new migration after editing schema files:

```sh
pnpm db:generate
```

Generate with a custom migration name:

```sh
pnpm --filter @repo/db exec drizzle-kit generate --config=drizzle.config.ts --name add_new_table
```

Apply migrations to the current database volume:

```sh
pnpm db:migrate
```

Optional direct sync for local development:

```sh
pnpm db:push
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo build

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo build
yarn dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo build --filter=docs

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo build --filter=docs
yarn exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev --filter=web

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev --filter=web
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
