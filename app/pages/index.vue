<script setup lang="ts">
import { previewMessages } from "~/lib/preview";
const colorMode = useColorMode();
const room = ref("general");
const messages = previewMessages();
const shown = computed(() =>
  messages
    .filter(
      (message) =>
        message.channelId === `preview-${room.value}` && !message.parentId,
    )
    .slice(-2),
);
useHead({ title: "Ghrew · Your crew, on GitHub" });
</script>
<template>
  <div class="landing">
    <header class="landing-header">
      <NuxtLink to="/" class="brand" aria-label="Ghrew home"
        ><BrandMark /><span>Ghrew</span></NuxtLink
      >
      <nav aria-label="Main navigation">
        <a
          href="https://github.com/inchidev/ghrew"
          target="_blank"
          rel="noopener noreferrer"
          class="landing-source"
          ><UIcon name="i-octicon-mark-github-16" /> Source code</a
        >
        <UButton
          icon="i-octicon-sun-16"
          aria-label="Toggle color theme"
          color="neutral"
          variant="ghost"
          @click="
            colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
          "
        />
        <UButton
          to="/login"
          label="Sign in"
          color="neutral"
          variant="outline"
        />
      </nav>
    </header>
    <main>
      <section class="landing-hero" aria-labelledby="landing-title">
        <div class="landing-intro">
          <p class="landing-eyebrow">
            <UIcon name="i-octicon-comment-discussion-16" /> A home for your
            conversations
          </p>
          <h1 id="landing-title">Your crew,<br />on GitHub.</h1>
          <p class="landing-description">
            Channels, private groups and direct messages for the people you
            build with.
          </p>
          <div class="landing-actions">
            <UButton
              to="/login"
              label="Open Ghrew"
              icon="i-octicon-mark-github-16"
              size="lg"
            /><NuxtLink to="/demo"
              >Try the demo <UIcon name="i-octicon-arrow-right-16"
            /></NuxtLink>
          </div>
          <p class="landing-free">
            Free and open source. Bring your GitHub account.
          </p>
        </div>
        <div class="landing-preview" aria-label="Interactive demo preview">
          <div class="preview-toolbar">
            <BrandMark /><strong>Ghrew demo</strong><span>Preview</span>
          </div>
          <div class="preview-layout">
            <nav aria-label="Preview channels">
              <span>Channels</span
              ><button
                v-for="name in ['general', 'building']"
                :key="name"
                :aria-pressed="room === name"
                @click="room = name"
              >
                # {{ name }}</button
              ><span class="preview-private"
                ><UIcon name="i-octicon-lock-16" /> Private groups</span
              ><span><UIcon name="i-octicon-person-16" /> Direct messages</span>
            </nav>
            <div class="preview-conversation">
              <h2># {{ room }}</h2>
              <div class="preview-messages" aria-live="polite">
                <article v-for="message in shown" :key="message.id">
                  <span class="preview-avatar" aria-hidden="true">{{
                    message.author.slice(0, 1)
                  }}</span>
                  <div>
                    <strong>{{ message.author }}</strong>
                    <p>{{ message.body }}</p>
                    <NuxtLink
                      v-if="room === 'general' && message === shown[0]"
                      to="/demo/c/preview-general?thread=preview-guide"
                      class="preview-replies"
                      >2 replies</NuxtLink
                    >
                  </div>
                </article>
              </div>
              <NuxtLink to="/demo" class="preview-composer"
                >Join the conversation <UIcon name="i-octicon-arrow-right-16"
              /></NuxtLink>
            </div>
          </div>
        </div>
      </section>
      <section class="landing-details" aria-label="About Ghrew">
        <div>
          <UIcon name="i-octicon-comment-discussion-16" />
          <h2>A channel for every conversation</h2>
          <p>
            Keep plans, questions and the little things together. Follow up in a
            thread when there’s more to say.
          </p>
        </div>
        <div>
          <UIcon name="i-octicon-lock-16" />
          <h2>Choose who’s in the room</h2>
          <p>
            Talk with the whole crew, start a private group or reach someone
            directly.
          </p>
        </div>
        <div>
          <UIcon name="i-octicon-repo-template-16" />
          <h2>Make it your own</h2>
          <p>Explore the shared sandbox, or set up a home for your own team.</p>
          <NuxtLink to="/create/"
            >Create your own workspace <UIcon name="i-octicon-arrow-right-16"
          /></NuxtLink>
        </div>
      </section>
    </main>
    <footer class="landing-footer">
      <a href="https://inchi.dev" target="_blank" rel="noopener noreferrer"
        >Made by inchi</a
      ><span>Free, open source, yours.</span
      ><a
        href="https://github.com/inchidev/ghrew"
        target="_blank"
        rel="noopener noreferrer"
        >View on GitHub <UIcon name="i-octicon-link-external-16"
      /></a>
    </footer>
  </div>
