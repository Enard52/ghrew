<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { z } from "zod";
import type { MailboxConfig } from "../../shared/mailbox";
import type { Channel } from "../../shared/chat";
import { vaultRequest } from "~/lib/mailbox";
import { createPublicChannel } from "~/lib/creator";
const props = defineProps<{
  token: string;
  userId: number;
  repository: string;
  mailbox: MailboxConfig | null;
}>();
const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ created: [channel?: Channel] }>();
const kind = ref<"public" | "private" | "dm">("public");
const name = ref("");
const selected = ref<string[]>([]);
const invite = ref("");
const error = ref("");
const busy = ref(false);
const members = useQuery({
  queryKey: computed(() => [
    "vault-members",
    props.mailbox?.repository,
    props.userId,
  ]),
  enabled: computed(
    () =>
      open.value && kind.value !== "public" && Boolean(props.mailbox?.vault),
  ),
  retry: false,
  queryFn: async ({ signal }) =>
    z
      .object({
        members: z.array(z.object({ id: z.number(), login: z.string() })),
        admins: z.array(z.number()),
      })
      .parse(
        await vaultRequest(
          props.mailbox!,
          props.token,
          { op: "members" },
          signal,
        ),
      ),
});
const admin = computed(() => members.data.value?.admins.includes(props.userId));
async function addMember() {
  if (!props.mailbox || !invite.value) return;
  busy.value = true;
  error.value = "";
  try {
    await vaultRequest(props.mailbox, props.token, {
      op: "invite",
      login: invite.value.trim(),
    });
    invite.value = "";
    await members.refetch();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not invite member.";
  } finally {
    busy.value = false;
  }
}
async function removeMember(userId: number) {
  if (!props.mailbox) return;
  busy.value = true;
  error.value = "";
  try {
    await vaultRequest(props.mailbox, props.token, { op: "remove", userId });
    selected.value = selected.value.filter((id) => Number(id) !== userId);
    await members.refetch();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not remove member.";
  } finally {
    busy.value = false;
  }
}
async function create() {
  busy.value = true;
  error.value = "";
  try {
    if (kind.value === "public") {
      if (!name.value.trim()) throw new Error("Enter a channel name.");
      await createPublicChannel(
        props.token,
        props.repository,
        name.value.trim(),
        "Public workspace conversation.",
      );
      emit("created");
    } else {
      if (!props.mailbox?.vault)
        throw new Error(
          "Connect your workspace before using its private vault.",
        );
      const result = z
        .object({
          channel: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            kind: z.enum(["private", "dm"]),
          }),
        })
        .parse(
          await vaultRequest(props.mailbox, props.token, {
            op: "create",
            kind: kind.value,
            name:
              name.value.trim() ||
              (kind.value === "dm" ? "Direct conversation" : ""),
            members: selected.value.map(Number),
          }),
        );
      emit("created", result.channel);
    }
    open.value = false;
    name.value = "";
    selected.value = [];
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Could not create conversation.";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <UModal
    v-model:open="open"
    title="Start a conversation"
    description="Choose who can read this conversation."
    :dismissible="!busy"
    ><template #body
      ><div class="space-y-4">
        <UAlert
          v-if="error || members.error.value"
          role="alert"
          color="error"
          variant="subtle"
          title="Could not complete this request"
          :description="error || members.error.value?.message"
        />
        <UFormField label="Visibility"
          ><USelect
            v-model="kind"
            :items="[
              { label: 'Public channel', value: 'public' },
              { label: 'Private channel', value: 'private' },
              { label: 'Direct message', value: 'dm' },
            ]"
            class="w-full"
            :disabled="busy"
        /></UFormField>
        <UFormField v-if="kind !== 'dm'" label="Channel name"
          ><UInput v-model="name" class="w-full" :disabled="busy"
        /></UFormField>
        <p v-if="kind === 'public'" class="text-muted text-sm">
          Everyone with access to this workspace can read this conversation.
        </p>
        <template v-else>
          <p class="text-muted text-sm">
            Only invited people and workspace administrators can read this
            conversation.
          </p>
          <p v-if="members.isFetching.value" role="status">
            Loading workspace members…
          </p>
          <UFormField label="Participants"
            ><UCheckboxGroup
              v-model="selected"
              :items="
                (members.data.value?.members || [])
                  .filter((m) => m.id !== userId)
                  .map((m) => ({ label: m.login, value: String(m.id) }))
              "
              :disabled="busy"
          /></UFormField>
          <div v-if="admin" class="space-y-2">
            <UFormField
              label="Add by GitHub username"
              description="For a private workspace App, invite this person to your GitHub organization first."
              ><UInput
                v-model="invite"
                placeholder="octocat"
                class="w-full"
                :disabled="busy" /></UFormField
            ><UButton
              label="Add workspace member"
              variant="outline"
              :loading="busy"
              :disabled="!invite.trim() || busy"
              @click="addMember"
            />
          </div>
          <details v-if="admin">
            <summary class="cursor-pointer text-muted text-sm">
              Manage workspace access
            </summary>
            <div
              v-for="member in (members.data.value?.members || []).filter(
                (m) => !members.data.value?.admins.includes(m.id),
              )"
              :key="member.id"
              class="flex items-center justify-between gap-2 mt-2"
            >
              <span>{{ member.login }}</span
              ><UButton
                label="Remove from workspace"
                size="xs"
                color="error"
                variant="outline"
                :disabled="busy"
                @click="removeMember(member.id)"
              />
            </div>
          </details>
        </template>
        <UButton
          label="Create conversation"
          block
          :loading="busy"
          :disabled="busy || (kind === 'dm' && selected.length !== 1)"
          @click="create"
        /></div></template
  ></UModal>
</template>
