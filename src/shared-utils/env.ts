export const isDevEnvironment = () => {
  try {
    const meta = import.meta as unknown as { env?: { DEV?: boolean } };
    if (typeof meta?.env?.DEV === 'boolean') {
      return meta.env.DEV;
    }
  } catch {
    // fall back to process env
  }
  return process.env.NODE_ENV !== 'production';
};