</template>
<style scoped>
.landing {
  max-width: 1240px;
  margin: auto;
  padding: 0 40px;
}
.landing-header {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--ui-border);
}
.landing-header nav {
  display: flex;
  align-items: center;
  gap: 16px;
}
.landing a {
  text-decoration: none;
}
.landing-source,
.landing-actions > a:last-child,
.landing-details a,
.landing-footer a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.landing-hero {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  align-items: center;
  gap: 52px;
  padding: 88px 0 80px;
}
.landing-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ui-text-muted);
  margin-bottom: 24px;
}
h1 {
  font-size: clamp(44px, 5vw, 68px);
  line-height: 1.06;
  letter-spacing: -2.5px;
  font-weight: 650;
}
.landing-description {
  max-width: 370px;
  font-size: 19px;
  line-height: 1.55;
  color: var(--ui-text-muted);
  margin-top: 24px;
}
.landing-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 32px;
}
.landing-free {
  font-size: 13px;
  color: var(--ui-text-muted);
  margin-top: 18px;
}
.landing-preview {
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 24px #01040914;
  min-width: 0;
}
.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 16px;
  border-bottom: 1px solid var(--ui-border);
  background: var(--rail);
}
.preview-toolbar .brand-mark {
  width: 20px;
  height: 20px;
}
.preview-toolbar > span:last-child {
  margin-left: auto;
  color: var(--ui-text-muted);
  font-size: 12px;
}
.preview-layout {
  display: grid;
  grid-template-columns: 142px minmax(0, 1fr);
  min-height: 310px;
}
.preview-layout > nav {
  background: var(--rail);
  border-right: 1px solid var(--ui-border);
  padding: 20px 8px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
}
.preview-layout nav > span {
  font-size: 12px;
  color: var(--ui-text-muted);
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 0 8px;
  margin-bottom: 8px;
}
.preview-layout nav > .preview-private {
  margin: 22px 0 10px;
}
.preview-layout button {
  text-align: left;
  padding: 6px 8px;
  border-radius: 5px;
}
.preview-layout button[aria-pressed="true"] {
  background: var(--control-bgColor-hover);
  font-weight: 600;
  box-shadow: inset 2px 0 var(--fgColor-accent);
}
.preview-conversation {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.preview-conversation h2 {
  padding: 12px 16px;
  border-bottom: 1px solid var(--ui-border);
  font-size: 14px;
  font-weight: 600;
}
.preview-messages {
  padding: 20px 16px;
  flex: 1;
}
.preview-messages article {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
  font-size: 13px;
}
.preview-messages article:last-child {
  margin-bottom: 0;
}
.preview-avatar {
  background: var(--bgColor-accent-muted);
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  color: var(--fgColor-accent);
  font-weight: 600;
}
.preview-messages strong {
  font-weight: 600;
}
.preview-messages p {
  margin-top: 3px;
}
.preview-replies {
  color: var(--fgColor-accent);
  display: block;
  margin-top: 8px;
  font-size: 12px;
}
.preview-composer {
  margin: 0 12px 12px;
  border: 1px solid var(--ui-border);
  padding: 10px 12px;
  border-radius: 6px;
  color: var(--ui-text-muted);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.landing-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
  border-top: 1px solid var(--ui-border);
  padding: 36px 0 52px;
}
.landing-details > div > .iconify {
  color: var(--ui-text-muted);
  width: 22px;
  height: 22px;
}
.landing-details h2 {
  font-size: 16px;
  font-weight: 600;
  margin-top: 12px;
}
.landing-details p {
  color: var(--ui-text-muted);
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
}
.landing-details a {
  margin-top: 14px;
  color: var(--fgColor-accent);
  font-size: 14px;
}
.landing-footer {
  border-top: 1px solid var(--ui-border);
  padding: 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: var(--ui-text-muted);
  font-size: 12px;
}
@media (max-width: 1000px) {
  .landing-hero {
    gap: 28px;
    grid-template-columns: 1fr 1.1fr;
    padding: 60px 0;
  }
  .preview-layout {
    grid-template-columns: 112px minmax(0, 1fr);
  }
  .preview-layout nav > span {
    font-size: 11px;
    padding-inline: 4px;
  }
  .landing-description {
    font-size: 17px;
  }
  .landing-actions {
    gap: 16px;
  }
}
@media (max-width: 760px) {
  .landing {
    padding: 0 24px;
  }
  .landing-header {
    height: 64px;
  }
  .landing-header nav {
    gap: 8px;
  }
  .landing-source {
    display: none !important;
  }
  .landing-hero {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 36px 0;
  }
  h1 {
    font-size: 48px;
    letter-spacing: -1.8px;
  }
  .landing-eyebrow {
    margin-bottom: 18px;
    font-size: 12px;
  }
  .landing-description {
    margin-top: 18px;
    max-width: 370px;
    font-size: 17px;
  }
  .landing-actions {
    margin-top: 24px;
  }
  .landing-free {
    font-size: 12px;
  }
  .preview-layout {
    grid-template-columns: 112px minmax(0, 1fr);
    min-height: 290px;
  }
  .preview-layout nav > span {
    font-size: 12px;
    padding: 0;
    gap: 3px;
  }
  .preview-layout button {
    font-size: 12px;
    padding-inline: 4px;
  }
  .preview-messages {
    padding: 16px 12px;
  }
  .preview-avatar {
    width: 24px;
    height: 24px;
    font-size: 11px;
  }
  .preview-messages article {
    gap: 7px;
    font-size: 12px;
  }
  .landing-details {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 28px 0;
  }
  .landing-details h2 {
    margin-top: 8px;
  }
  .landing-footer {
    flex-wrap: wrap;
    gap: 14px;
  }
  .landing-footer > span {
    display: none;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .preview-layout button {
    transition: background-color 120ms;
  }
}
</style>
