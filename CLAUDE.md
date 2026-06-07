# Nexora Mobile — Repository Guide

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

## 11. CI

`.gitlab-ci.yml` — `validate` (tsc on MR/main/tag) + `build`. Push to `main` → `eas:android`
(APK, `preview`). Tag → `eas:release` (AAB, `production`). `eas:ios` is manual. Requires a
masked CI/CD variable **`EXPO_TOKEN`** (Settings → CI/CD → Variables). Runners use pnpm via
corepack (CI is a clean ephemeral container — the host-npm rule doesn't apply there).
