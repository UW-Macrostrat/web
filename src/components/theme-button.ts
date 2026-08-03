import {
  DarkModeButton,
  darkModeUpdater,
  useDarkMode,
} from "@macrostrat/ui-components";
import h from "./theme-button.module.sass";
import { Button, Icon } from "@blueprintjs/core";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";

export function ThemeButton({ className, vertical = false }) {
  const darkMode = useDarkMode();
  const update = darkModeUpdater();

  /** The button reacts to Dark Mode only after the component is mounted to avoid hydration errors */
  const mounted = useIsMounted();
  const isEnabled = darkMode.isEnabled && mounted;
  const isAutoset = darkMode.isAutoset && mounted;

  const icon = isAutoset ? "tick" : "desktop";

  const darkModeText = isEnabled ? "Turn on the lights" : "Turn off the lights";
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
          active: isAutoset,
          icon: h(Icon, { icon, size: 12 }),
          intent: isAutoset ? "success" : "primary",
          className: "auto-button sub-button",
          small: true,
          onClick(evt) {
            if (isAutoset) return;
            evt.stopPropagation();
            update(null);
          },
        },

        "auto"
      ),
    ]
  );
}

function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
