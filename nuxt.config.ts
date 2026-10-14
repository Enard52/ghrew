import process from "node:process";

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
  colorMode: { preference: "dark", fallback: "dark" },
  icon: { clientBundle: { scan: true }, provider: "none" },
  app: {
    baseURL: process.env.BASE_PATH || "/",
    head: {
      title: "GitWok — your team, in conversation",
      htmlAttrs: { lang: "en" },
      meta: [
        {
          name: "description",
          content:
            "A shared place to talk, backed by your team’s GitHub Discussions.",
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
      oauthBrokerUrl: "",
      defaultRepository: "",
    },
  },
  typescript: { strict: true },
});
