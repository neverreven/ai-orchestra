# Async Rust — Tokio patterns

## When this applies

Apply when working with async Rust code using Tokio as the runtime. Adapter glob: `**/*.rs` files containing `async fn`, `tokio::`, `.await`, or `#[tokio::main]`. Most async Rust in production uses Tokio; the patterns also apply to `async-std` and `smol` with minor API differences.

## Patterns to follow

### Spawning

- **`tokio::spawn` for concurrent, independent tasks.** A spawned task runs on the Tokio runtime's thread pool. It must be `Send + 'static` — meaning it owns all its data (no borrowed references). Use `Arc` to share state between the spawner and the spawned task.
- **`tokio::task::spawn_blocking` for CPU-bound or blocking I/O.** File system operations via `std::fs`, DNS resolution, CPU-heavy computation, and synchronous C library calls block the async runtime's thread. Offload them with `spawn_blocking`. The returned `JoinHandle` is an async future — `.await` it to get the result back into async land.
- **`tokio::task::JoinSet` for managing a group of tasks.** When spawning N concurrent tasks and collecting their results, `JoinSet` is cleaner than a `Vec<JoinHandle>` — it provides `join_next()` iteration, cancellation on drop, and backpressure.
- **Limit concurrency with `Semaphore`.** `tokio::sync::Semaphore` controls how many tasks run concurrently. Use it for rate-limited API calls, connection pools, and resource-constrained workloads. `let _permit = semaphore.acquire().await?;` at the top of each task.

### Cancellation

- **Dropping a `JoinHandle` does NOT cancel the task.** The task keeps running. To cancel, call `handle.abort()` or use structured concurrency via `JoinSet` / `tokio::select!`.
- **`tokio::select!` for racing futures.** The first branch to complete wins; the others are dropped (cancelled). Use for timeout patterns and graceful shutdown.
  ```rust
  tokio::select! {
      result = do_work() => handle_result(result),
      _ = tokio::signal::ctrl_c() => { println!("shutting down"); }
  }
  ```
- **Cancellation safety.** Not all futures are cancellation-safe. A future that has performed half a write and is cancelled mid-operation leaves the resource in an inconsistent state. The Tokio docs mark each async method's cancellation safety. For `select!` branches that modify state, use `tokio::pin!` and loop to retry rather than silently losing partial work.
- **Graceful shutdown: `CancellationToken`.** `tokio_util::sync::CancellationToken` is the standard pattern. Create one, clone it into every task. When shutdown begins, call `token.cancel()`. Each task checks `token.cancelled().await` or uses it in a `select!` branch.

### Channels

- **`mpsc` for fan-in (many producers, one consumer).** `tokio::sync::mpsc::channel(capacity)` for bounded (backpressure); `unbounded_channel()` only when you've proven the producer can't outrun the consumer.
- **`oneshot` for single-value responses.** Request-reply pattern: send a `oneshot::Sender` with the request; the handler sends the reply back.
- **`broadcast` for fan-out (one producer, many consumers).** Each consumer gets a clone of every message. Use for event distribution, not for work queues.
- **`watch` for latest-value notification.** One writer, many readers. Readers always see the latest value; intermediate values are skipped. Ideal for configuration updates and health-status signals.

### Blocking

- **Never block the async runtime.** `std::thread::sleep`, `Mutex::lock` (from `std`), and synchronous I/O block the current Tokio worker thread, starving all other tasks on that thread. Use `tokio::time::sleep`, `tokio::sync::Mutex`, and async I/O alternatives.
- **`tokio::sync::Mutex` is async-aware but expensive.** It allows `.await` inside the critical section (which `std::Mutex` cannot). But if the critical section is short and non-async, `std::sync::Mutex` in a `spawn_blocking` or a short synchronous block is often faster — `tokio::sync::Mutex` has higher overhead per lock/unlock.
- **Rule of thumb: lock held across `.await` → `tokio::sync::Mutex`. Lock held for a few microseconds with no `.await` → `std::sync::Mutex`.** The Tokio docs make this recommendation explicitly.

### Timeouts

- **`tokio::time::timeout` on every external I/O.** HTTP requests, database queries, and channel receives should always have a timeout. A hanging I/O without a timeout is a resource leak that eventually exhausts the runtime's capacity.
  ```rust
  let result = tokio::time::timeout(Duration::from_secs(30), client.get(url).send()).await;
  ```
- **`tokio::time::sleep` for delays, not `std::thread::sleep`.** The async version yields to the runtime; the std version blocks the thread.

### Testing

- **`#[tokio::test]` for async tests.** Spins up a single-threaded Tokio runtime per test. Use `#[tokio::test(flavor = "multi_thread")]` only when the test requires true concurrency.
- **`tokio::time::pause()` for deterministic time tests.** Pauses the runtime clock; `tokio::time::advance(Duration)` moves it forward without real delay.

## Anti-patterns to avoid

- **`.await`-ing inside a `std::sync::Mutex` guard scope.** The guard is not `Send`; holding it across an `.await` point is a compile error in recent Rust. Even if it compiles (older patterns), it blocks the thread.
- **`tokio::spawn` without handling the `JoinError`.** The `JoinHandle` can return `Err(JoinError)` if the task panicked or was cancelled. Ignoring it hides panics. `.await` the handle and handle the error.
- **Unbounded channels for work queues.** An unbounded `mpsc` with a fast producer and slow consumer grows memory without limit. Use bounded channels and handle the `SendError` (backpressure).
- **`block_on` inside an async context.** `tokio::runtime::Handle::current().block_on(future)` from inside a `#[tokio::main]` function deadlocks the runtime. Use `.await` instead. `block_on` is for synchronous entry points that need to run a single async operation.
- **Creating multiple Tokio runtimes.** One runtime per process. Creating a second runtime (often accidentally in tests or library init code) wastes threads and can deadlock if the runtimes share resources.

## References

- `ownership-and-borrowing.md` — `Send + 'static` bounds on spawned tasks are ownership constraints
- `error-handling.md` — async error patterns (`JoinError`, context on `.await?`)
- `tauri.md` — Tauri commands are async by default; Tokio patterns apply
