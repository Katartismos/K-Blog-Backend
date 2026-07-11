import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Custom environment variable helper.
 * Retrieves an environment variable from process.env.
 * If not found, it attempts to read the .env file in the workspace root,
 * extracts only the requested key to avoid loading unnecessary env vars,
 * validates its presence, and caches it in process.env.
 */
export function getRequiredEnv(key: string): string {
  // 1. Check if already present in process.env
  if (process.env[key]) {
    return process.env[key]!;
  }

  // 2. Attempt to parse from .env file directly for the specific key
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Find key-value boundary
        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex !== -1) {
          const currentKey = trimmed.substring(0, equalsIndex).trim();
          const currentValue = trimmed.substring(equalsIndex + 1).trim();

          if (currentKey === key) {
            // Strip optional wrapping quotes (single or double)
            let parsedValue = currentValue;
            if (
              (parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
              (parsedValue.startsWith("'") && parsedValue.endsWith("'"))
            ) {
              parsedValue = parsedValue.slice(1, -1);
            }

            // Confirm the parsed variable is not empty
            if (!parsedValue) {
              throw new Error(`Environment variable "${key}" is defined but is empty in the .env file.`);
            }

            // Cache it in process.env for subsequent calls
            process.env[key] = parsedValue;
            return parsedValue;
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('defined but is empty')) {
      throw error;
    }
    // Fall through if file doesn't exist or read fails
  }

  throw new Error(`Required environment variable "${key}" is not set in process.env or in the .env file.`);
}
