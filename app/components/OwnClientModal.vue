<script setup lang="ts">
const open = defineModel<boolean>("open", { required: true });
</script>

<template>
  <UModal
    v-model:open="open"
    title="A Ghrew of your own"
    description="Your Cloudflare backend, your GitHub App, your conversations."
  >
    <template #body>
      <div class="own-copy">
        <BrandMark />
        <p>
          Deploy the client and its small backend together in your Cloudflare
          account. Register your own GitHub App through the guided setup.
        </p>
        <ol>
          <li>Click Deploy to Cloudflare and choose a deployment setup key.</li>
          <li>
            Open Create workspace on your deployed site and approve your App in
            GitHub.
          </li>
          <li>Sign in, install your App and create the workspace.</li>
        </ol>
        <p class="text-muted">
          Public channels live in ghrew-chat; all private channels and DMs share
          one administrator-only ghrew-vault. Updates are reviewed changes to
          your copy; a template does not update itself.
        </p>
        <UButton
          label="Deploy to Cloudflare"
          icon="i-octicon-cloud-16"
          to="https://deploy.workers.cloudflare.com/?url=https://github.com/inchidev/ghrew"
          target="_blank"
          rel="noopener noreferrer"
        />
        <UButton
          label="Read the hosting guide"
          to="https://github.com/inchidev/ghrew/blob/main/docs/self-hosting.md"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="link"
          trailing-icon="i-octicon-link-external-16"
        />
      </div>
    </template>
  </UModal>
</template>
