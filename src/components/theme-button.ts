import {
  DarkModeButton,
  darkModeUpdater,
  useDarkMode,
} from "@macrostrat/ui-components";
import h from "./theme-button.module.sass";
import { Button, Icon } from "@blueprintjs/core";
import classNames from "classnames";

export function ThemeButton({ className, vertical = false }) {
  const darkMode = useDarkMode();
  const update = darkModeUpdater();
  const icon = darkMode.isAutoset ? "tick" : "desktop";

  const darkModeText = darkMode.isEnabled
    ? "Turn on the lights"
    : "Turn off the lights";
  return h(
    "div.dark-mode-controls",
    { className: classNames(className, { vertical }) },
    [
      h(DarkModeButton, { minimal: true, active: false, allowReset: true }, [
        h("span.text", darkModeText),
      ]),
      h(
        Button,
        {
          minimal: true,
          active: darkMode.isAutoset,
          icon: h(Icon, { icon, size: 12 }),
          intent: darkMode.isAutoset ? "success" : "primary",
          className: "auto-button sub-button",
          small: true,
          onClick(evt) {
            if (darkMode.isAutoset) return;
            evt.stopPropagation();
            update(null);
          },
        },

        "auto"
      ),
    ]
  );
}
