# Checklist de implantação

Este documento é intencionalmente preparatório: não vincule nem publique no Supabase até existir um projeto criado para o Clean Flow.

## 1. Preparar o projeto

1. Crie um projeto Supabase novo e exclusivo para o ambiente.
2. Faça backup antes de aplicar mudanças em qualquer banco que já contenha dados.
3. Desative sign-ups públicos em Authentication antes do bootstrap inicial. Isso evita uma corrida para criação do primeiro administrador.
4. Defina a URL oficial do frontend e os redirect URIs exatos nos consoles Google, QuickBooks e RingCentral.
5. Gere valores aleatórios fortes para `LEAD_CAPTURE_RATE_LIMIT_SALT` e `RINGCENTRAL_WEBHOOK_VERIFICATION_TOKEN`.

## 2. Variáveis

Frontend (`.env`, nunca versionado):

```dotenv
VITE_SUPABASE_PROJECT_ID="..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="https://....supabase.co"
```

Edge Functions: use `supabase/.env.example` como inventário e cadastre os valores como secrets do projeto. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo runtime Supabase. Nunca exponha esses secrets no frontend.

O domínio usado em `EMAIL_FROM` precisa estar verificado no Resend. Configure o token de verificação do webhook tanto no secret `RINGCENTRAL_WEBHOOK_VERIFICATION_TOKEN` quanto na assinatura RingCentral.

## 3. Banco e funções

1. Vincule a CLI somente ao project ref recém-criado.
2. Confirme o project ref antes de qualquer comando remoto.
3. Revise e aplique todas as migrações em ordem cronológica.
4. Confirme que RLS está habilitado e que `anon` não possui acesso às tabelas públicas.
5. Publique as Edge Functions respeitando `supabase/config.toml`. Apenas os callbacks/webhook e a captura pública de lead usam `verify_jwt = false`; eles possuem validação própria.
6. Cadastre as rotinas internas de agendamento usando a service-role key: `process-review-automations`, `process-scheduled-automations` e `scheduled-reminders` não aceitam sessão comum.

## 4. Primeiro administrador

1. Com sign-ups públicos ainda desativados, crie manualmente a conta proprietária em Supabase Auth.
2. Entre no frontend com essa conta.
3. A rota `/setup` executará `bootstrap_first_admin` uma única vez e vinculará o e-mail autenticado ao primeiro registro ativo de staff com função `admin`.
4. Verifique o vínculo e mantenha o cadastro público desativado. Crie os demais usuários por convite ou fluxo administrativo controlado.

## 5. Website e integrações

- Adicione Cloudflare Turnstile ao formulário externo e envie o token em `turnstile_token`; mantenha o campo honeypot `website` vazio.
- QuickBooks, Google e RingCentral devem usar somente os redirect URIs mostrados pela tela de integrações.
- Crie/renove a assinatura RingCentral com o mesmo token de verificação configurado no secret.
- Os buckets `message-attachments` e `broadcast-attachments` aceitam no máximo 10 MB e uploads somente de usuários de gestão. Os arquivos são públicos porque podem ser enviados como links por SMS; não armazene documentos secretos nesses buckets.

## 6. Verificação antes de produção

```bash
npm ci
npm run check
npm audit
```

Smoke tests obrigatórios:

- login, logout e redirecionamento de conta sem staff;
- bootstrap do primeiro admin em banco vazio e bloqueio da segunda execução;
- RLS para admin, office manager, cleaner e usuário sem vínculo;
- criação/edição de cliente, lead, job, fatura e folha;
- transições de job por funcionário atribuído e rejeição por não atribuído;
- captura pública de lead válida, Turnstile inválido e rate limit;
- conexão, renovação e desconexão de cada OAuth sem tokens no navegador;
- SMS individual, broadcast, webhook idempotente e e-mail com domínio verificado;
- upload válido, arquivo acima de 10 MB e MIME bloqueado;
- build do commit exato que será promovido de `DEV` para `main`.

## 7. Promoção

Promova `DEV` para `main` somente por pull request revisado, com CI verde e backup confirmado. Não faça force-push nas duas branches protegidas.
