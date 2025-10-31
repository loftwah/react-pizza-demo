import { features } from '../src/config/features';

const now = Date.now();
let exitCode = 0;

for (const [name, feature] of Object.entries(features)) {
  const expiresAt = Date.parse(`${feature.expiresAt}T00:00:00Z`);

  if (Number.isNaN(expiresAt)) {
    console.warn(
      `Flag "${name}" has an invalid expiresAt value (${feature.expiresAt}).`,
    );
    continue;
  }

  if (expiresAt < now) {
    console.error(
      `Flag expired: ${name} (owner: ${feature.owner}, reason: ${feature.reason}).`,
    );
    exitCode = 1;
  }
}

process.exit(exitCode);
