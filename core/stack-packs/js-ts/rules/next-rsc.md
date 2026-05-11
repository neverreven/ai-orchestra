# Next.js — React Server Components and App Router

## When this applies

Apply when working in a Next.js project using the App Router (`app/` directory) with React Server Components (RSC). Adapter glob: `app/**/*.{js,jsx,ts,tsx}`. Consult alongside `react.md` and `typescript.md`; this file covers RSC-specific constraints only.

## Patterns to follow

- **Default to Server Components.** Every component in `app/` is a Server Component unless it declares `"use client"` at the top. Keep the server boundary at the outermost leaf that actually needs interactivity.
- **`"use client"` is a boundary declaration, not a flag.** When a file declares `"use client"`, every module it imports also becomes client code (transitively). Keep client entry points small. Move data access and heavy logic above the boundary.
- **Data fetching belongs in Server Components.** Fetch in `async` Server Components and pass data as props. Avoid `useEffect` + `fetch` in client components when the same data could be fetched on the server.
- **`async/await` in Server Components.** Server Components can be `async` functions. `await` directly in the component body is idiomatic; no need for custom hooks or state.
- **Server Actions for mutations.** Use `"use server"` actions for form submissions and data mutations. Declare them in a separate file or at the top of a Server Component, not inside a Client Component.
- **`cache()` + React cache for deduplication.** When multiple components independently fetch the same data in the same render pass, wrap the fetch in `cache()` (React) or `unstable_cache` (Next.js). Deduplication is automatic; do not manually thread a result through props just to avoid a second fetch.
- **Keep `page.tsx` / `layout.tsx` thin.** These files are routing entrypoints, not business logic containers. Compose smaller Server and Client components; do not let them grow beyond ~60 lines.
- **`loading.tsx` and `error.tsx` at every significant route segment.** Streaming and error isolation are only active when these files exist. Ship them alongside every route segment that fetches data.
- **Static vs. dynamic rendering.** Understand when a route is statically rendered (build time) vs. dynamically rendered (per-request). `cookies()`, `headers()`, `searchParams` force dynamic. `fetch()` with `{ cache: 'force-cache' }` stays static. Make this choice intentionally, not by accident.
- **Colocation in `app/`.** Route-specific components, types, and tests live beside the `page.tsx` they serve. Only truly shared components belong in `components/`.

## Anti-patterns to avoid

- **`"use client"` at the root layout.** This sends the entire component tree to the client and eliminates RSC benefits. `layout.tsx` should only be a Client Component if absolutely unavoidable.
- **Importing Server Components from Client Components.** Server Components cannot be rendered inside Client Components via import — they can only be passed as `children` props. Violating this causes a build error.
- **Fetching in `useEffect` inside a page component.** For data that is available at render time, fetch on the server. `useEffect` introduces a loading flash and a round-trip that RSC eliminates.
- **Prop-drilling data through 3+ client boundaries.** Once data crosses a `"use client"` boundary it is serialised as JSON. If the same data is needed deep in the tree, re-fetch it in the nearest Server Component ancestor rather than tunnelling props.
- **Mutating database state in a Server Component.** Server Components render during reads. Side-effecting writes belong in Server Actions.
- **Using `useRouter` for redirects after Server Actions.** Call `redirect()` (from `next/navigation`) directly in the Server Action instead.
- **`cookies()` / `headers()` at module scope.** These are per-request APIs. Calling them at module scope (outside a component or action) caches the first request's values and breaks subsequent renders. Call them inside the component function body.

## References

- `react.md` — base React patterns (apply alongside this file)
- `typescript.md` — TypeScript standards
- Next.js App Router docs: https://nextjs.org/docs/app
