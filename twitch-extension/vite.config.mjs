import basicSsl from "@vitejs/plugin-basic-ssl";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const useHttp = process.env.TWITCH_EXTENSION_HTTP === "1";
const certificatePath = fileURLToPath(new URL("../.certs/localhost.pfx", import.meta.url));
const hasTrustedCertificate = existsSync(certificatePath);
const https = useHttp
  ? false
  : hasTrustedCertificate
    ? {
        pfx: readFileSync(certificatePath),
        passphrase: "sumofbest-local",
      }
    : true;

export default defineConfig({
  root,
  base: "./",
  plugins:
    useHttp || hasTrustedCertificate ? [] : [basicSsl({ name: "sumofbest-twitch-extension" })],
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    https,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: fileURLToPath(new URL("panel.html", import.meta.url)),
        config: fileURLToPath(new URL("config.html", import.meta.url)),
      },
    },
  },
});
