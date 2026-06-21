# Nexora Mobile — Repository Guide

## ⚠ Publishing & commit identity (READ FIRST — do not repeat past mistakes)

- **Publishes to BOTH:** GitLab `origin` (`gitlab.com/parendum/nexora/nexora-mobile`, source of truth)
  **and** public GitHub **[ParendumOU/Nexora-Mobile](https://github.com/ParendumOU/Nexora-Mobile)**.
  - The GitLab→GitHub CI mirror is unreliable (no runners) — after pushing GitLab, **push to GitHub
    manually too**. GitHub `main` keeps its own curated history (disjoint from GitLab): add commits
    on top of the GitHub tip; never force GitLab's full internal history over it.
- **Commit identity — ALWAYS `Parendum <295081442+ParendumOU@users.noreply.github.com>`.** Local git
  is already configured this way. NEVER commit as a personal account (e.g. ConnorDev1337 /
  connordev@protonmail.com).
- **NEVER add a `Co-Authored-By:` trailer. NEVER mention Claude / AI / assistants** anywhere —
  commit messages, PR titles/bodies, code comments, or docs. Always write as the Nexora/Parendum team.
- GitLab `main` allows force-push; GitHub `main` is unprotected. (All history was reattributed to
  ParendumOU on 2026-06-21.)
- **This `CLAUDE.md` is GitLab-only — never publish it to GitHub.** The CI `publish-github` job
  already strips it (plus `.claude/`, `.gitlab-ci.yml`) via `GITHUB_EXCLUDE` before the tagged squash
  push, so releases never expose internal docs. Don't push it to GitHub manually either.
  (Verified absent on GitHub 2026-06-21.)

> Native iOS + Android client for **self-hosted** Nexora workspaces. Expo (React Native +
> TypeScript). Telegram-style fluid chat UI matching Nexora's dark-first brand.
> GitLab: `parendum/nexora/nexora-mobile` · default branch `main`.

---

## 1. What this repo is

A phone app that talks to a **customer-hosted Nexora/NexoraCloud instance** (LAN or VPN).
There is **no Parendum-hosted backend for the app** — it points at whatever server the user
pairs with. Distributed via app stores / sideloaded APK.

Pairing is QR-based: the user scans a code shown in their Nexora **web** settings; no
password is ever typed on the phone. Each device gets its own revocable token.

- **Scope (v1):** chat-first — link device, conversation list, real-time streaming chat,
  agent picker, in-chat **Tasks / Plan / Notes / Agents** menu, settings/unlink.
- Backend dependency lives in the **Nexora core repo** (device-pairing endpoints +
  migration `050_device_tokens`). This repo ships no backend.

---

## 2. Tech stack

| Layer | Tech |
|-------|------|
| Framework | Expo SDK 52, React Native 0.76, React 18, TypeScript (strict), new architecture on |
| Routing | `expo-router` v4 (file-based, typed routes) |
| State | Zustand v5 |
| Secure storage | `expo-secure-store` (OS keychain — holds the device secret) |
| Camera / QR | `expo-camera` (`CameraView` barcode scan) |
| Animation | `react-native-reanimated`, `react-native-gesture-handler` |
| Markdown | `react-native-markdown-display` |
| Icons | `@expo/vector-icons` (Ionicons) |
| Visual | `expo-linear-gradient`, `react-native-svg`, `expo-haptics` |
| Build | EAS Build (`eas.json`) |

---

## 3. Directory structure

```
Nexora-Mobile/
├── app/                          # expo-router routes
│   ├── _layout.tsx               # root: hydrate session, nav theme, splash gate
│   ├── index.tsx                 # entry gate → /link or /(app)/chats
│   ├── link.tsx                  # QR scan + manual pairing (the entry experience)
│   └── (app)/                    # auth-guarded group
│       ├── _layout.tsx           # redirects to /link when no session
│       ├── chats.tsx             # conversation list + FAB
│       ├── chat/[id].tsx         # streaming conversation + in-chat menu
│       ├── new.tsx               # agent picker → create chat (modal)
│       └── settings.tsx          # account, server, unlink
├── src/
│   ├── theme/tokens.ts           # Nexora brand tokens (colors/radius/gradients/spacing)
│   ├── lib/
│   │   ├── api.ts                # fetch client w/ auto device-refresh; pairing calls; ws url
│   │   ├── useChat.ts            # WebSocket streaming hook (reconnect, ping/pong, optimistic send)
│   │   ├── store.ts              # zustand session store
│   │   ├── secure.ts             # expo-secure-store persistence
│   │   └── types.ts              # API + WS event shapes
│   └── components/
│       ├── Logo.tsx              # brand diamond mark on gradient tile
│       ├── Avatar.tsx            # gradient initials avatar
│       ├── MessageBubble.tsx     # markdown + <thinking> collapsible + meta
│       ├── markdownStyles.ts     # markdown theme map
│       ├── ChatComposer.tsx      # input bar + gradient send
│       ├── ChatMenuSheet.tsx     # bottom sheet: Tasks / Plan / Notes / Agents
│       └── TypingDots.tsx        # animated activity indicator
├── assets/                       # icon.png, adaptive-icon.png, splash.png (brand-generated)
├── app.json                      # Expo config (bundle id com.parendum.nexora, dark UI, perms)
├── eas.json                      # build profiles (preview=APK, production=AAB)
├── tsconfig.json                 # paths: @/* → src/*
├── babel.config.js               # expo preset + reanimated plugin (last)
└── README.md
```

---

## 4. Pairing & auth flow

```
Web (Settings → Devices)                         Mobile
  POST /api/auth/device/start {base_url}  ─┐
   → { code, url, qr_b64, expires_in }      │  renders QR { "url": <server>, "code": <code> }
   (code in Redis 5min, single-use)         └──────────────►  scan QR (link.tsx)
                                                 POST /api/auth/device/pair { code, device_name, platform }
                                                  ← { access_token, device_token(nxd_…), org_id, user }
  device stores nxd_ secret in keychain (secure.ts)
  access JWT refreshed: POST /api/auth/device/refresh { device_token }
  revoke: web Settings → Devices, or phone Settings → Unlink (DELETE /api/auth/device/{id})
```

- **Access token** = standard Nexora JWT (`{sub, org, type:access}`) → works on every REST +
  WebSocket endpoint with no server changes.
- **`nxd_` device secret** = per-device, individually revocable, does **not** touch the user's
  global `token_version` (so unlinking a phone never logs out web/CLI).
- `api.ts` auto-refreshes the access JWT once on any `401`, then re-tries the request; on
  refresh failure it signs the device out (forces re-pair).

---

## 5. Streaming (chat)

`src/lib/useChat.ts` opens `wss://<server>/ws/chat/{chatId}?token=<accessJWT>` and handles the
core WS protocol: `connected`, `stream_start`, `chunk`, `stream_end`, `user_message`,
`tool_call`, `activity_status`, `error`, `ping`→`pong`. Reconnects with exponential backoff +
jitter. Optimistic user message is reconciled against the server `user_message` echo.

> ⚠ The WS uses the current access JWT in the query string; it does not refresh the token
> mid-connection (REST does). 15-min token + reconnect makes this low-risk; add a pre-connect
> refresh if long idle sockets become a problem.

---

## 6. Branding (must match web)

Tokens in `src/theme/tokens.ts`, sourced from `Nexora/frontend` (dark-first):

| Token | Value |
|-------|-------|
| Background | `#0a0a0f` · surface `#14141f` · card `#16161f` |
| Primary (indigo) | `#6366f1` |
| Secondary (violet) | `#8b5cf6` |
| Brand gradient | 135° `#6366f1 → #8b5cf6` |
| Text | `#f8fafc` · muted `#94a3b8` · faint `#64748b` |
| Radius | 8 / 12 / 16 / 20 |
| Depth | hairline borders + indigo glow, **not** heavy shadows |

Logo = diamond-stack mark (mirrors `Nexora/frontend/public/favicon.svg`). Icons/splash in
`assets/` are generated to brand; regenerate via the Pillow script if the mark changes.

---

## 7. Develop / build

> ⚠ **CRITICAL — never run `npm` on the host** (host npm is compromised, per platform policy).
> Use `pnpm` / `pnpm dlx` only.

```bash
pnpm install
pnpm start                                   # Expo dev server (dev build needed for camera)
pnpm tsc                                      # type-check

# APK (sideload) — cloud build on Expo servers, no local Android SDK:
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest build:configure       # writes extra.eas.projectId into app.json (commit it)
pnpm dlx eas-cli@latest build -p android --profile preview   # → APK download link

# Fully offline build (needs JDK17 + Android SDK):
pnpm dlx expo prebuild -p android && cd android && ./gradlew assembleRelease
```

`preview` profile = APK (`buildType: apk`); `production` = AAB for Play Store. EAS manages the
signing keystore. `android/` & `ios/` are gitignored (regenerated by prebuild/EAS).

---

## 8. Conventions

- TypeScript strict. Path alias `@/*` → `src/*`.
- All network calls through `src/lib/api.ts`; never hardcode a server URL (it comes from the
  paired session). WS URL via `wsUrlFor()`.
- Brand values come from `src/theme/tokens.ts` — no ad-hoc hex in components.
- Conventional commits (`feat(scope):`, `fix(scope):`, `chore:`); footer co-author per session
  policy. Branch off `main`.

---

## 9. Backend contract (lives in Nexora core, not here)

Endpoints this app depends on (core repo, migration `050_device_tokens`):
`POST /api/auth/device/start|pair|refresh`, `GET /api/auth/device`, `DELETE /api/auth/device/{id}`.
Plus the existing chat/agent/message/WS endpoints. Run `alembic upgrade head` on the instance
before pairing. The web pairing UI is `Nexora/frontend` → Settings → **Devices** tab.

---

## 10. Backlog / not-yet

- Full parity screens (agents builder, projects, issues, knowledge bases) — v1 is chat-first.
- Multimodal image upload (`POST /chats/{id}/files` + `file_ids`) — wired in core, not yet in UI.
- Push notifications, biometric lock on the keychain, Geist font bundling (currently system font),
  WS mid-connection token refresh.

## 11. CI / release

`.gitlab-ci.yml` stages: `validate` → `tag` → `build`.
- **validate** (MR/main/tag): `tsc` + asserts `VERSION` == `app.json` expo.version == `package.json` version.
- **tag** (`auto-tag`, main only): if `VERSION` has no matching git tag, creates & pushes `vX.Y.Z`.
  Idempotent; never runs on tag pipelines so it can't loop.
- **build**: `eas:android` (APK, `preview`) on main; `eas:release` (AAB, `production`) on tag;
  `eas:ios` manual; `release` on tag creates a GitLab Release whose description is the matching
  `CHANGELOG.md` section (fires a Release event → Gateway backfills the changelog notes).

**Release a version:** add a `## <version>` section to `CHANGELOG.md`, bump `VERSION` +
`app.json` expo.version + `package.json` version together, push to `main`. CI tags it → the tag
fires `eas:release` (AAB), the `release` job (GitLab Release from the CHANGELOG section), **and**
the GitLab tag-push/Release webhook → NexoraGateway publishes a `ProductVersion(product="nexora-mobile")`
with notes → it appears in the NexoraWeb `/changelog`. NexoraDocs changelog is hand-edited MDX.

**Required masked CI/CD vars:** `EXPO_TOKEN` (cloud builds), `GITLAB_PUSH_TOKEN`
(project access token, `write_repository`, lets `auto-tag` push the tag). Configure the
tag-push webhook once: GitLab → Settings → Webhooks → `https://nexora-gw.parendum.com/webhooks/gitlab/tag`,
Tag push events, token = `GITLAB_WEBHOOK_SECRET`. Runners use pnpm via corepack (CI is a clean
container — the host-npm rule doesn't apply there).

---

## 12. Testing & CI (added 2026-06-10)

- **Unit/component tests:** `__tests__/` (jest-expo + React Native Testing Library). Covers QR
  pairing payload + device-token flow, the API/WS client, Zustand stores, `MessageBubble`,
  `LinkScreen`, and a version-lockstep assertion (`VERSION` == `app.json` == `package.json`).
- **`jest.config.js`:** `transformIgnorePatterns` is **pnpm-aware** — it peers past
  `.pnpm/<pkg>@<ver>/node_modules/` and prefix-matches unscoped packages (`expo[^/]*`,
  `react-native[^/]*`) so RN/Expo deps shipping untranspiled Flow/ESM are transformed.
- **`jest.setup.js` mocks** the native-only modules so tests run in a node container:
  `expo-secure-store` (in-memory), `expo-camera`, `expo-router`, `expo-haptics`,
  `@expo/vector-icons` (Proxy → stub element — avoids expo-font's native `loadedNativeFonts`),
  `expo-font`, `expo-linear-gradient`, `react-native-safe-area-context` (static insets).
- **CI** (`.gitlab-ci.yml`): `typecheck` (tsc + version-lockstep) and `test` (jest + coverage)
  are **hard gates**; `deadcode` (knip) is report-only. Image bumped to `node:22-bookworm`
  (provides the `node:sqlite` builtin a toolchain dep needs); `@types/node` added so test files
  resolve node globals (`fs`/`path`/`global`).
- **Release-job fixes:** `auto-tag` now overrides the `alpine/git` entrypoint (`entrypoint: [""]`,
  the image's entrypoint is `git`, which broke the shell script) and **skips cleanly** (exit 0)
  when `GITLAB_PUSH_TOKEN` is unset. The EAS build jobs are **gated on `$EXPO_TOKEN`** (skip when
  absent) and `eas:android` is `allow_failure` (a per-commit cloud build shouldn't gate the test
  pipeline; the tag-driven `eas:release` stays a hard gate).
