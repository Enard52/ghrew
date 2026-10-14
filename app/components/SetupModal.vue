<script setup lang="ts">
import {
  createWorkspaceRepositories,
  beginAppRegistration,
  finishAppRegistration,
  SETUP_KEY,
  type SetupPlan,
} from "~/lib/creator";
import type { MailboxConfig } from "../../shared/mailbox";
const props = defineProps<{
  token: string;
  login: string;
  userId: number;
  installer: boolean;
  creatorUrl?: string;
}>();
const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ authorize: []; ready: [config: MailboxConfig] }>();
const organization = ref("");
const ownClient = ref(false);
const status = ref("");
const error = ref("");
const busy = ref(false);
const configured = shallowRef<MailboxConfig | null>(null);
const clientUrl = computed(() =>
  ownClient.value
    ? `https://${organization.value}.github.io/gitwok-client/`
    : `${window.location.origin}${useRuntimeConfig().app.baseURL}`,
);
const appSettings = computed(() =>
  configured.value
    ? `https://github.com/organizations/${organization.value}/settings/apps/${configured.value.appSlug}`
    : "",
);
const retrySetup = ref(false);
function useWorkspace() {
  if (configured.value) {
    emit("ready", configured.value);
    open.value = false;
  }
}
function retry() {
  window.location.reload();
}
async function start() {
  busy.value = true;
  error.value = "";
  try {
    let saved: SetupPlan | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SETUP_KEY) || "null");
    } catch {
      /* Start a new setup. */
    }
    const plan: SetupPlan = {
      organization: organization.value.trim(),
      clientUrl: clientUrl.value,
      ownClient: ownClient.value,
      nonce:
        saved?.organization === organization.value.trim() &&
        saved.administrator.id === props.userId
          ? saved.nonce
          : crypto.randomUUID(),
      administrator: { id: props.userId, login: props.login },
    };
    sessionStorage.setItem(SETUP_KEY, JSON.stringify(plan));
    await createWorkspaceRepositories(
      props.token,
      plan,
      (value) => (status.value = value),
    );
    status.value = "Approve your workspace App on GitHub.";
    beginAppRegistration(plan);
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "Setup failed.";
    busy.value = false;
  }
}
let completing = false;
watch(
  () => props.token,
  async (token) => {
    if (!token || completing) return;
    const saved = sessionStorage.getItem("gitwok:app-manifest-code");
    if (!saved) return;
    completing = true;
    open.value = true;
    busy.value = true;
    try {
      const incoming = JSON.parse(saved);
      const plan = JSON.parse(
        sessionStorage.getItem(SETUP_KEY) || "null",
      ) as SetupPlan | null;
      if (
        !plan ||
        incoming.nonce !== plan.registrationState ||
        props.userId !== plan.administrator.id
      )
        throw new Error("This setup request could not be verified.");
      organization.value = plan.organization;
      ownClient.value = plan.ownClient;
      configured.value = await finishAppRegistration(
        token,
        plan,
        incoming.code,
        useRuntimeConfig().app.baseURL,
        (value) => (status.value = value),
      );
      sessionStorage.removeItem("gitwok:app-manifest-code");
      sessionStorage.removeItem(SETUP_KEY);
      const clean = new URL(window.location.href);
      clean.searchParams.delete("setup");
      history.replaceState(null, "", clean);
      status.value =
        "Repositories and workflows are installed. Finish the GitHub App settings below.";
    } catch (failure) {
      error.value =
        failure instanceof Error ? failure.message : "Setup failed.";
      retrySetup.value = true;
    } finally {
      busy.value = false;
    }
  },
  { immediate: true },
);
</script>
<template>
  <UModal
    v-model:open="open"
    title="Create your GitWok"
    description="Your organization owns the repositories, App and authentication workflow."
    :dismissible="!busy"
  >
    <template #body
      ><div class="space-y-5">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          title="Setup needs attention"
          :description="error"
          role="alert"
        />
        <UAlert
          v-if="status"
          color="info"
          variant="subtle"
          :title="status"
          role="status"
        />
        <UButton
          v-if="retrySetup"
          label="Retry unfinished setup"
          variant="outline"
          @click="retry"
        />
        <template v-if="configured">
          <p>
            Finish two settings on GitHub: enable
            <strong>Device Flow</strong> on your App, then install it on
            <strong>gitwok-chat, gitwok-auth and gitwok-vault</strong>.
          </p>
          <UButton
            :to="appSettings"
            target="_blank"
            rel="noopener noreferrer"
            label="Enable Device Flow"
            variant="outline"
          />
          <UButton
            :to="`https://github.com/apps/${configured?.appSlug}/installations/new`"
            target="_blank"
            rel="noopener noreferrer"
            label="Install your workspace App"
            variant="outline"
          />
          <UButton
            label="Use my workspace sign-in"
            block
            @click="useWorkspace"
          />
          <p class="text-muted text-sm">
            After checking your own sign-in, revoke GitWok Creator in GitHub
            settings. Your workspace does not need its access afterwards.
          </p>
        </template>
        <template v-else-if="!installer">
          <p>
            GitWok Creator needs temporary permission to create repositories,
            configure Actions and save your workspace’s keys in GitHub Secrets.
            Your runtime App will be separate.
          </p>
          <UButton
            v-if="creatorUrl"
            :to="creatorUrl"
            target="_blank"
            rel="noopener noreferrer"
            label="Install GitWok Creator"
            variant="outline"
          />
          <UButton
            label="Authorize GitWok Creator"
            block
            :disabled="!creatorUrl"
            @click="emit('authorize')"
          />
          <p v-if="!creatorUrl" class="text-muted text-sm">
            The shared installer App is not configured yet. Your administrator
            can use the included CLI installer.
          </p>
        </template>
        <UForm
          v-else-if="!retrySetup"
          :state="{ organization }"
          class="space-y-4"
          @submit="start"
        >
          <UFormField
            label="GitHub organization"
            description="You must be an organization owner."
            required
            ><UInput
              v-model="organization"
              placeholder="your-team"
              class="w-full"
              :disabled="busy"
          /></UFormField>
          <div class="space-y-2 text-sm">
            <p>
              <strong>gitwok-chat</strong> — public channels, visible on GitHub.
            </p>
            <p>
              <strong>gitwok-vault</strong> — one private repository,
              administrators only.
            </p>
            <p>
              <strong>gitwok-auth</strong> — public mailbox with encrypted
              requests and responses.
            </p>
          </div>
          <UCheckbox
            v-model="ownClient"
            label="Publish my own client on GitHub Pages"
            :disabled="busy"
          />
          <p class="text-muted text-sm">
            Organization base permissions must be None. Setup checks this and
            preserves existing repositories.
          </p>
          <UButton
            type="submit"
            label="Create repositories and register my App"
            block
            :loading="busy"
            :disabled="!organization.trim() || busy"
          />
        </UForm></div
    ></template>
  </UModal>
</template>
