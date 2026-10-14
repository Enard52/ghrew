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
const emit = defineEmits<{ authorize: []; ready: [config: MailboxConfig] }>();
const organization = ref("");
const ownClient = ref(false);
const status = ref("");
const error = ref("");
const busy = ref(false);
const configured = shallowRef<MailboxConfig | null>(null);
const clientUrl = computed(() =>
  ownClient.value
    ? `https://${organization.value}.github.io/ghrew-client/`
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
  }
}
function retry() {
  window.location.reload();
}
onMounted(() => {
  try {
    const plan = JSON.parse(sessionStorage.getItem(SETUP_KEY) || "null");
    if (plan) {
      organization.value = plan.organization;
      ownClient.value = plan.ownClient;
    }
  } catch {
    /* Keep an empty form. */
  }
});
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
  () => [props.token, props.userId] as const,
  async ([token, userId]) => {
    if (!token || !userId || completing) return;
    const saved = sessionStorage.getItem("ghrew:app-manifest-code");
    if (!saved) {
      try {
        const stored = JSON.parse(
          sessionStorage.getItem("ghrew:setup-config") || "null",
        );
        if (stored?.plan.administrator.id === userId) {
          configured.value = stored.config;
          organization.value = stored.plan.organization;
          ownClient.value = stored.plan.ownClient;
        }
      } catch {
        /* Ignore an invalid local checkpoint. */
      }
      return;
    }
    completing = true;
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
      sessionStorage.removeItem("ghrew:app-manifest-code");
      sessionStorage.setItem(
        "ghrew:setup-config",
        JSON.stringify({ config: configured.value, plan }),
      );
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
  <div class="space-y-5">
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
        <strong>ghrew-chat, ghrew-auth and ghrew-vault</strong>.
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
      <UButton label="Test my workspace sign-in" block @click="useWorkspace" />
      <p class="text-muted text-sm">
        After checking your own sign-in, revoke Ghrew Creator in GitHub
        settings. Your workspace does not need its access afterwards.
      </p>
    </template>
    <template v-else-if="!installer">
      <p>
        Ghrew Creator needs temporary permission to create repositories,
        configure Actions and save your workspace’s keys in GitHub Secrets. Your
        runtime App will be separate.
      </p>
      <UButton
        v-if="creatorUrl"
        :to="creatorUrl"
        target="_blank"
        rel="noopener noreferrer"
        label="Install Ghrew Creator"
        variant="outline"
      />
      <UButton
        label="Authorize Ghrew Creator"
        block
        :disabled="!creatorUrl"
        @click="emit('authorize')"
      />
      <p v-if="!creatorUrl" class="text-muted text-sm">
        The shared installer App is not configured yet. Your administrator can
        use the included CLI installer.
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
        description="You must own this organization and install Ghrew Creator there."
        required
        ><UInput
          v-model="organization"
          placeholder="your-team"
          class="w-full"
          :disabled="busy"
      /></UFormField>
      <div class="space-y-2 text-sm">
        <p><strong>ghrew-chat</strong> — public channels, visible on GitHub.</p>
        <p>
          <strong>ghrew-vault</strong> — one private repository, administrators
          only.
        </p>
        <p>
          <strong>ghrew-auth</strong> — public mailbox with encrypted requests
          and responses.
        </p>
      </div>
      <UCheckbox
        v-model="ownClient"
        label="Publish my own client on GitHub Pages"
        :disabled="busy"
      />
      <p class="text-muted text-sm">
        With the shared site you trust Ghrew’s JavaScript with your session and
        messages. Your own Pages copy lets your team review code and control
        updates.
      </p>
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
    </UForm>
  </div>
</template>
