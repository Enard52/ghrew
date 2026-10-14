<script setup lang="ts">
defineProps<{ busy: boolean; error: string }>();
const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ signIn: []; preview: [] }>();
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
            ><strong>Your team’s repository.</strong> GitHub controls who can
            read and join in.</span
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
      <UButton
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
