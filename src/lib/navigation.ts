export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Absolute app path including the deployment basePath.
 * `next/link` adds basePath itself; router.push/replace does not, so use this there.
 */
export const withBase = (path: string): string => `${BASE_PATH}${path}`;
