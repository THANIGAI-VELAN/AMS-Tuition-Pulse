/**
 * Fast timeout wrapper for Promise-like / Supabase queries
 */
export const withTimeout = <T>(promiseLike: PromiseLike<T>, timeoutMs = 4000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}
