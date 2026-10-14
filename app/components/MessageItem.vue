<script setup lang="ts">
import dayjs from "dayjs";
import type { Message } from "../../shared/chat";
import { safeUrl } from "~/lib/links";

const props = defineProps<{
  message: Message;
  replies?: number;
  selected?: boolean;
  inThread?: boolean;
}>();
const emit = defineEmits<{ thread: [id: string] }>();
const url = computed(() => safeUrl(props.message.url));
</script>

<template>
  <article class="message" :class="{ 'message-selected': selected }">
    <div class="message-meta">
      <strong>{{ message.author }}</strong>
      <time
        :datetime="message.createdAt"
        :title="dayjs(message.createdAt).format('D MMM YYYY, HH:mm')"
        >{{ dayjs(message.createdAt).format("HH:mm") }}</time
      >
      <span
        class="delivery"
        :class="{ 'sr-only': message.status === 'local' }"
        >{{
          message.status === "saved" ? "Saved to GitHub" : "On this device"
        }}</span
      >
    </div>
    <p class="message-body">{{ message.body }}</p>
    <div class="message-actions">
      <UButton
        v-if="!inThread"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-messages-square"
        :label="
          replies
            ? `${replies} ${replies === 1 ? 'reply' : 'replies'}`
            : 'Reply in thread'
        "
        @click="emit('thread', message.id)"
      />
      <UButton
        v-if="url"
        :to="url"
        target="_blank"
        rel="noopener noreferrer"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-arrow-up-right"
        label="Open in GitHub"
      />
    </div>
  </article>
</template>
