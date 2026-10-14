import process from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

// Public configuration for independent template copies. No credentials belong here.
const clientConfig = existsSync("ghrew-client.json")
  ? z
      .object({
        version: z.literal(1),
        authRepository: z.string().regex(/^[\w-]+\/ghrew-auth$/),
        defaultRepository: z.string().regex(/^[\w-]+\/[\w.-]+$/),
      })
      .parse(JSON.parse(readFileSync("ghrew-client.json", "utf8")))
  : null;

export default defineNuxtConfig({
  compatibilityDate: "2026-10-14",
  ssr: false,
  buildDir:
    process.env.NUXT_BUILD_DIR ||
    (process.env.npm_lifecycle_event === "build" ? ".nuxt-build" : ".nuxt"),
  devtools: { enabled: false },
  modules: ["@nuxt/ui", "@vueuse/nuxt"],
  ui: { experimental: { componentDetection: true } },
  css: ["~/assets/css/main.css"],
  fonts: {
    providers: {
      google: false,
      googleicons: false,
      bunny: false,
      fontshare: false,
    },
  },
  colorMode: { preference: "system", fallback: "light" },
  icon: { clientBundle: { scan: true }, provider: "none" },
  app: {
    baseURL: process.env.BASE_PATH || "/",
    head: {
      title: "Ghrew — your crew on GitHub",
      htmlAttrs: { lang: "en" },
      meta: [
        {
          name: "description",
          content:
            "Your crew on GitHub. Free, open-source conversations for people and agents.",
        },
        { name: "referrer", content: "no-referrer" },
      ],
      link: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: `${process.env.BASE_PATH || "/"}favicon.svg`,
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      backendEnabled: process.env.NUXT_PUBLIC_BACKEND_ENABLED === "true",
      oauthBrokerUrl: "",
      creatorRepository: "ghrew-sandbox/ghrew-auth",
      defaultRepository: clientConfig?.defaultRepository || "",
      authRepository: clientConfig?.authRepository || "",
    },
  },
  nitro: { prerender: { routes: ["/create/", "/login", "/demo"] } },
  typescript: { strict: true },
});
