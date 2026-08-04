# Segurança

## Modelo

- O navegador usa somente a chave pública do Supabase.
- Tokens Google, QuickBooks e RingCentral ficam em tabelas revogadas para `anon` e `authenticated`.
- Edge Functions privilegiadas validam JWT, vínculo durável por `auth_user_id` com exatamente um staff ativo e função permitida; o e-mail só é fallback para registros legados ainda não migrados.
- Rotinas internas exigem a service-role key; callbacks públicos usam estado OAuth assinado; o webhook RingCentral exige token de verificação; leads públicos exigem Turnstile e rate limit.
- As políticas RLS substituem as permissões abertas importadas do protótipo.

## Segredos

Não versione `.env`, service-role key, tokens OAuth, API keys, códigos de autorização nem payloads contendo dados pessoais. Faça rotação imediata se qualquer segredo for exposto.

## Dados e logs

Não registre corpos de webhook, telefones, conteúdo de mensagens, tokens ou URLs privadas. Os buckets de anexos atendem links enviados por SMS e são públicos; não use esses buckets para documentos confidenciais.

## Relato de vulnerabilidade

Não abra uma issue pública com dados de clientes, credenciais ou instruções de exploração. Envie o relato de forma privada aos mantenedores do repositório, incluindo impacto, passos mínimos de reprodução e versão afetada.

## Dependências

Antes de promover para produção, execute `npm run check` e `npm audit`. Achados sem correção disponível devem ser documentados com escopo, justificativa e plano de reavaliação.

Em 2026-08-04, o audit reporta `GHSA-qwww-vcr4-c8h2` no React Router. O advisory afeta execução de Actions no modo RSC; o Clean Flow usa somente `BrowserRouter` como SPA e não possui rotas RSC, SSR ou Server Actions. O downgrade sugerido para 7.11.0 reintroduz advisories de XSS/open redirect/SSR e foi rejeitado. Reavalie assim que houver uma versão atual corrigida.
