// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig as configFromLovable } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default configFromLovable({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Disable Lovable's default Cloudflare plugin injection
  cloudflare: false,
  plugins: [
    nitro({
      preset: "vercel",
      output: {
        dir: ".vercel/output",
        serverDir: ".vercel/output/functions/__server.func",
        publicDir: ".vercel/output/static",
      },
    }),
  ],
});
