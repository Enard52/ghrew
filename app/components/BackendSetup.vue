<script setup lang="ts">
import { z } from "zod";
import { backendJson } from "~/lib/backend";
import { backendWorkspaceSchema } from "~/composables/useBackendAuth";
const auth = useGitHubAuth();
const configSchema = z.object({
  configured: z.boolean(),
  setupAvailable: z.boolean(),
  app: z
    .object({ appSlug: z.string(), owner: z.string(), installUrl: z.url() })
    .nullable(),
  sandbox: z.string(),
});
const config = shallowRef<z.infer<typeof configSchema> | null>(null);
const organization = ref(""),
  setupToken = ref(""),
  error = ref(""),
  busy = ref(false);
const registration = shallowRef<{ action: string; manifest: string } | null>(
  null,
);
const ready = shallowRef<z.infer<typeof backendWorkspaceSchema> | null>(null);
onMounted(async () => {
  try {
    config.value = configSchema.parse(await backendJson("/api/config"));
    organization.value = config.value.app?.owner || "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not load setup.";
  }
});
async function register() {
  error.value = "";
  busy.value = true;
  try {
    const value = z.object({ action: z.url(), manifest: z.string() }).parse(
      await backendJson("/api/setup/start", "", {
        organization: organization.value.trim(),
        setupToken: setupToken.value,
      }),
    );
    const action = new URL(value.action);
    if (
      action.origin !== "https://github.com" ||
      !/^\/organizations\/[a-z\d-]+\/settings\/apps\/new$/.test(action.pathname)
    )
      throw new Error("Invalid GitHub registration address.");
    registration.value = value;
    setupToken.value = "";
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Could not start App registration.";
  } finally {
    busy.value = false;
  }
}
async function create() {
  error.value = "";
  busy.value = true;
  try {
    const value = z.object({ workspace: backendWorkspaceSchema }).parse(
      await backendJson("/api/workspaces", auth.token.value, {
        organization: organization.value.trim(),
      }),
    );
    ready.value = value.workspace;
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Could not create workspace.";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="min-h-screen px-5 py-12">
    <div class="max-w-xl mx-auto space-y-7">
      <NuxtLink to="/" class="brand"><BrandMark /><span>Ghrew</span></NuxtLink>
      <div>
        <h1 class="text-3xl font-semibold">Your crew, ready to connect.</h1>
        <p class="text-muted mt-3">
          Your GitHub organization owns the conversations. This Cloudflare
          deployment handles sign-in and private access.
        </p>
      </div>
      <UAlert
        v-if="error || auth.error.value"
        role="alert"
        color="error"
        variant="subtle"
        title="Setup needs attention"
        :description="error || auth.error.value"
      />
      <p v-if="!config" role="status">Loading this deployment…</p>
      <section v-else-if="!config.configured" class="space-y-5">
        <h2 class="text-xl font-semibold">1. Register your GitHub App</h2>
        <p>
          Approve a preconfigured App in GitHub. Its keys return directly to
          this backend; there is no private key download or client secret to
          copy.
        </p>
        <UAlert
          v-if="!config.setupAvailable"
          title="Set the setup key first"
          description="In your Cloudflare Worker's Settings, add a secret named SETUP_TOKEN with a random value of at least 32 characters. Keep this key: it protects the saved App credentials and sessions."
        />
        <template v-if="!registration">
          <UFormField
            label="GitHub organization"
            description="You must own this organization."
            ><UInput
              v-model="organization"
              placeholder="your-org"
              class="w-full"
              :disabled="busy"
          /></UFormField>
          <UFormField
            label="Deployment setup key"
            description="The SETUP_TOKEN secret you chose during deployment. It stays on this deployment."
            ><UInput
              v-model="setupToken"
              type="password"
              autocomplete="off"
              class="w-full"
              :disabled="busy"
          /></UFormField>
          <UButton
            label="Prepare GitHub App"
            block
            :loading="busy"
            :disabled="
              !config.setupAvailable ||
              !organization.trim() ||
              setupToken.length < 32
            "
            @click="register"
          />
        </template>
        <form
          v-else
          :action="registration.action"
          method="post"
          class="space-y-4"
        >
          <input type="hidden" name="manifest" :value="registration.manifest" />
          <p class="text-muted text-sm">
            Review access to repository contents and Discussions, repository
            administration to create workspace repositories, and organization
            settings and membership read access. GitHub will show the exact
            permissions.
          </p>
          <UButton
            type="submit"
            label="Review and create App on GitHub"
            icon="i-lucide-github"
            block
          />
        </form>
      </section>
      <section v-else-if="!auth.viewer.value" class="space-y-4">
        <h2 class="text-xl font-semibold">2. Sign in with GitHub</h2>
        <p>
          This deployment uses <strong>{{ config.app?.appSlug }}</strong
          >, owned by {{ config.app?.owner }}. Sign in as an organization owner
          to create a workspace.
        </p>
        <UButton
          label="Continue with GitHub"
          icon="i-lucide-github"
          block
          :loading="auth.busy.value"
          @click="auth.signIn(true)"
        />
      </section>
      <section v-else-if="!ready" class="space-y-5">
        <h2 class="text-xl font-semibold">3. Connect your organization</h2>
        <p>
          Signed in as <strong>{{ auth.viewer.value.login }}</strong
          >. Install this deployment's App in your organization, then create the
          workspace.
        </p>
        <UButton
          :to="config.app?.installUrl"
          target="_blank"
          rel="noopener noreferrer"
          label="Install GitHub App"
          icon="i-lucide-github"
          variant="outline"
          block
        />
        <UFormField label="GitHub organization"
          ><UInput v-model="organization" class="w-full" :disabled="busy"
        /></UFormField>
        <p class="text-muted text-sm">
          Creates public <strong>ghrew-chat</strong> and private
          <strong>ghrew-vault</strong>. Organization base repository access must
          be None so other members cannot browse the vault. Existing unrelated
          repositories are preserved.
        </p>
        <UButton
          label="Create workspace"
          block
          :loading="busy"
          :disabled="!organization.trim()"
          @click="create"
        />
        <p v-if="busy" role="status">
          Checking GitHub access, preparing repositories and verifying the
          private vault… You can retry safely if this is interrupted.
        </p>
      </section>
      <section v-else class="space-y-4">
        <UAlert
          title="Workspace prepared"
          description="The public channel and administrator-only vault have been verified. Invite a second participant to check your team's complete sign-in and conversation flow."
        />
        <UButton
          :to="`/?workspace=${encodeURIComponent(ready.repository)}`"
          label="Open your workspace"
          block
        />
      </section>
      <div class="border-t border-default pt-5 space-y-3">
        <p class="text-muted text-sm">
          Free and open source. This deployment's operator and GitHub can access
          private conversation data; this is not end-to-end encryption against
          them.
        </p>
        <UButton
          to="https://deploy.workers.cloudflare.com/?url=https://github.com/inchidev/ghrew"
          target="_blank"
          rel="noopener noreferrer"
          label="Deploy your own Ghrew"
          variant="outline"
        />
        <UButton to="/?preview=1" label="Explore the preview" variant="link" />
      </div>
    </div>
  </main>
</template>
