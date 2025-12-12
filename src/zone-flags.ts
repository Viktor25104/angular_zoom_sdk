/**
 * Minimal Zone.js adjustments required by the Zoom Web SDK to avoid performance pitfalls.
 * requestAnimationFrame patching is disabled and message events remain unpatched.
 */
(window as any).__Zone_disable_requestAnimationFrame = true;
(window as any).__zone_symbol__UNPATCHED_EVENTS = ['message'];
