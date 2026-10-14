<script setup lang="ts">
const props = defineProps<{
  busy: boolean;
  error: string;
  requestUrl?: string;
  deviceCode?: string;
  waiting?: boolean;
  mailboxRepository?: string;
}>();
const mailbox = ref(props.mailboxRepository || "");
const { copy, copied } = useClipboard();
const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{
  signIn: [];
  preview: [];
  mailbox: [repository: string];
  cancel: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="false"
    :close="false"
    title="Your team, in conversation."
    description="A shared place to talk, backed by your GitHub Discussions."
    :ui="{ content: 'auth-modal', header: 'auth-header', body: 'auth-body' }"
  >
    <template #title>
      <span class="brand"><BrandMark /><span>GitWok</span></span>
      <span class="auth-headline">Your team,<br />in conversation.</span>
    </template>
    <template #body>
      <div class="auth-points">
        <p>
          <UIcon name="i-lucide-github" /><span
            ><strong>Join with your GitHub account.</strong> Messages appear
            under your GitHub name.</span
          >
        </p>
        <p>
          <UIcon name="i-lucide-lock-keyhole" /><span
            ><strong>Your team’s organization.</strong> Public conversations and
            an administrator-owned private vault.</span
          >
        </p>
        <p>
          <UIcon name="i-lucide-sprout" /><span
            ><strong>Open source, yours to host.</strong> Start here. Move the
            client to your own Pages whenever you like.</span
          >
        </p>
      </div>
      <UAlert
        v-if="error"
        role="alert"
        color="error"
        variant="subtle"
        title="Couldn’t sign in"
        :description="error"
        class="mb-4"
      />
      <div v-if="requestUrl" class="space-y-4" role="status">
        <template v-if="!deviceCode">
          <p>
            Submit the prepared sign-in issue on GitHub, then return here. Only
            your GitHub username and sign-in time are public.
          </p>
          <UButton
            :to="requestUrl"
            target="_blank"
            rel="noopener noreferrer"
            label="Create sign-in request"
            icon="i-lucide-github"
            block
          />
          <p class="text-muted text-sm">
            Waiting for your request and GitHub Actions…
          </p>
        </template>
        <template v-else>
          <p>
            Enter this code on GitHub using the same account that created the
            request.
          </p>
          <div class="flex items-center justify-between gap-3">
            <strong class="text-2xl tracking-widest">{{ deviceCode }}</strong
            ><UButton
              :label="copied ? 'Copied' : 'Copy code'"
              variant="outline"
              @click="copy(deviceCode)"
            />
          </div>
          <UButton
            to="https://github.com/login/device"
            target="_blank"
            rel="noopener noreferrer"
            label="Authorize on GitHub"
            block
          />
          <p class="text-muted text-sm">Waiting for GitHub approval…</p>
        </template>
        <UButton
          label="Cancel sign-in"
          color="neutral"
          variant="link"
          @click="emit('cancel')"
        />
      </div>
      <UButton
        v-else
        label="Continue with GitHub"
        icon="i-lucide-github"
        block
        size="xl"
        :loading="busy"
        @click="emit('signIn')"
      />
      <p class="auth-permissions">
        No separate password. No token to copy and paste.
      </p>
      <details v-if="!requestUrl" class="mb-4 text-sm">
        <summary class="cursor-pointer text-muted">
          Use your organization’s GitWok
        </summary>
        <div class="mt-3 space-y-3">
          <UFormField
            label="Authentication repository"
            description="Your team’s public GitHub sign-in mailbox."
            ><UInput
              v-model="mailbox"
              placeholder="your-org/gitwok-auth"
              class="w-full"
          /></UFormField>
          <UButton
            label="Connect team sign-in"
            variant="outline"
            :disabled="!mailbox"
            @click="emit('mailbox', mailbox.trim())"
          />
        </div>
      </details>
      <div class="auth-footer">
        <UButton
          label="Explore the local preview"
          color="neutral"
          variant="link"
          size="sm"
          @click="emit('preview')"
        />
        <UButton
          label="Source code"
          to="https://github.com/inchidev/gitwok"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="link"
          size="sm"
          trailing-icon="i-lucide-arrow-up-right"
        />
      </div>
    </template>
  </UModal>
</template>
