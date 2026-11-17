export class ApiError extends Error {
  code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** Simulates a network round trip so loading states are real during the demo. */
export const latency = (ms = 260): Promise<void> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    setTimeout(resolve, ms + Math.random() * 160);
  });
