<script setup lang="ts">
import dayjs from "dayjs";
import { useClipboard, useLocalStorage } from "@vueuse/core";
import { useGitHubAuth } from "~/composables/useGitHubAuth";
import { useChat } from "~/composables/useChat";
import { GitHubError, parseRepository } from "~/lib/github";
import { safeUrl } from "~/lib/links";

const runtime = useRuntimeConfig();
const auth = useGitHubAuth();
const preview = ref(
  new URL(window.location.href).searchParams.get("preview") === "1",
);
const login = computed(() => auth.viewer.value?.login || "");
const savedRepositories = useLocalStorage<Record<string, string>>(
  "gitwok:workspaces:v2",
  {},
);
const repository = computed({
  get: () =>
    savedRepositories.value[login.value] ||
    runtime.public.defaultRepository ||
    "inchidev/gitwok",
  set: (value) => {
    savedRepositories.value = {
      ...savedRepositories.value,
      [login.value]: parseRepository(value).join("/"),
    };
  },
});
const chat = useChat(auth.token, login, preview, repository);
const authOpen = ref(false);
const workspaceOpen = ref(false);
const ownOpen = ref(false);
const channelsOpen = ref(false);
const appError = ref("");
const feed = useTemplateRef("feed");
const { copy, copied } = useClipboard();
const colorMode = useColorMode();
const {
  channels,
  channel,
  selectedChannel,
  selectedThread,
  search,
  roots,
  parent,
  replies,
  roomDraft,
  threadDraft,
  canWrite,
  online,
} = chat;
const isSignedIn = computed(() =>
  Boolean(auth.viewer.value && auth.token.value),
);
const sample = computed(() => preview.value || !isSignedIn.value);
const workspaceName = computed(() =>
  sample.value ? "The shared kitchen" : repository.value.split("/").at(-1),
);
const queryError = computed(
  () => chat.channelsQuery.error.value || chat.messagesQuery.error.value,
);
const sendError = computed(() => chat.sendMutation.error.value?.message || "");
const isPending = chat.sendMutation.isPending;
const loading = computed(
  () =>
    !sample.value &&
    (chat.channelsQuery.isPending.value ||
      (Boolean(channel.value) && chat.messagesQuery.isPending.value)),
);
const currentUrl = computed(() => safeUrl(channel.value?.url || ""));
const updatedAt = computed(() =>
  chat.messagesQuery.dataUpdatedAt.value
    ? dayjs(chat.messagesQuery.dataUpdatedAt.value).format("HH:mm")
    : "",
);
const threadPresent = ref(false);
watch(
  parent,
  (value) => {
    if (value) threadPresent.value = true;
  },
  { flush: "sync" },
);
const conversationMenu = computed(() =>
  sample.value
    ? [
        {
          label: "Export preview channel",
          icon: "i-lucide-download",
          onSelect: exportPreview,
        },
        {
          label: "Host your own GitWok",
          icon: "i-lucide-sprout",
          onSelect: () => {
            ownOpen.value = true;
          },
        },
      ]
    : [
        {
          label: "Change workspace",
          icon: "i-lucide-panels-top-left",
          onSelect: openWorkspaces,
        },
        {
          label: "Host your own GitWok",
          icon: "i-lucide-sprout",
          onSelect: () => {
            ownOpen.value = true;
          },
        },
      ],
);

watch(
  [auth.busy, isSignedIn],
  ([busy, signedIn]) => {
    if (!busy) authOpen.value = !signedIn && !preview.value;
    if (signedIn) {
      preview.value = false;
      const incoming = new URL(window.location.href).searchParams.get(
        "workspace",
      );
      if (incoming) {
        try {
          repository.value = incoming;
        } catch {
          appError.value = "This workspace link is invalid.";
        }
      }
    }
  },
  { immediate: true },
);
watch(queryError, (error) => {
  if (error instanceof GitHubError && error.status === 401) auth.signOut();
});
watch(
  () => chat.messages.value.length,
  async () => {
    const nearEnd =
      !feed.value ||
      feed.value.scrollHeight - feed.value.scrollTop - feed.value.clientHeight <
        180;
    if (nearEnd) {
      await nextTick();
      feed.value?.scrollTo({
        top: feed.value.scrollHeight,
        behavior: "instant",
      });
    }
  },
);
watch(selectedChannel, async () => {
  channelsOpen.value = false;
  await nextTick();
  feed.value?.scrollTo({ top: feed.value.scrollHeight, behavior: "instant" });
});

