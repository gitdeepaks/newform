# tRPC Monorepo

This repository is a TypeScript monorepo built with pnpm workspaces and Turborepo. It is intended to be the base structure for building multiple applications that share the same API contract, database layer, services, logging, linting, and TypeScript configuration.

## Stack

- pnpm workspaces for package management
- Turborepo for running tasks across apps and packages
- Next.js for the web application
- Express for the API application
- tRPC for end-to-end typed APIs
- trpc-to-openapi and Scalar for OpenAPI-compatible routes and API docs
- Drizzle ORM with PostgreSQL for the database layer
- Zod for schema validation
- Winston for shared logging
- ESLint and Prettier for code quality and formatting

## Folder Structure

```txt
.
├── apps
│   ├── api
│   └── web
├── packages
│   ├── database
│   ├── eslint-config
│   ├── logger
│   ├── services
│   ├── trpc
│   └── typescript-config
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── setup.sh
└── turbo.json
```

## Apps

### `apps/api`

Express API server for serving the backend.

Main responsibilities:

- Starts the HTTP server
- Mounts the tRPC router at `/trpc`
- Mounts OpenAPI-compatible tRPC routes at `/api`
- Serves generated OpenAPI JSON at `/openapi.json`
- Serves Scalar API docs at `/docs`
- Provides basic health/status endpoints

Important files:

- `src/index.ts`: HTTP server entrypoint
- `src/server.ts`: Express application setup
- `src/env.ts`: API environment configuration

### `apps/web`

Next.js frontend application.

Main responsibilities:

- Renders the web UI
- Consumes the typed tRPC API from `@repo/trpc`
- Provides app-level UI components, hooks, providers, and frontend utilities

Important folders:

- `app`: Next.js App Router routes, layouts, and global styles
- `components`: React components and UI primitives
- `hooks`: frontend hooks
- `lib`: frontend utilities
- `providers`: React providers
- `trpc`: frontend tRPC client setup

## Packages

### `packages/trpc`

Shared tRPC package used by both the API server and frontend apps.

Main responsibilities:

- Defines the root `serverRouter`
- Defines tRPC procedures, routers, context, and schemas
- Exports typed client helpers for frontend consumers
- Connects route procedures to the service layer

Important folders:

- `server/routes`: tRPC route modules
- `server/services`: service exports used by tRPC routes
- `server/utils`: tRPC server utilities
- `client`: typed tRPC client exports

### `packages/services`

Business logic layer.

Main responsibilities:

- Keeps business rules out of API route definitions
- Coordinates database access, external clients, and reusable domain logic
- Defines service-level schemas and models

Current areas:

- `user`: user and authentication-related service logic
- `clients`: external service clients, such as Google OAuth

### `packages/database`

Database package using Drizzle ORM and PostgreSQL.

Main responsibilities:

- Creates and exports the Drizzle database client
- Defines database schemas and models
- Stores Drizzle migrations
- Provides database migration and generation scripts

Important folders:

- `models`: Drizzle table definitions
- `drizzle`: generated migration files and metadata

### `packages/logger`

Shared Winston logger package.

Main responsibilities:

- Provides a shared logger across apps and packages
- Uses readable console logging in development
- Uses structured JSON logging outside development

### `packages/eslint-config`

Shared ESLint configuration package.

Main responsibilities:

- Provides reusable lint configs for Node, React, and Next.js projects
- Keeps linting behavior consistent across the monorepo

### `packages/typescript-config`

Shared TypeScript configuration package.

Main responsibilities:

- Provides base TypeScript configs for Node and Next.js packages
- Keeps compiler options consistent across the monorepo

## Dependency Flow

```txt
apps/web
  -> @repo/trpc

apps/api
  -> @repo/trpc
  -> @repo/logger

@repo/trpc
  -> @repo/services

@repo/services
  -> @repo/database
  -> @repo/logger

@repo/database
  -> PostgreSQL / Drizzle
```

The intended direction is for applications to depend on shared packages, not the other way around.

## Request Flow

Standard tRPC request flow:

```txt
Frontend app
  -> typed tRPC client
  -> API server /trpc
  -> @repo/trpc serverRouter
  -> route procedure
  -> @repo/services
  -> @repo/database
```

OpenAPI-compatible request flow:

```txt
HTTP client
  -> API server /api
  -> trpc-to-openapi middleware
  -> @repo/trpc serverRouter
```

## Workspace Scripts

Run commands from the repository root.

```sh
pnpm dev
```

Starts all workspace packages that define a `dev` script through Turborepo.

```sh
pnpm build
```

Builds apps and packages through Turborepo.

```sh
pnpm lint
```

Runs linting across the workspace.

```sh
pnpm check-types
```

Runs TypeScript checks across the workspace.

```sh
pnpm format
```

Formats TypeScript, TSX, and Markdown files with Prettier.

```sh
pnpm db:generate
pnpm db:migrate
```

Runs Drizzle database generation and migrations through Turborepo.

## Local Database

The repository includes a PostgreSQL service in `docker-compose.yml`.

```sh
docker compose up -d
```

Default local database settings:

- Host port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `dev`

## Environment Setup

The `setup.sh` script is intended to create a root `.env` file from `.env.example` and link it into app/package folders.

```sh
./setup.sh
```

Environment files are loaded through `dotenv-cli` in root and package scripts.

## Adding New Apps

Add new applications under `apps/*` so they are automatically included in the pnpm workspace.

Recommended pattern:

```txt
apps
├── api
├── web
└── new-app
```

New apps should depend on shared packages instead of duplicating infrastructure:

- Use `@repo/trpc` for API types and clients
- Use `@repo/services` for shared business logic when needed
- Use `@repo/database` only when the app needs direct database access
- Use `@repo/logger` for logging
- Use `@repo/eslint-config` for linting
- Use `@repo/typescript-config` for TypeScript configuration

For frontend apps, prefer consuming the backend through `@repo/trpc/client` instead of calling internal services directly.

For backend apps, keep route definitions thin and place reusable business logic in `packages/services`.

## Adding New Packages

Add shared packages under `packages/*` when code needs to be reused by multiple apps or packages.

Recommended pattern:

```txt
packages
├── database
├── logger
├── services
├── trpc
└── new-package
```

Keep package responsibilities focused. Prefer adding domain logic to `packages/services` before creating a new package unless the new package has a clear standalone purpose.

## API Documentation

When the API app is running, documentation is available at:

```txt
/docs
```

The generated OpenAPI document is available at:

```txt
/openapi.json
```

## Notes

- The root package is private and is not intended to be published.
- Workspace dependencies use the `workspace:*` protocol.
- Keep shared code in `packages/*` and app-specific code in `apps/*`.
- Keep dependency direction one-way: apps depend on packages, packages should not depend on apps.
