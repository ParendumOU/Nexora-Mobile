# Nexora Mobile

Native iOS + Android client for self-hosted [Nexora](../Nexora) workspaces. Built with
Expo (React Native + TypeScript). Telegram-style fluid chat UI matching Nexora's official
dark-first branding.

The app connects to **your own** Nexora instance (LAN or VPN). It is linked to a workspace
by scanning a pairing QR code shown in the Nexora web settings — no passwords are typed on
the device, and each device gets its own revocable token.

---

## How linking works

```
Web (Settings → Link device)            Mobile
  POST /api/auth/device/start    ─┐
  → { code }  (5-min, in Redis)   │  renders QR  { "url": <server>, "code": <code> }
                                  └────────────────────────►  scan QR
                                              POST /api/auth/device/pair { code, device_name, platform }
                                              ← { access_token, device_token (nxd_…), org_id, user }
  device stores nxd_ secret in the OS keychain (expo-secure-store)
  access JWT auto-refreshed via POST /api/auth/device/refresh
```

The access token is a standard Nexora JWT, so it works unchanged against every REST and
WebSocket endpoint. The `nxd_` device secret is per-device and individually revocable from
**Settings → Devices** on the web (or **Unlink** on the phone) — without logging out the
user's web/CLI sessions.

> Backend requirement: this app needs core migration **041_device_tokens** and the
> `/api/auth/device/*` endpoints (shipped in the Nexora core repo alongside this app).
> Run `docker compose exec backend alembic upgrade head` after pulling core.

---

## Project layout

```
app/                         expo-router file routes
  _layout.tsx                root: hydrate session, nav theme, splash
  index.tsx                  gate → /link or /(app)/chats
  link.tsx                   QR scan + manual pairing
  (app)/
    _layout.tsx              auth-guarded stack
    chats.tsx                conversation list + FAB
    chat/[id].tsx            streaming conversation + in-chat menu
    new.tsx                  agent picker → create chat
    settings.tsx             account, server, unlink
src/
  theme/tokens.ts            Nexora brand tokens (colors, radius, gradients)
  lib/
    api.ts                   fetch client w/ auto device-refresh, pairing calls
    useChat.ts               WebSocket streaming hook (reconnect, ping/pong)
    store.ts                 zustand state (session)
    secure.ts                expo-secure-store session persistence
    types.ts                 API + WS event shapes
  components/                Logo, Avatar, MessageBubble, ChatComposer,
                             ChatMenuSheet (Tasks/Plan/Notes/Agents), TypingDots
assets/                      brand icon, adaptive icon, splash (generated)
```

---

## Develop

> ⚠ **Never run `npm` on the host** (host npm is compromised per repo policy). Use `pnpm`
> for installs and run the dev server in your trusted environment.

```bash
pnpm install
pnpm start            # Expo dev server; open in Expo Go or a dev build
pnpm tsc              # type-check
```

QR scanning requires a real device or a dev build (camera is unavailable in Expo Go on
some platforms). Use `eas build --profile development` for a full dev client.

## Build

```bash
pnpm build:android    # eas build -p android
pnpm build:ios        # eas build -p ios
pnpm build:all
```

Set the bundle identifier / package (`com.parendum.nexora`) and signing in `app.json` /
EAS before a store build.

---

## Branding

Pulled from the Nexora web frontend (dark-first):

| Token | Value |
|-------|-------|
| Background | `#0a0a0f` |
| Primary (indigo) | `#6366f1` |
| Secondary (violet) | `#8b5cf6` |
| Brand gradient | 135° `#6366f1 → #8b5cf6` |
| Text | `#f8fafc` / muted `#94a3b8` |
| Radius | 8 / 12 / 16 / 20 |

Subtle hairline borders + indigo glow instead of heavy shadows, matching the web visual
language.
