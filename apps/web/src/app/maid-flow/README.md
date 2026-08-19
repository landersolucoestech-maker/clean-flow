# Maid Flow frontend

This directory is the active web application surface for the Maid Flow reconstruction.

## Boundaries

- Frontend only. No backend, database, migrations, server authentication, workers, webhooks or server-side integrations.
- Product behavior is modeled in `packages/domain` and `packages/application` rather than embedded in React components.
- External persistence is represented by repository contracts. Current implementations are deterministic frontend mocks.
- The legacy Clean Flow implementation remains reference material only and must not become a dependency of new Maid Flow modules.
- New product work targets `dev` only.

## Visual standard

Operational SaaS UI: controlled density, precise hierarchy, restrained surfaces, semantic color, minimal decoration, accessible interaction states and no template-like card proliferation.

## Module completion gate

A module is complete only after domain model, use cases, mock adapter, routes, states, forms, validation, responsive behavior, accessibility and relevant tests are validated.

## Current reconstruction sequence

1. Contacts — active module.
2. Customers.
3. Leads.
4. Estimates.
5. Service catalog and workforce dependencies before operational scheduling.
