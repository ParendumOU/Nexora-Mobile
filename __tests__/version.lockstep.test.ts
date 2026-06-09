import fs from 'fs';
import path from 'path';

// Mirrors the CI `validate` rule: VERSION, app.json expo.version and
// package.json version MUST be identical. The release pipeline (auto-tag →
// eas:release → GitLab Release → Gateway ProductVersion) keys off VERSION, so a
// drift here ships a mislabelled build. Fail fast in the unit suite too.
const ROOT = path.resolve(__dirname, '..');

function read(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

describe('version lockstep', () => {
  const versionFile = read('VERSION').trim();
  const appJson = JSON.parse(read('app.json')) as { expo: { version: string } };
  const pkgJson = JSON.parse(read('package.json')) as { version: string };

  it('VERSION is a valid semver string', () => {
    expect(versionFile).toMatch(/^\d+\.\d+\.\d+([-+].+)?$/);
  });

  it('app.json expo.version matches VERSION', () => {
    expect(appJson.expo.version).toBe(versionFile);
  });

  it('package.json version matches VERSION', () => {
    expect(pkgJson.version).toBe(versionFile);
  });

  it('all three sources agree', () => {
    expect(new Set([versionFile, appJson.expo.version, pkgJson.version]).size).toBe(1);
  });
});
