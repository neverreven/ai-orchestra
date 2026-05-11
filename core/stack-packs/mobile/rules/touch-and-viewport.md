# Touch targets and viewport

## When this applies

Apply when working on UI code that will render on mobile screens — components, stylesheets, layout primitives, and any responsive logic. Adapter glob: `**/*.{jsx,tsx,vue,svelte,dart,xml,swift,kt}` plus `**/*.{css,scss,sass,less}` files and layout XML files under `android/` or `ios/`.

The agent should consult this file when creating or reviewing any interactive element that users will tap, swipe, or scroll on a touch device.

## Patterns to follow

- **Minimum tap target: 48x48dp (Android) / 44x44pt (iOS).** Interactive elements must meet the platform's minimum. CSS: `min-height: 44px; min-width: 44px` at a minimum; prefer 48px for comfortable use.
- **Adequate spacing between adjacent targets.** 8px minimum gap between tappable elements; 12px preferred. Accidental taps on the wrong target are the most common mobile UX failure.
- **Safe area respect.** Use `env(safe-area-inset-top)` / `bottom` / `left` / `right` (CSS) or platform-native safe-area APIs (SwiftUI `safeAreaInset`, Jetpack Compose `WindowInsets`). Content must not render behind notches, dynamic islands, or system bars.
- **Viewport meta for WebView apps.** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Never set `maximum-scale=1` or `user-scalable=no` — these break accessibility zoom.
- **`pointer: coarse` media query for touch-specific styles.** `@media (pointer: coarse) { ... }` is more reliable than screen-width breakpoints for detecting touch devices.
- **Scroll containers use `-webkit-overflow-scrolling: touch` where needed.** On older WebViews this enables momentum scrolling. Modern WebViews handle it natively, but the property is harmless.
- **Pull-to-refresh areas avoid conflicting scroll.** The pull-to-refresh gesture must not compete with horizontal swipes or nested scroll views. Use `overscroll-behavior-y: contain` on inner scrollers.
- **Text size minimum 16px for body text.** Mobile screens are read at arm's length. Anything smaller requires squinting or zoom.
- **Input fields use `font-size: 16px` or larger** to prevent iOS Safari from auto-zooming on focus.
- **Touch feedback is immediate.** Every tappable element shows a visual state change within 100ms (`:active` state, ripple effect, or opacity change). Users need confirmation their tap registered.

## Anti-patterns to avoid

- **Hover-only interactions.** Touch devices have no hover. Never gate important UI behaviour behind `:hover` without a tap fallback.
- **Tiny close buttons or dismiss targets.** Modal dismiss buttons, toast close icons, and "X" buttons often fail the 44px minimum. Enlarge the tap area with padding, not visual size.
- **Fixed-position elements that overlap the keyboard.** When the virtual keyboard opens, fixed-bottom elements can cover the input the user is typing in. Use `visualViewport` resize events or platform keyboard APIs to reposition.
- **`100vh` as full-screen height on mobile.** Mobile browsers have dynamic toolbars that change the viewport height. Use `100dvh` (dynamic viewport height) or JavaScript `visualViewport.height`.
- **Horizontal scroll on the main content axis.** Mobile users expect vertical scroll. Horizontal scroll is acceptable only inside explicit carousel or tabbed containers, never on the page body.
- **Disabling pinch-to-zoom.** `user-scalable=no` or `maximum-scale=1` in the viewport meta is an accessibility violation. Exception: canvas-based drawing tools where zoom conflicts with the gesture.

## When to deviate

- **Canvas or drawing surfaces.** Drawing tools, map views, and game canvases legitimately capture all touch events and may need to suppress default scroll/zoom. Isolate with `touch-action: none` only on the canvas element.
- **Kiosk or embedded displays.** Devices with no physical home button or notch (retail kiosks, car infotainment) can skip safe-area handling if the display surface is known.
- **Tablets in landscape.** Large-format tablets in landscape mode behave more like desktops — 44px targets are still correct, but spacing rules can relax slightly.

## References

- [Android Material Design — Touch targets](https://m3.material.io/foundations/accessible-design/accessibility-basics#28032e45-c598-450c-b355-f9fe737b1571).
- [Apple HIG — Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices).
- [Web.dev — Accessible tap targets](https://web.dev/accessible-tap-targets/).
- [`offline-and-sync.md`](offline-and-sync.md) — pull-to-refresh patterns that interact with scroll.
- [`../../../skills/quality/accessibility-audit/SKILL.md`](../../../skills/quality/accessibility-audit/SKILL.md) — universal accessibility audit; mobile-specific addenda in [`../skills.md`](../skills.md).
