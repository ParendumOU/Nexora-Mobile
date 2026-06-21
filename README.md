<div align="center">

<img src=".github/logo.png" alt="Nexora" width="110">

# Nexora Mobile

**Native iOS + Android client for self-hosted [Nexora](https://github.com/ParendumOU/Nexora)
workspaces.** Built with Expo (React Native + TypeScript). Telegram-style fluid chat UI
matching Nexora's official dark-first branding.

![Release](https://img.shields.io/github/v/release/ParendumOU/Nexora-Mobile?sort=semver&color=8b5cf6&style=flat-square)
![License](https://img.shields.io/github/license/ParendumOU/Nexora-Mobile?color=6366f1&style=flat-square)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-6366f1?style=flat-square)
![Stars](https://img.shields.io/github/stars/ParendumOU/Nexora-Mobile?style=social)

![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo&logoColor=white&style=flat-square)
![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react&logoColor=black&style=flat-square)
![Platforms](https://img.shields.io/badge/platforms-iOS%20·%20Android-6366f1?style=flat-square)

<video src="https://nexora.parendum.com/NexoraLandscape.mp4" controls muted loop playsinline width="720"></video>

**[🌐 Website](https://nexora.parendum.com) · [📖 Docs](https://docs.nexora.parendum.com) · [🧩 Marketplace](https://marketplace.nexora.parendum.com)**

</div>

The app connects to **your own** Nexora instance (LAN or VPN). It is linked to a workspace
by scanning a pairing QR code shown in the Nexora web settings — no passwords are typed on
the device, and each device gets its own revocable token.

### Why use it?

- **📱 Your agents in your pocket.** Chat with self-hosted Nexora agents, with live streaming replies.
- **🔐 No password on the device.** QR-pair once; each phone holds its own revocable token in the OS keychain.
- **🏠 Points at *your* server.** No Parendum backend — your data never leaves your infra.
- **🎨 Native, dark-first UI** matching the Nexora brand.

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

> Backend requirement: this app needs core migration **051_device_tokens** and the
> `/api/auth/device/*` endpoints (shipped in the [Nexora core repo](https://github.com/ParendumOU/Nexora)).
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

---

## Contributing

Issues and PRs welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) and
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Security reports: [`SECURITY.md`](SECURITY.md).

---

## License

[MIT](LICENSE) © Parendum OÜ

---

## ⭐ Like the app?

Drop a star — it helps others find Nexora Mobile. New to the platform? Start at
**[nexora.parendum.com](https://nexora.parendum.com)**.

---

## Star history

<a href="https://www.star-history.com/?repos=ParendumOU%2FNexora-Mobile&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=ParendumOU/Nexora-Mobile&type=date&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=ParendumOU/Nexora-Mobile&type=date&legend=top-left" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=ParendumOU/Nexora-Mobile&type=date&legend=top-left" />
  </picture>
</a>
