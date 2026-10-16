import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Social crawlers (LinkedIn, WhatsApp...) need ABSOLUTE URLs for og:image / og:url.
 * Set SITE_URL (e.g. https://shuvo.dev) when building for production. Without it the image path stays
 * relative and the og:url / canonical tags are omitted rather than pointing at a wrong address.
 */
function siteUrl(siteUrlValue: string): Plugin {
  const site = siteUrlValue.replace(/\/+$/, "");
  return {
    name: "site-url",
    transformIndexHtml(html) {
      if (site) return html.replaceAll("__SITE_URL__", site);
      return html
        .replace(/^[^\n]*data-site-url-required[^\n]*\n/gm, "")
        .replaceAll("__SITE_URL__", "");
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      // Allow importing ../shared (default content used as the offline fallback).
      fs: { allow: [path.resolve(__dirname, "..")] },
      // Same-origin API in dev: no CORS setup needed, and SSE/uploads work through it.
      proxy: {
        "/api": { target: env.API_PROXY_TARGET || "http://localhost:4000", changeOrigin: true },
      },
    },
    plugins: [react(), siteUrl(env.SITE_URL || env.VITE_SITE_URL || "")],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../shared"),
      },
    },
  };
});
