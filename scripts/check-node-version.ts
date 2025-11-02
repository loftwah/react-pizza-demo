#!/usr/bin/env tsx

const REQUIRED_MAJOR = 24;

const actualMajor = Number.parseInt(
  process.version.slice(1).split('.')[0] ?? '',
  10,
);

if (Number.isNaN(actualMajor)) {
  console.error(
    `Unable to determine Node version from "${process.version}". Install Node ${REQUIRED_MAJOR}.x.`,
  );
  process.exit(1);
}

if (actualMajor !== REQUIRED_MAJOR) {
  console.error(
    `Node ${REQUIRED_MAJOR}.x required. Detected ${process.version}. Please switch versions before continuing.`,
  );
  process.exit(1);
}
