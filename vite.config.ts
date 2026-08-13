import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const webSrc = (...segments: string[]) => path.resolve(import.meta.dirname, "apps/web/src", ...segments);

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@/components", replacement: webSrc("shared/compat/components") },
      { find: "@/pages", replacement: webSrc("shared/compat/pages") },
      { find: "@/hooks", replacement: webSrc("shared/compat/hooks") },
      { find: "@/contexts", replacement: webSrc("shared/contexts") },
      { find: "@/integrations", replacement: webSrc("shared/integrations") },
      { find: "@/lib", replacement: webSrc("shared/lib") },
      { find: "@/stores", replacement: webSrc("shared/stores") },
      { find: "@", replacement: webSrc() },
    ],
  },
});
