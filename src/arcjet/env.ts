/**
 * Custom environment variable helper.
 * Retrieves an environment variable from process.env.
 * Throws a clear runtime error if the requested variable is missing or empty.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable "${key}" is not set or is empty.`);
  }

  return value.trim();
}

