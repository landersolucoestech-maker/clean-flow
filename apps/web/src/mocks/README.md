# Frontend mock data

This directory is the single allowed location for mocked business records used by the frontend.

Rules:

- Mock data must never be embedded directly in pages, components, hooks, stores, or services.
- Domain-specific mocks belong in `mocks/<domain>/`.
- Production configuration, enums, navigation metadata, permissions, and form options are NOT mock data and should remain with their owning module.
- Mock usage is opt-in through `VITE_USE_MOCKS=true` and is disabled by default.
- Production code must continue to work when this directory is deleted and mock imports are removed.
- Do not place credentials, tokens, real customer data, or copies of production data here.

Suggested structure:

```text
mocks/
├── crm/
├── dashboard/
├── schedule/
├── billing/
├── communications/
└── settings/
```

Only create a domain folder when actual mock records are needed.
