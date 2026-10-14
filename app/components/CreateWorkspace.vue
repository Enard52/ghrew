<script setup lang="ts">
import { mailboxConfig, vaultRequest } from "~/lib/mailbox";
import { adminApi } from "~/lib/creator";
import type { MailboxConfig } from "../../shared/mailbox";
const runtime = useRuntimeConfig();
const auth = useGitHubAuth();
const creatorUrl = ref("");
const error = ref("");
const authOpen = ref(false);
const checking = ref(false);
const ready = ref(false);
const configured = shallowRef<MailboxConfig | null>(null);
const clientUrl = ref(runtime.app.baseURL);
const runtimeSession = computed(() =>
  Boolean(
    auth.token.value &&
    !auth.installer.value &&
    configured.value &&
    auth.activeMailbox.value?.repository === configured.value.repository,
  ),
);
const waiting = computed(() => auth.mailboxWaiting.value);
watch(authOpen, (open) => {
  if (!open && auth.mailboxWaiting.value) auth.cancelMailbox();
});
watch(
  () =>
    [auth.token.value, auth.viewer.value?.id, auth.installer.value] as const,
  async ([token, id, installer]) => {
    if (token && id && installer) authOpen.value = false;
    if (
      !token ||
      !id ||
      installer ||
      !configured.value ||
      !runtimeSession.value ||
      checking.value ||
      ready.value
    )
      return;
    authOpen.value = false;
    await verify();
  },
);
onMounted(async () => {
  try {
    const config = await mailboxConfig(
      runtime.public.creatorRepository || runtime.public.authRepository,
    );
    creatorUrl.value = config.creatorAppSlug
      ? `https://github.com/apps/${config.creatorAppSlug}/installations/new`
      : "";
    const stored = JSON.parse(
      sessionStorage.getItem("ghrew:setup-config") || "null",
    );
    if (stored?.config && stored?.plan) {
      configured.value = stored.config;
      clientUrl.value = stored.plan.clientUrl;
      if (runtimeSession.value && auth.viewer.value) await verify();
    }
  } catch (failure) {
    error.value =
      failure instanceof Error
        ? failure.message
        : "Could not load the installer.";
  }
});
async function authorize() {
  error.value = "";
  try {
    await auth.selectMailbox(
      runtime.public.creatorRepository || runtime.public.authRepository,
    );
    authOpen.value = true;
    await auth.signIn(true);
  } catch (failure) {
    error.value =
      failure instanceof Error
        ? failure.message
        : "Could not start authorization.";
  }
}
async function testSignIn(config: MailboxConfig) {
  configured.value = config;
  const stored = JSON.parse(
    sessionStorage.getItem("ghrew:setup-config") || "null",
  );
  clientUrl.value = stored?.plan.clientUrl || runtime.app.baseURL;
  await auth.selectMailbox(config.repository);
  authOpen.value = true;
  await auth.signIn();
}
async function verify() {
  if (!configured.value || !runtimeSession.value) return;
  checking.value = true;
  error.value = "";
  try {
    const members = await vaultRequest(configured.value, auth.token.value, {
      op: "members",
    });
    if (
      !members ||
      typeof members !== "object" ||
      !Array.isArray((members as { admins?: number[] }).admins) ||
      !(members as { admins: number[] }).admins.includes(auth.viewer.value!.id)
    )
      throw new Error(
        "Sign in as the administrator who created this workspace.",
      );
    const repository = await adminApi(
      auth.token.value,
      `/repos/${configured.value.repository.split("/")[0]}/ghrew-chat`,
    );
    if (repository.private || !repository.has_discussions)
      throw new Error("The public chat repository is not ready.");
    ready.value = true;
  } catch (failure) {
    error.value =
      failure instanceof Error
        ? failure.message
        : "Workspace verification failed.";
  } finally {
    checking.value = false;
  }
}
const workspaceUrl = computed(() => {
  const url = new URL(clientUrl.value, window.location.origin);
  if (configured.value) {
    url.searchParams.set("auth", configured.value.repository);
    url.searchParams.set(
      "workspace",
      `${configured.value.repository.split("/")[0]}/ghrew-chat`,
    );
  }
  return url.href;
});
</script>
<template>
  <main class="min-h-screen bg-default px-5 py-10 sm:py-16">
    <div class="max-w-2xl mx-auto space-y-8">
      <header class="space-y-4">
        <NuxtLink to="/" class="inline-flex items-center gap-2 text-muted"
          ><BrandMark class="size-8" /> Ghrew · back to chat</NuxtLink
        >
        <h1 class="text-3xl sm:text-4xl font-bold">
          Create your own workspace
        </h1>
        <p class="text-muted">
          Your organization owns the conversations, GitHub App and keys. Keep
          the shared site or publish your own client.
        </p>
      </header>
      <ol aria-label="Setup steps" class="grid grid-cols-3 gap-3 text-sm">
        <li
          :class="
            auth.installer.value || configured ? 'text-primary' : 'text-muted'
          "
        >
          1. Connect GitHub
        </li>
        <li :class="configured ? 'text-primary' : 'text-muted'">
          2. Create workspace
        </li>
        <li :class="ready ? 'text-primary' : 'text-muted'">
          3. Verify and open
        </li>
      </ol>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        title="Setup needs attention"
        :description="error"
        role="alert"
      />
      <section
        class="rounded-xl border border-default bg-elevated p-5 sm:p-8 space-y-5"
      >
        <template v-if="ready">
          <h2 class="text-xl font-semibold">Your workspace is verified</h2>
          <p>
            Administrator sign-in, the private vault access check and public
            Discussions are working.
          </p>
          <UButton
            :to="workspaceUrl"
            label="Open my workspace"
            block
            size="lg"
          />
          <p class="text-muted text-sm">
            You can revoke Ghrew Creator after checking your workspace.
          </p>
        </template>
        <template v-else-if="checking">
          <h2 class="text-xl font-semibold" role="status">
            Checking your private vault through Actions…
          </h2>
          <p class="text-muted">This may take a minute. Keep this tab open.</p>
        </template>
        <template v-else-if="configured && !auth.installer.value">
          <h2 class="text-xl font-semibold">Verify your workspace</h2>
          <p>
            Enable Device Flow on your workspace App and install it only on
            ghrew-chat, ghrew-auth and ghrew-vault.
          </p>
          <UButton
            :to="`https://github.com/organizations/${configured?.repository.split('/')[0]}/settings/apps/${configured?.appSlug}`"
            target="_blank"
            rel="noopener noreferrer"
            label="Enable Device Flow"
            variant="outline"
          />
          <UButton
            :to="`https://github.com/apps/${configured?.appSlug}/installations/new`"
            target="_blank"
            rel="noopener noreferrer"
            label="Install workspace App"
            variant="outline"
          />
          <UButton
            :label="
              runtimeSession
                ? 'Check workspace again'
                : 'Test my workspace sign-in'
            "
            block
            @click="runtimeSession ? verify() : testSignIn(configured)"
          />
        </template>
        <SetupWizard
          v-else
          :token="auth.token.value"
          :login="auth.viewer.value?.login || ''"
          :user-id="auth.viewer.value?.id || 0"
          :installer="auth.installer.value"
          :creator-url="creatorUrl || undefined"
          @authorize="authorize"
          @ready="testSignIn"
        />
      </section>
      <p class="text-muted text-sm">
        GitHub will ask you to approve App creation and installation. No
        terminal, private key download or manual Secrets entry is needed.
      </p>
    </div>
    <AuthModal
      :hide-create="true"
      :dismissible="true"
      v-model:open="authOpen"
      :busy="auth.busy.value"
      :error="auth.error.value"
      :request-url="auth.requestUrl.value"
      :device-code="auth.deviceCode.value"
      :waiting="waiting"
      :mailbox-repository="auth.mailboxRepository.value"
      @sign-in="auth.signIn(!configured)"
      @cancel="
        () => {
          auth.cancelMailbox();
          authOpen = false;
        }
      "
      @mailbox="auth.selectMailbox"
      @preview="navigateTo('/')"
    />
  </main>
</template>