function explore() {
  preview.value = true;
  authOpen.value = false;
  const url = new URL(window.location.href);
  url.searchParams.set("preview", "1");
  history.replaceState(null, "", url);
}
function openWorkspaces() {
  if (isSignedIn.value) workspaceOpen.value = true;
  else authOpen.value = true;
}
function connect(value: string) {
  repository.value = value;
  preview.value = false;
  appError.value = "";
  const url = new URL(window.location.href);
  url.searchParams.delete("preview");
  url.searchParams.set("workspace", value);
  history.replaceState(null, "", url);
}
async function installApp() {
  appError.value = "";
  try {
    const url = await auth.installationLink();
    window.location.assign(url);
  } catch (error) {
    appError.value =
      error instanceof Error
        ? error.message
        : "Could not open GitHub App installation.";
  }
}
function signOut() {
  preview.value = false;
  auth.signOut();
  authOpen.value = true;
}
function shareWorkspace() {
  const url = new URL(`${window.location.origin}${runtime.app.baseURL}`);
  url.searchParams.set("workspace", repository.value);
  void copy(url.href);
}
function exportPreview() {
  const blob = new Blob(
    [
      JSON.stringify(
        { channels: channels.value, messages: chat.messages.value },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gitwok-preview-channel.json";
  link.click();
  URL.revokeObjectURL(url);
}
function dayLabel(index: number) {
  const message = roots.value[index];
  if (
    !message ||
    (index &&
      dayjs(roots.value[index - 1]?.createdAt).isSame(message.createdAt, "day"))
  )
    return "";
  return dayjs(message.createdAt).isSame(dayjs(), "day")
    ? "Today"
    : dayjs(message.createdAt).format("D MMMM YYYY");
}
</script>

<template>
  <div class="gitwok-shell" :class="{ 'has-thread': parent || threadPresent }">
    <aside
      class="channel-sidebar"
      :class="{ 'is-open': channelsOpen }"
      aria-label="Workspace navigation"
    >
      <div class="sidebar-top">
        <a :href="runtime.app.baseURL" class="brand" aria-label="GitWok home"
          ><BrandMark /><span>GitWok</span></a
        >
        <UButton
          icon="i-lucide-x"
          aria-label="Close channels"
          color="neutral"
          variant="ghost"
          class="mobile-only"
          @click="channelsOpen = false"
        />
      </div>
      <button class="workspace-switch" @click="openWorkspaces">
        <span
          ><strong>{{ workspaceName }}</strong
          ><small>{{ sample ? "Local preview" : repository }}</small></span
        >
        <UIcon name="i-lucide-chevrons-up-down" />
      </button>
      <div class="channel-heading">
        <span>Conversations</span><span>{{ channels.length }}</span>
      </div>
      <nav class="channels" aria-label="Channels">
        <UButton
          v-for="item in channels"
          :key="item.id"
          :label="`# ${item.name}`"
          color="neutral"
          variant="ghost"
          :class="{ active: selectedChannel === item.id }"
          :aria-current="selectedChannel === item.id ? 'page' : undefined"
          @click="selectedChannel = item.id"
        />
        <p v-if="!channels.length && !loading" class="sidebar-note">
          No conversations yet. Start a Discussion in your repository.
        </p>
      </nav>
      <div class="sidebar-bottom">
        <button class="own-client" @click="ownOpen = true">
          <UIcon name="i-lucide-sprout" /><span
            ><strong>Make yourself at home</strong
            ><small>Put GitWok on your own GitHub</small></span
          ><UIcon name="i-lucide-arrow-up-right" />
        </button>
        <div class="user-bar">
          <span
            ><strong>{{
              auth.viewer.value?.login || "Just looking around"
            }}</strong
            ><small>{{
              isSignedIn ? "Connected with GitHub" : "Sample conversations"
            }}</small></span
          >
          <UButton
            icon="i-lucide-sun-moon"
            aria-label="Toggle color theme"
            color="neutral"
            variant="ghost"
            @click="
              colorMode.preference =
                colorMode.value === 'dark' ? 'light' : 'dark'
            "
          />
          <UButton
            v-if="isSignedIn"
            icon="i-lucide-log-out"
            aria-label="Sign out"
            color="neutral"
            variant="ghost"
            @click="signOut"
          />
          <UButton
            v-else
            icon="i-lucide-github"
            aria-label="Sign in with GitHub"
            color="neutral"
            variant="ghost"
            @click="authOpen = true"
          />
        </div>
      </div>
    </aside>
    <button
      v-if="channelsOpen"
      class="sidebar-backdrop"
      aria-label="Close channel navigation"
      @click="channelsOpen = false"
    />

    <main class="conversation">
      <header class="conversation-header">
        <UButton
          icon="i-lucide-menu"
          aria-label="Open channels"
          color="neutral"
          variant="ghost"
          class="mobile-only"
          @click="channelsOpen = true"
        />
        <div class="channel-title">
          <h2><span>#</span> {{ channel?.name || "Your workspace" }}</h2>
          <p>{{ channel?.description || "A place for the conversation" }}</p>
        </div>
        <div class="header-actions">
          <UButton
            v-if="sample"
            label="Sign in"
            aria-label="Sign in with GitHub"
            icon="i-lucide-github"
            color="neutral"
            variant="outline"
            size="sm"
            @click="authOpen = true"
          />
          <UButton
            v-else
            icon="i-lucide-link"
            :aria-label="
              copied ? 'Workspace link copied' : 'Copy workspace link'
            "
            color="neutral"
            variant="ghost"
            @click="shareWorkspace"
          />
          <UButton
            v-if="currentUrl"
            :to="currentUrl"
            target="_blank"
            rel="noopener noreferrer"
            icon="i-lucide-arrow-up-right"
            aria-label="Open channel in GitHub"
            color="neutral"
            variant="ghost"
          />
          <UDropdownMenu :items="conversationMenu"
            ><UButton
              icon="i-lucide-ellipsis"
              aria-label="Conversation options"
              color="neutral"
              variant="ghost"
          /></UDropdownMenu>
        </div>
      </header>
      <div class="conversation-tools">
        <UInput
          v-model="search"
          type="search"
          icon="i-lucide-search"
          placeholder="Search messages"
          aria-label="Search messages"
          size="sm"
          class="search-input"
        >
          <template v-if="search" #trailing
            ><UButton
              icon="i-lucide-x"
              aria-label="Clear search"
              color="neutral"
              variant="link"
              size="xs"
              @click="search = ''"
          /></template>
        </UInput>
        <UButton
          v-if="!sample"
          icon="i-lucide-refresh-cw"
          :label="
            chat.messagesQuery.isFetching.value
              ? 'Updating…'
              : updatedAt
                ? `Updated ${updatedAt}`
                : 'Refresh'
          "
          aria-label="Refresh messages"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="!online || chat.messagesQuery.isFetching.value"
          @click="chat.refresh"
        />
      </div>
      <div v-if="!online" class="notice offline-notice" role="status">
        You’re offline. Your draft is saved on this device.<span v-if="!sample">
          Send it when you reconnect.</span
        >
      </div>
      <div v-else-if="sample" class="notice preview-notice">
        Local preview · sample conversations, saved in this browser.
      </div>
      <div v-if="appError" class="notice error-notice" role="alert">
        {{ appError }}
      </div>
      <div
        v-if="queryError && !sample"
        class="notice error-notice"
        role="alert"
      >
        <span>{{ queryError.message }}</span
        ><UButton
          label="Retry"
          size="xs"
          color="neutral"
          variant="outline"
          :disabled="!online"
          @click="chat.refresh"
        />
      </div>

      <div
        ref="feed"
        class="message-feed"
        role="region"
        aria-label="Messages"
        tabindex="0"
        :aria-busy="loading"
      >
        <div v-if="loading" class="empty-state">
          <UIcon name="i-lucide-loader-circle" class="animate-spin" />
          <h3>Opening the conversation…</h3>
          <p>Reading Discussions from GitHub.</p>
        </div>
        <div v-else-if="!channels.length" class="empty-state">
          <BrandMark />
          <h3>This workspace is ready for a conversation.</h3>
          <p>
            Start a Discussion on GitHub and it will appear here as a channel.
          </p>
          <UButton
            label="Open Discussions"
            :to="`https://github.com/${repository}/discussions`"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="outline"
          />
        </div>
        <div v-else-if="!roots.length" class="empty-state">
          <UIcon
            :name="search ? 'i-lucide-search' : 'i-lucide-messages-square'"
          />
          <h3>
            {{
              search
                ? "No messages match your search."
                : "This conversation starts with you."
            }}
          </h3>
          <p>
            {{
              search
                ? "Try another word, or return to the conversation."
                : "Write the first message below."
            }}
          </p>
          <UButton
            v-if="search"
            label="Clear search"
            color="neutral"
            variant="outline"
            @click="search = ''"
          />
        </div>
        <template v-for="(message, index) in roots" :key="message.id">
          <div v-if="dayLabel(index)" class="day-divider">
            <span>{{ dayLabel(index) }}</span>
          </div>
          <MessageItem
            :message="message"
            :replies="chat.replyCount(message.id)"
            :selected="selectedThread === message.id"
            @thread="selectedThread = $event"
          />
        </template>
      </div>
      <ChatComposer
        v-model="roomDraft"
        label="Message"
        :disabled="!canWrite"
        :pending="isPending"
        :preview="sample"
        :error="sendError"
        @send="chat.send()"
      />
    </main>

    <Transition name="thread" @after-leave="threadPresent = false">
      <aside v-if="parent" class="thread-panel" aria-label="Thread">
        <header class="thread-header">
          <div>
            <h2>Thread</h2>
            <p># {{ channel?.name }}</p>
          </div>
          <UButton
            icon="i-lucide-x"
            aria-label="Close thread"
            color="neutral"
            variant="ghost"
            @click="selectedThread = ''"
          />
        </header>
        <div
          class="thread-feed"
          role="region"
          aria-label="Thread messages"
          tabindex="0"
        >
          <MessageItem :message="parent" in-thread selected />
          <div class="thread-divider">
            {{ replies.length }}
            {{ replies.length === 1 ? "reply" : "replies" }}
          </div>
          <MessageItem
            v-for="reply in replies"
            :key="reply.id"
            :message="reply"
            in-thread
          />
        </div>
        <ChatComposer
          v-model="threadDraft"
          label="Reply"
          reply
          :disabled="!canWrite"
          :pending="isPending"
          :preview="sample"
          :error="sendError"
          @send="chat.send(selectedThread)"
        />
      </aside>
    </Transition>
    <AuthModal
      v-model:open="authOpen"
      :busy="auth.busy.value"
      :error="auth.error.value"
      @sign-in="auth.signIn"
      @preview="explore"
    />
    <WorkspaceModal
      v-model:open="workspaceOpen"
      :token="auth.token.value"
      :login="login"
      :repository="repository"
      @connect="connect"
      @install="installApp"
    />
    <OwnClientModal v-model:open="ownOpen" />
  </div>
</template>
