<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { z } from "zod";
import { listWorkspaceRepositories, parseRepository } from "~/lib/github";

const props = defineProps<{
  token: string;
  login: string;
  repository: string;
}>();
const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ connect: [repository: string]; install: [] }>();
const state = reactive({ repository: props.repository });
const schema = z.object({
  repository: z.string().refine((value) => {
    try {
      parseRepository(value);
      return true;
    } catch {
      return false;
    }
  }, "Use owner/repository or its GitHub URL."),
});
const repos = useQuery({
  queryKey: computed(() => ["repositories", props.login]),
  enabled: computed(() => open.value && Boolean(props.token)),
  queryFn: ({ signal }) => listWorkspaceRepositories(props.token, signal),
  staleTime: 30_000,
});
watch(open, (value) => {
  if (value) state.repository = props.repository;
});
function connect(value: string) {
  emit("connect", parseRepository(value).join("/"));
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Your workspaces"
    description="Each workspace is a GitHub repository with Discussions enabled."
  >
    <template #body>
      <div class="workspace-list">
        <p
          v-if="repos.isPending.value && props.token"
          class="text-muted text-sm"
        >
          Finding repositories…
        </p>
        <UAlert
          v-if="repos.error.value"
          role="alert"
          color="error"
          variant="subtle"
          title="Couldn’t load repositories"
          :description="repos.error.value.message"
        />
        <UButton
          v-for="repo in repos.data.value"
          :key="repo.id"
          color="neutral"
          variant="ghost"
          block
          :icon="repo.private ? 'i-lucide-lock-keyhole' : 'i-lucide-globe'"
          :label="repo.full_name"
          :disabled="!repo.has_discussions"
          :ui="{ base: 'justify-start' }"
          @click="connect(repo.full_name)"
        >
          <template v-if="!repo.has_discussions" #trailing
            ><span class="text-xs ml-auto">Enable Discussions</span></template
          >
        </UButton>
      </div>
      <div class="workspace-connect">
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-3"
          @submit="connect(state.repository)"
        >
          <UFormField
            name="repository"
            label="Repository"
            description="You need access, and the GitWok GitHub App must be installed there."
          >
            <UInput
              v-model="state.repository"
              placeholder="my-team/chat"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            label="Open workspace"
            icon="i-lucide-arrow-right"
            :disabled="!token"
          />
        </UForm>
      </div>
      <div class="workspace-setup">
        <h3>Start a workspace</h3>
        <p>
          Create a private repository, enable Discussions, and invite your team
          on GitHub. Install the GitWok App on that repository, then open it
          here.
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <UButton
            label="Create repository"
            to="https://github.com/new?name=chat&visibility=private"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="outline"
            size="sm"
            trailing-icon="i-lucide-arrow-up-right"
          />
          <UButton
            label="Install GitWok App"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!token"
            @click="emit('install')"
          />
          <UButton
            label="Refresh list"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="repos.isFetching.value"
            :disabled="!token"
            @click="repos.refetch()"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
