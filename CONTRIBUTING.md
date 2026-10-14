# Contributing to Ghrew

Thank you for your interest in contributing to Ghrew! This guide helps you set up the project locally, run tests and checks, and submit high-quality pull requests.

---

## Getting Started

### Prerequisites

- **Node.js**: v20+ (v24 recommended, matching CI)
- **npm**: v10+

### Local Setup

1. **Clone the repository and install dependencies:**
   ```sh
   git clone https://github.com/inchidev/ghrew.git
   cd ghrew
   npm ci
   ```

2. **Configure environment variables:**
   ```sh
   cp .env.example .env
   ```
   > **Important Security Rule:** Never commit `.env`, `.dev.vars`, private keys, GitHub App secrets, or `SETUP_TOKEN`. These files are gitignored.

3. **Start the local development server:**
   ```sh
   npm run dev -- --port 5178
   ```

4. **Explore the local preview:**
   Open [http://localhost:5178/?preview=1](http://localhost:5178/?preview=1) in your browser. This provides an offline demo mode with sample conversations and drafts stored in localStorage, without sending any requests to GitHub.

---

## Validation & Testing

Always verify your changes before submitting a pull request:

### 1. Fast Validation Check
Run the standard validation suite (unit tests, TypeScript checks across all subprojects, and production build):
```sh
npm run check
```
This runs:
- `npm run test`: Vitest unit tests in `tests/*.test.ts`
- `npm run typecheck`: Nuxt typecheck + TypeScript compilers for `oauth/`, `scripts/`, and `backend/`
- `npm run build`: Nuxt static generation build

### 2. End-to-End (E2E) Browser Tests
Ghrew provides two Playwright E2E configurations:

- **Client E2E tests (`playwright.config.ts`):**
  ```sh
  npx playwright install chromium
  npm run test:e2e
  ```
- **Backend / Mailbox E2E tests (`playwright.backend.config.ts`):**
  ```sh
  npm run test:e2e:backend
  ```

---

## Issue Labels

Ghrew organizes issues using labels to help contributors find suitable tasks:

- **`good first issue`**: Well-scoped tasks with clear requirements, pointers to relevant files, and explicit acceptance criteria. Recommended for first-time contributors.
- **`codex`**: Architectural tasks, codebase refactors, and issues structured with clear specifications suitable for automated review or agent-assisted development.
- **`bug`**: Unexpected behavior, crashes, rendering bugs, or regressions.
- **`enhancement`**: New features, UX improvements, or workflow enhancements.

---

## Pull Request Guidelines

1. **Branch naming:** Use descriptive names such as `fix/issue-description` or `feat/feature-name`.
2. **Describe verification:** In your PR description, always clarify:
   - What was tested with automated unit/browser mocks vs live-verified against GitHub/Cloudflare.
   - Which commands were run (e.g., `npm run check`, `npm run test:e2e`).
3. **No secrets:** Ensure no tokens, passwords, or personal credentials appear in diffs or commit messages.
4. **Follow conventions:** Keep commits focused, clean, and write clear commit messages referencing relevant issues (e.g., `Fixes #12`).
