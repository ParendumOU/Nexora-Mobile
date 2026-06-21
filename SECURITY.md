# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Nexora Mobile, **please do not open a public issue.**

Instead, email **info@parendum.com** with:

- A description of the vulnerability and its impact.
- Steps to reproduce (proof-of-concept if possible).
- The affected version / commit.

We aim to acknowledge reports within **72 hours** and to provide a remediation timeline after
triage. We will credit reporters who wish to be named once a fix is released.

## Supported versions

Security fixes target the latest tagged release on `main`. Please upgrade before reporting.

## Notes on this app

- The app stores a per-device `nxd_` secret in the **OS keychain** (`expo-secure-store`), never
  in plain storage. No password is typed on the device.
- Each device token is individually revocable from web **Settings → Devices** or the phone's
  **Unlink** — without logging out your web/CLI sessions.
- The app connects only to the **self-hosted instance you pair with**; there is no Parendum
  backend. Use a trusted network (LAN/VPN) or a properly TLS-terminated public endpoint.
