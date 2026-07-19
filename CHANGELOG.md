# Changelog

All notable changes to the Nexora mobile app. The CI `release:` job extracts the
section matching the pushed tag and publishes it as the GitLab Release description,
which the Gateway then surfaces on https://nexora.parendum.com/changelog.

Format: one `## <version>` heading per release, newest first.

## 0.1.2

- Security fix: send WebSocket auth token via subprotocol, not URL query string
- Brand refresh: app icon updated to new Nexora network-N mark
- Documentation: GitHub publish CI, README polish, contributing guidelines

## 0.1.1

- Public release on GitHub ([ParendumOU/Nexora-Mobile](https://github.com/ParendumOU/Nexora-Mobile)).
- README refresh: GitHub links, correct backend migration reference (`051_device_tokens`).

## 0.1.0

First release — native iOS & Android client for a self-hosted Nexora / Nexora Cloud instance.

- QR device pairing from the web Settings → Devices (no password on the phone; per-device revocable token)
- Real-time chat with WebSocket streaming, Markdown, tool-result cards and reasoning blocks
- No agent selection required — routes to the workspace's default provider/agent
- In-chat Tasks / Plan / Notes / Agents (live sub-agent hierarchy) panels
- Stop generation, sub-agent activity strip, brand-matched dark UI
- Auto device-token refresh; internal/system messages hidden like the web app
