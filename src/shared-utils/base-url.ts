const ensureTrailingSlash = (value: string) =>
  value.endsWith('/') ? value : `${value}/`;

const getViteBaseUrl = () => {
  try {
    const meta = import.meta as unknown as {
      env?: { BASE_URL?: string };
    };
    return meta?.env?.BASE_URL ?? undefined;
  } catch {
    return undefined;
  }
};

export const getBaseUrl = () => {
  const viteBase = getViteBaseUrl();
  if (viteBase) {
    return ensureTrailingSlash(viteBase);
  }

  const envBase =
    typeof process !== 'undefined' && process?.env
      ? process.env.PUBLIC_BASE_URL
      : undefined;
  if (envBase) {
    return ensureTrailingSlash(envBase);
  }

  return '/';
};
