# Offline-first and sync patterns

## When this applies

Apply when working on data persistence, network communication, or state management in a mobile app that must function with intermittent or absent connectivity. Adapter glob: `**/*sync*`, `**/*offline*`, `**/*network*`, `**/*cache*`, `**/store/**`, `**/services/**`, plus any file importing network-status or connectivity plugins.

The agent should consult this file when implementing data flows that must survive loss of network connectivity, background app kills, or airplane mode.

## Patterns to follow

- **Offline is the default state.** Design data access as local-first: read from the local store, display immediately, then sync with the server in the background. Never gate UI rendering on a network response unless the data genuinely cannot be cached (e.g., real-time stock prices).
- **Network-status gating.** All remote operations check connectivity before firing. Use a central network context or provider (`@capacitor/network`, `NetInfo` in RN, `connectivity_plus` in Flutter). Queue operations when offline; flush when connectivity returns.
- **Optimistic UI with conflict resolution.** Show the user their change immediately; reconcile with the server asynchronously. When the server rejects or a conflict is detected, surface it clearly rather than silently discarding user work.
- **Pull-to-refresh for manual sync.** Users expect a gesture to force data refresh on mobile. Implement pull-to-refresh on primary list/feed screens. The gesture must only fire when scrolled to the top — never mid-scroll.
- **Background sync within platform limits.** Use WorkManager (Android) or BGAppRefreshTask (iOS) for periodic background sync. Respect the OS's battery-saving constraints — background tasks have a runtime budget (typically 30 seconds).
- **Persistent queue for outbound mutations.** Writes that happen offline go into a durable queue (IndexedDB, SQLite, Hive, SharedPreferences with serialized entries). The queue survives app restarts. On reconnect, drain the queue in order.
- **Idempotent server operations.** Every queued mutation must be safe to retry. Use client-generated UUIDs as idempotency keys. The server must handle duplicates gracefully.
- **Exponential backoff on retry.** Failed syncs retry with increasing delay (1s, 2s, 4s, 8s... capped at 5 min). Never retry in a tight loop — it drains battery and annoys rate limiters.
- **Sync status indicator.** Show the user whether they are viewing cached data, syncing, or fully up-to-date. A small icon or badge is sufficient; never block the UI for sync state.
- **Conflict-archive for safety.** When last-write-wins discards a version, archive the losing version locally so the user can recover if they notice data loss later.

## Anti-patterns to avoid

- **Blocking app launch on network.** Showing a spinner until the first API call completes makes the app unusable offline. Load cached state immediately; fetch fresh data in the background.
- **Unbounded retry loops.** Retrying indefinitely without backoff or a maximum attempt count drains battery and fills logs with noise.
- **Storing sync state only in memory.** If the app is killed during sync, in-memory state is lost. The queue and sync metadata must be persisted.
- **Ignoring partial failures.** A batch sync where item 3 of 10 fails should not discard items 1-2 and 4-10. Process each independently; surface the failure for item 3 alone.
- **Auto-resolving conflicts silently.** Last-write-wins is acceptable as a default strategy, but the user must be informed when their data was overwritten. A toast or conflict banner prevents invisible data loss.
- **Large payloads over mobile networks.** Sync payloads should be delta-based where possible. Sending the entire dataset on every sync wastes bandwidth and drains battery.

## When to deviate

- **Real-time collaborative apps.** Apps with multi-user real-time editing (Google Docs-style) need CRDTs or OT rather than queue-and-sync. The offline queue still applies for the local buffer, but conflict resolution is fundamentally different.
- **Streaming media apps.** Video/audio streaming cannot be offline-first in the traditional sense. Cache what is cacheable (metadata, thumbnails, downloaded episodes); accept that playback requires connectivity unless pre-downloaded.
- **Ephemeral data that expires.** Chat message read-receipts, live location shares, or typing indicators do not need offline queuing — they are meaningless by the time connectivity returns.

## References

- [Google — Build offline-first apps (Android)](https://developer.android.com/topic/architecture/data-layer/offline-first).
- [Apple — Designing for offline use](https://developer.apple.com/documentation/foundation/url_loading_system).
- [Capacitor Network plugin](https://capacitorjs.com/docs/apis/network).
- [`native-plugin-lifecycle.md`](native-plugin-lifecycle.md) — app-state lifecycle interactions with sync (pause/resume).
- [`touch-and-viewport.md`](touch-and-viewport.md) — pull-to-refresh interaction with scroll containers.
- [`../../../skills/quality/performance-audit/SKILL.md`](../../../skills/quality/performance-audit/SKILL.md) — universal performance audit; mobile-specific addenda in [`../skills.md`](../skills.md).
