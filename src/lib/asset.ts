const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Resolves a path inside /public to a URL that works under a GitHub Pages basePath. */
export const asset = (path: string): string => `${BASE_PATH}${path}`;
