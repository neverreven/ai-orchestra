# Error handling

## When this applies

Apply when writing or reviewing error handling in Rust code. Adapter glob: `**/*.rs`. Consult alongside `ownership-and-borrowing.md` (error types carry context, which has ownership implications).

## Patterns to follow

### The `?` operator

- **`?` is the primary error-propagation mechanism.** It replaces `match result { Ok(v) => v, Err(e) => return Err(e.into()) }` with a single character. Use it everywhere. Manual `match` on `Result` is only warranted when you need to handle the error case differently from propagation.
- **`?` calls `.into()` automatically.** Define `From<SourceError> for TargetError` implementations (or derive them with `thiserror`) to make `?` chain across error types without explicit conversion.
- **`?` in `main()`.** `fn main() -> Result<(), Box<dyn Error>>` or `fn main() -> anyhow::Result<()>` lets you use `?` in `main`. Use this for CLI tools and scripts; for library crates, define a concrete error type.

### Error types

- **Library crates: `thiserror` for typed errors.** Define an `enum` with `#[derive(thiserror::Error)]`. Each variant describes a specific failure mode. Callers can match on variants and handle them individually.
  ```rust
  #[derive(Debug, thiserror::Error)]
  pub enum AppError {
      #[error("database query failed: {0}")]
      Database(#[from] sqlx::Error),
      #[error("file not found: {path}")]
      FileNotFound { path: PathBuf },
      #[error("unauthorized")]
      Unauthorized,
  }
  ```
- **Application crates / top-level: `anyhow` for convenience.** `anyhow::Result<T>` is `Result<T, anyhow::Error>`. It erases the error type but preserves the chain via `.context("what was happening")`. Use it in `main()`, CLI handlers, and test code where you don't need pattern-matching on error variants.
- **Never mix `anyhow` in library public APIs.** `anyhow::Error` is opaque — callers cannot inspect it. Library crates should expose `thiserror`-derived enums. Use `anyhow` internally for quick prototyping, then replace with `thiserror` before releasing.
- **One error enum per module or crate, not per function.** An error enum that maps 1:1 to a single function's failure modes is over-granular. Group errors by domain (e.g., `AuthError`, `StorageError`, `ConfigError`).

### Context

- **`.context()` / `.with_context()` on every `?` propagation in application code.** Bare `?` produces an error chain with no context — the user sees `"connection refused"` with no clue which connection. Add context: `fs::read_to_string(&path).with_context(|| format!("reading config from {}", path.display()))?;`
- **Context is a sentence fragment, not a sentence.** "reading config from /etc/app.toml" — not "Error: could not read config". The error chain constructs the full message; each layer adds one clause.

### Panics

- **Panics are for unrecoverable logic errors, not for runtime failures.** A failed network request is not a panic. An impossible enum variant in a `match` (where the compiler proves it's unreachable) is an acceptable panic via `unreachable!()`.
- **No `.unwrap()` in library code.** Use `expect("reason")` in application code when a panic is genuinely the correct response (e.g., `Mutex::lock().expect("lock poisoned — unrecoverable")`). In library code, propagate the error to the caller.
- **`expect` over `unwrap`.** Both panic, but `expect` includes a message that explains *why the panic should be impossible* or what invariant was violated. This message is the first thing a debugger reads.
- **`#[cfg(test)]` code may use `.unwrap()` freely.** Test code that panics gives a clear test failure. No need for verbose error propagation in tests.

### `Option` as error

- **`Option::None` is not an error — it's absence.** Use `Result` for failures; use `Option` for "might not exist". Converting between them: `.ok_or(MyError::NotFound)?` or `.ok_or_else(|| ...)?`.
- **Avoid `Option<Result<T, E>>`.** This double-wrapping is almost always a design smell. The function either returns a value, returns nothing, or fails — model it as `Result<Option<T>, E>` or flatten.

## Anti-patterns to avoid

- **`Box<dyn Error>` in public library APIs.** It erases the error type and prevents callers from pattern-matching. Use `thiserror`-derived enums for public APIs.
- **`.unwrap()` on user input or I/O operations.** These fail at runtime and panic with no context. Use `?` with `.context()`.
- **Catching panics to simulate error handling (`std::panic::catch_unwind`).** This is for FFI boundaries and thread pool executors, not for application logic. If you need to recover, use `Result`.
- **`String` as an error type.** `Err("something went wrong".to_string())` is the weakest possible error — no type discrimination, no structured context, no chain. Use an enum or `anyhow`.
- **Silently dropping errors with `let _ = result;`.** If you genuinely don't care about the error (rare), add a comment explaining why. Otherwise, log it or propagate it.

## References

- `ownership-and-borrowing.md` — error context has ownership implications
- `async-tokio.md` — async error patterns (spawn error boundaries, `JoinHandle` errors)
