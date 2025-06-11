import { DarkModeProvider } from "@macrostrat/ui-components";
import { ReactNode } from "react";

import { AuthProvider } from "~/_providers/auth";
import { usePageContext } from "vike-react/usePageContext";
import { pageLayouts } from "~/layouts";

import "@blueprintjs/core/lib/css/blueprint.css";
import "~/styles/core.sass";
import "~/styles/padding.css";
//
import h from "@macrostrat/hyper";

export default function Layout({ children }: { children: ReactNode }) {
  const pageContext = usePageContext();
  const { exports = {}, config, user } = pageContext;
  const pageStyle = exports?.pageStyle ?? "fullscreen";
  // const devTools = exports.devTools ?? [];

  const layout = pageLayouts[pageStyle] ?? `div.${pageStyle}-page`;

  return h(
    AuthProvider,
    { user }, // Prefer detailed user if available
    h(DarkModeProvider, { followSystem: true }, h(layout, children))
  );
}
