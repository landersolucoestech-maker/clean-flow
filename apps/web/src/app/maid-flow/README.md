# Maid Flow frontend

This directory is the active web application surface for the Maid Flow reconstruction.

## Boundaries

- Frontend only. No backend, database, migrations, server authentication, workers, webhooks or server-side integrations.
- Product behavior is modeled in `packages/domain` and `packages/application` rather than embedded in React components.
- External persistence is represented by repository contracts. Current implementations are deterministic frontend mocks.
- The legacy Clean Flow implementation remains reference material only and must not become a dependency of new Maid Flow modules.
- New product work targets `dev` only.

## Confirmed product structure

- CRM is one workspace with exactly three active tabs: Customers, Contacts and Leads.
- Schedule is the only top-level operations surface for planning and executing scheduled services.
- There is no standalone Jobs module, Jobs navigation item or `/operations/jobs` route. `Job` may remain temporarily as an internal domain type while the frontend product surface uses scheduled-service terminology.
- Communications, Finance, Reports, Settings and Support are workspace surfaces.
- Platform administration is a separate administrative context.
- `/request-service` is a public frontend-only lead capture experience and does not persist to a server in this phase.

## Visual standard

Operational SaaS UI: controlled density, precise hierarchy, restrained surfaces, semantic color, minimal decoration, accessible interaction states and no template-like card proliferation.

## Module completion gate

A module is complete only after domain model, use cases, mock adapter, routes, states, forms, validation, responsive behavior, accessibility and relevant tests are validated.

## Active validation

The `frontend-quality-dev.yml` workflow is the canonical quality gate for the reconstruction and runs lint, strict typecheck, tests and build. GitHub Pages preview is built from the same frontend-only dependency set.
