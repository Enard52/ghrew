<script setup lang="ts">
const open = defineModel<boolean>("open", { required: true });
</script>

<template>
  <UModal
    v-model:open="open"
    title="A Ghrew of your own"
    description="Same conversations. A client your team controls."
  >
    <template #body>
      <div class="own-copy">
        <BrandMark />
        <p>
          Your workspace lives in your GitHub organization. You can also host
          the Ghrew interface on your own GitHub Pages.
        </p>
        <ol>
          <li>Create a client repository from the Ghrew template.</li>
          <li>
            Run the workspace installer with --own-client and register your
            workspace App.
          </li>
          <li>
            Publish with the included Pages workflow and connect your existing
            workspace repositories.
          </li>
        </ol>
        <p class="text-muted">
          Public channels live in ghrew-chat; all private channels and DMs
          share one administrator-only ghrew-vault. Updates are reviewed
          changes to your copy; a template does not update itself.
        </p>
        <UButton
          label="Use the Ghrew template"
          icon="i-lucide-github"
          to="https://github.com/inchidev/ghrew/generate"
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
          trailing-icon="i-lucide-arrow-up-right"
        />
      </div>
    </template>
  </UModal>
</template>
