const submitAttempts = new Map<string, number[]>();
const rateLimitWindowMs = 10 * 60 * 1000;
const maxAttempts = 5;

export function checkRateLimit(key: string) {
  const now = Date.now();
  const attempts = (submitAttempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < rateLimitWindowMs,
  );

  if (attempts.length >= maxAttempts) {
    submitAttempts.set(key, attempts);
    throw new Error("Too many submissions. Please try again later.");
  }

  submitAttempts.set(key, [...attempts, now]);
}
