type Task<T> = () => Promise<T>

export async function concurrency<T>(
  tasks: Task<T>[],
  limit: number,
  onProgress?: (done: number, total: number) => void
) {
  if (limit <= 0) throw new Error('limit must be > 0')
  const results: T[] = new Array(tasks.length)
  let nextIndex = 0
  let done = 0

  async function worker() {
    while (true) {
      const current = nextIndex++
      if (current >= tasks.length) break
      results[current] = await tasks[current]()
      done++
      onProgress?.(done, tasks.length)
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    worker()
  )

  onProgress?.(done, tasks.length)
  await Promise.all(workers)
  return results
}
