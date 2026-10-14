import { useQueryClient } from "@tanstack/vue-query";
import { useNow, useIntervalFn } from "@vueuse/core";
import {
  oauthConfigSchema,
  sessionSchema,
  type GitHubSession,
} from "../../shared/auth";
import {
  brokerAddress,
  consumeCallback,
  createAuthorization,
  readSession,
  SESSION_KEY,
} from "~/lib/auth";
import { githubRequest, viewerSchema, type Viewer } from "~/lib/github";

export function useGitHubAuth() {
  const config = useRuntimeConfig();
  const queryClient = useQueryClient();
  const session = shallowRef<GitHubSession | null>(null);
  const viewer = shallowRef<Viewer | null>(null);
  const error = ref("");
  const busy = ref(true);
  const installUrl = ref("");
  const now = useNow({
    scheduler: (callback) => useIntervalFn(callback, 30_000),
  });
  const token = computed(() =>
    session.value && session.value.expiresAt > now.value.getTime()
      ? session.value.accessToken
      : "",
  );

  async function oauthConfig() {
    const base = brokerAddress(config.public.oauthBrokerUrl);
    const response = await fetch(
      new URL("config", `${base.href.replace(/\/$/, "")}/`),
      {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok)
      throw new Error(
        "GitHub sign-in is temporarily unavailable. Please try again.",
      );
    const value = oauthConfigSchema.parse(await response.json());
    if (
      value.redirectUri !== `${window.location.origin}${config.app.baseURL}`
    ) {
      throw new Error(
        "GitHub sign-in is configured for a different site. Ask this deployment’s administrator to check its callback URL.",
      );
    }
    installUrl.value = value.installUrl;
    return { ...value, base };
  }

  async function loadViewer() {
    if (!token.value) return;
    viewer.value = await githubRequest("/user", token.value, viewerSchema);
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    session.value = null;
    viewer.value = null;
    queryClient.clear();
  }

  async function initialize() {
    try {
      const url = new URL(window.location.href);
      // Remove OAuth parameters before performing network requests or rendering external links.
      if (url.searchParams.has("code") || url.searchParams.has("error")) {
        const clean = new URL(url);
        for (const name of [
          "code",
          "state",
          "error",
          "error_description",
          "error_uri",
        ])
          clean.searchParams.delete(name);
        history.replaceState(null, "", clean);
      }
      const callback = consumeCallback(url, sessionStorage);
      if (callback) {
        const { base } = await oauthConfig();
        const response = await fetch(
          new URL("exchange", `${base.href.replace(/\/$/, "")}/`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(callback),
            credentials: "omit",
            referrerPolicy: "no-referrer",
            signal: AbortSignal.timeout(15_000),
          },
        );
        if (!response.ok)
          throw new Error(
            "GitHub sign-in could not be completed. Please try again.",
          );
        session.value = sessionSchema.parse(await response.json());
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session.value));
        const clean = new URL(window.location.href);
        clean.searchParams.delete("preview");
        history.replaceState(null, "", clean);
      } else session.value = readSession(sessionStorage);
      await loadViewer();
    } catch (failure) {
      signOut();
      error.value =
        failure instanceof Error
          ? failure.message
          : "Could not sign in. Please try again.";
    } finally {
      busy.value = false;
    }
  }

  async function signIn() {
    error.value = "";
    busy.value = true;
    try {
      const value = await oauthConfig();
      window.location.assign(
        await createAuthorization(
          value.clientId,
          value.redirectUri,
          sessionStorage,
        ),
      );
    } catch (failure) {
      error.value =
        failure instanceof Error
          ? failure.message
          : "Could not start GitHub sign-in.";
      busy.value = false;
    }
  }

  async function installationLink() {
    if (!installUrl.value) await oauthConfig();
    return installUrl.value;
  }

  watch(token, (value, old) => {
    if (!value && old) {
      signOut();
      error.value = "Your GitHub session expired. Sign in again to continue.";
    }
  });
  onMounted(initialize);
  return { token, viewer, error, busy, signIn, signOut, installationLink };
}
