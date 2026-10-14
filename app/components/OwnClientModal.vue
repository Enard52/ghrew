<script setup lang="ts">
const open = defineModel<boolean>("open", { required: true });
</script>

<template>
  <UModal
    v-model:open="open"
    title="A GitWok of your own"
    description="Same conversations. A client your team controls."
  >
    <template #body>
      <div class="own-copy">
        <BrandMark />
        <p>
          Your workspace already lives in your GitHub repository. You can also
          host the GitWok interface on your own GitHub Pages.
        </p>
        <ol>
          <li>Create a client repository from the GitWok template.</li>
          <li>
            Configure your own GitHub App and OAuth handler for your site.
          </li>
          <li>
            Publish with the included Pages workflow and connect your existing
            chat repository.
          </li>
        </ol>
        <p class="text-muted">
          The client repository can be public while your chat repository stays
          private. Updates are reviewed changes to your copy; a template does
          not update itself.
        </p>
        <UButton
          label="Use the GitWok template"
          icon="i-lucide-github"
          to="https://github.com/inchidev/gitwok/generate"
          target="_blank"
          rel="noopener noreferrer"
        />
        <UButton
          label="Read the hosting guide"
          to="https://github.com/inchidev/gitwok/blob/main/docs/self-hosting.md"
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
