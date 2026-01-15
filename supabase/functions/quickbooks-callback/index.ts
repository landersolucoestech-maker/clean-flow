import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      `<html>
        <body>
          <script>
            window.opener.postMessage({ type: 'quickbooks-error', error: '${error}' }, '*');
            window.close();
          </script>
          <p>Error: ${error}. This window will close automatically.</p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (code && realmId) {
    return new Response(
      `<html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'quickbooks-callback', 
              code: '${code}', 
              realmId: '${realmId}' 
            }, '*');
            window.close();
          </script>
          <p>Authorization successful! This window will close automatically.</p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new Response("Missing code or realmId", { status: 400 });
});
