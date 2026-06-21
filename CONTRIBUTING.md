# Contributing to Nexora Mobile

Thanks for helping improve the Nexora phone client! It's an Expo (React Native + TypeScript) app
that pairs to a **self-hosted** Nexora / NexoraCloud instance — there's no Parendum backend.

## Ground rules

- Be respectful — see [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- Security issue? **Do not** open a public issue — see [`SECURITY.md`](SECURITY.md).

## Getting set up

> ⚠ **Never run `npm` on the host** (host npm is compromised per platform policy). Use `pnpm` /
> `pnpm dlx` only.

```bash
pnpm install
pnpm start        # Expo dev server (a dev build is needed for camera/QR)
pnpm tsc          # type-check
```

QR scanning needs a real device or a dev build. See the README for EAS build commands.

## Conventions

- TypeScript strict; path alias `@/*` → `src/*`.
- All network calls go through `src/lib/api.ts` — never hardcode a server URL (it comes from the
  paired session); WS URL via `wsUrlFor()`.
- Brand values come from `src/theme/tokens.ts` — no ad-hoc hex in components.
- Keep `VERSION`, `app.json` `expo.version`, and `package.json` `version` in lockstep (CI enforces it).

## Submitting changes

1. Branch off `main`.
2. Use [Conventional Commits](https://www.conventionalcommits.org): `feat(scope):`, `fix(scope):`, `chore:`.
3. Run `pnpm tsc` and the test suite (`pnpm test`) before opening the PR.
4. Open a PR describing *what* changed and *why*. Link any related issue.

Smaller, focused PRs merge faster.
