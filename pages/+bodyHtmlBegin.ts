/** Inline script injected at the very start of `<body>` (vike-react setting).
 *
 * It applies the dark/light theme classes before the first paint. The
 * `DarkModeProvider` in `+Layout.ts` applies the same classes in an effect
 * after hydration; without this script, a hard reload in dark mode paints a
 * light page first and then flashes to dark.
 *
 * Keep the logic in step with `DarkModeProvider` (@macrostrat/ui-components):
 * same storage key, same JSON shape, same class names.
 */

/** Must match `DarkModeProvider({ followSystem })` in `+Layout.ts`. */
const FOLLOW_SYSTEM = true;

function applyThemeBeforePaint(followSystem: boolean) {
  let dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (!followSystem) {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem("ui-dark-mode") ?? "null"
      );
      if (stored != null && !stored.isAutoset) dark = !!stored.isEnabled;
    } catch (err) {
      // Unreadable storage: fall back to the system preference
    }
  }
  let classes = ["bp6-light", "light-mode"];
  if (dark) classes = ["dark-mode", "bp6-dark"];
  document.body.classList.add(...classes);
}

export default `<script>(${applyThemeBeforePaint.toString()})(${FOLLOW_SYSTEM})</script>`;
