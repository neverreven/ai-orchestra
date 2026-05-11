# Ownership, borrowing, and lifetimes

## When this applies

Apply when writing or reviewing any Rust code. Adapter glob: `**/*.rs`. These are foundational patterns — every other Rust rule file assumes the developer understands the principles here.

## Patterns to follow

### Ownership

- **Move by default; clone by exception.** Rust moves values by default. Accept the move and restructure code to accommodate it. Reach for `.clone()` only when a value genuinely needs to exist in two places and the cost is acceptable. Document the clone reason with a brief comment when it's non-obvious.
- **Own data at the scope that controls its lifetime.** If a function creates a `String` and needs it for the remainder of a block, it should own it — not borrow it from a temporary. If it passes it down, transfer ownership rather than lending a borrow that outlives the callee's need.
- **Return owned types from constructors.** `fn new() -> Self`, not `fn new() -> &Self`. The caller decides what to do with the owned value (store it, Box it, Arc it).
- **Accept the most general input type.** Prefer `&str` over `&String`, `&[T]` over `&Vec<T>`, `impl AsRef<Path>` over `&PathBuf`. This lets callers pass more types without conversion.

### Borrowing

- **Borrow for read-only access.** Pass `&T` to functions that only need to inspect the data. Mutable borrows (`&mut T`) only when the function genuinely mutates.
- **One `&mut` OR many `&` — enforce it at the API level.** Rust's borrow checker enforces this at compile time, but API design should make the intent clear. A method that takes `&mut self` when it only reads is misleading and prevents concurrent borrows.
- **Avoid borrow-splitting headaches.** When you need two fields of a struct simultaneously — one mutable, one not — split the struct into sub-structs, use separate methods that borrow only their own field, or use `std::cell::RefCell` / interior mutability patterns. Fighting the borrow checker with `unsafe` to work around this is almost never justified.
- **Reborrow before moving.** When a function takes `&T` but you have `T`, pass `&value` rather than moving `value`. This preserves your ownership for later use.

### Lifetimes

- **Let elision work.** Most lifetime annotations are unnecessary — the compiler's elision rules handle `&self` → `&T` returns and single-input-single-output patterns. Write explicit lifetimes only when the compiler asks or when the annotation conveys semantic intent to the reader.
- **Named lifetimes for clarity at public API boundaries.** When a public function returns a borrow tied to a specific input, name the lifetime even if elision would suffice: `fn get<'a>(&'a self) -> &'a str`. The name documents the relationship.
- **`'static` means "lives forever", not "is immutable".** A `&'static str` is a string literal or a leaked allocation. `T: 'static` means `T` owns all its data (no borrowed references shorter than `'static`). These are different concepts; use them precisely.
- **Avoid `'static` bounds on generic parameters unless needed for spawning.** `tokio::spawn` requires `'static` because the task may outlive the caller. For synchronous code, most `T: 'static` bounds are unnecessary constraints.

### Interior mutability

- **`Cell<T>` for `Copy` types.** Zero-cost interior mutability. Use for counters, flags, and small state machines inside `&self` methods.
- **`RefCell<T>` when mutation is infrequent and bounded.** Runtime borrow checking. Panics on double-`borrow_mut`. Acceptable inside single-threaded code; never across threads.
- **`Mutex<T>` / `RwLock<T>` for thread-safe interior mutability.** Use `RwLock` when reads vastly outnumber writes. Use `Mutex` when the critical section is short. Always scope the lock guard to the smallest possible block to avoid deadlocks.
- **`Arc<Mutex<T>>` is the shared-mutable-state pattern.** It's the Rust equivalent of a thread-safe reference-counted pointer. Use it; don't fight it. But question whether shared mutable state is the right design — channels (`mpsc`) are often cleaner.

## Anti-patterns to avoid

- **`.clone()` to silence the borrow checker.** Cloning hides ownership design problems. If you're cloning to make the code compile, the ownership model is wrong — restructure first, clone only if the restructure proves impractical.
- **`Rc<RefCell<T>>` when `Arc<Mutex<T>>` is needed (or vice versa).** `Rc` is single-threaded; `Arc` is thread-safe. Mixing them up is a compile error in some cases and a subtle bug in others (especially across async tasks).
- **Leaking memory with `Box::leak` or `std::mem::forget` to get `'static`.** These are last-resort tools. If you need a `'static` reference, consider `lazy_static!` / `std::sync::OnceLock` or restructure the ownership.
- **`unsafe` to bypass the borrow checker.** `unsafe` is for FFI, performance-critical intrinsics, and low-level data structure internals. It is not a "the borrow checker is being annoying" escape hatch.
- **Deeply nested generic type signatures.** `HashMap<String, Vec<Arc<Mutex<Option<Box<dyn Trait>>>>>>` is a sign the data model needs simplification. Introduce type aliases or newtypes.

## References

- `error-handling.md` — error types interact with ownership (moving vs borrowing error context)
- `async-tokio.md` — async tasks require `'static` bounds, which affects ownership design
