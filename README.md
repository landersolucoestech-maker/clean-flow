# Clean Flow

Plataforma operacional para empresas de limpeza: clientes, leads, agenda, execução de serviços, comunicações, faturamento, folha, relatórios e integrações.

## Estado do projeto

O desenvolvimento ativo acontece na branch `DEV`. A branch `main` é preservada para promoção controlada.

O frontend e as funções estão preparados para Supabase, mas este repositório não está vinculado a nenhum projeto remoto. Crie o projeto Supabase antes de aplicar migrações ou publicar Edge Functions.

## Requisitos

- Node.js 22 ou superior
- npm
- Supabase CLI somente quando chegar a hora de configurar o backend

## Desenvolvimento local

```bash
cp .env.example .env
npm ci
npm run dev
```

Preencha em `.env` apenas as três variáveis públicas do projeto Supabase. Nunca coloque a service-role key ou segredos de provedores em variáveis `VITE_*`.

## Validação

```bash
npm run check
npm audit
```

`npm run check` executa lint, TypeScript, testes e build de produção. O mesmo fluxo roda no GitHub Actions para `DEV` e pull requests direcionados a `DEV` ou `main`.

## Backend e publicação

Consulte [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) antes de criar ou vincular um projeto Supabase. O checklist cobre a ordem das migrações, configuração do primeiro administrador, secrets, OAuth, webhook, Turnstile, storage e smoke tests.

## Segurança

Consulte [SECURITY.md](SECURITY.md). Tokens OAuth ficam exclusivamente em tabelas inacessíveis ao navegador; as Edge Functions validam identidade e função novamente no servidor.

## Stack

- React 18, TypeScript e Vite
- TanStack Query e Zustand
- shadcn/ui e Tailwind CSS
- Supabase Auth, Postgres, Storage e Edge Functions
- QuickBooks, Google, RingCentral, Resend, Geoapify e Cloudflare Turnstile
