# Maid Flow

Plataforma operacional para empresas de limpeza: clientes, leads, agenda, execução de serviços, comunicações, faturamento, folha, relatórios e integrações.

## Estado do projeto

O desenvolvimento ativo desta reconstrução acontece exclusivamente na branch `dev`.

A fase atual é frontend-only. Backend, Supabase, banco, migrations, Edge Functions e integrações reais permanecem fora do escopo até autorização explícita.

## Requisitos

- Node.js 22 ou superior
- npm

## Desenvolvimento local

```bash
npm ci
npm run dev
```

## Validação

```bash
npm run check
```

`npm run check` executa lint, TypeScript, testes e build de produção para a fundação atual do Maid Flow.

## Produto

O nome canônico do produto é **Maid Flow**. Nomes históricos do projeto ou do repositório não devem ser usados como identidade do produto na interface, documentação ativa ou novos módulos.

## Stack atual da reconstrução

- React 18, TypeScript e Vite
- React Router
- Tailwind CSS
- Vitest
- Repositories mockados para desenvolvimento frontend
