import { DarkModeProvider, DevToolsConsole } from "@macrostrat/ui-components";
import { ReactNode } from "react";

import { AuthProvider } from "~/_providers/auth";
import { usePageContext } from "vike-react/usePageContext";

import "@blueprintjs/core/lib/css/blueprint.css";
import "~/styles/core.sass";
import "~/styles/padding.css";
//
import h from "@macrostrat/hyper";

import { ClientOnly } from "vike-react/ClientOnly";

export default function Layout({ children }: { children: ReactNode }) {
  const pageContext = usePageContext();
  const { exports = {}, config, user } = pageContext;
  const pageStyle = exports?.pageStyle ?? "fullscreen";
  // const devTools = exports.devTools ?? [];

  return h(
    AuthProvider,
    { user }, // Prefer detailed user if available
    h(
      DarkModeProvider,
      { followSystem: true },
      h("div.app-shell", { className: pageStyle + "-page" }, [
        children,
        // h(DevToolsConsole, {
        //   className: "page-admin-container",
        //   tools: [...devTools, DevToolsData],
        // }),
      ])
    )
  );
}

function DevToolsData() {
  return h(
    ClientOnly,
    {
      load() {
        return import("~/components/developer").then((mod) => mod.DevToolsData);
      },
    },
    (DevToolsData) => h(DevToolsData)
  );
}

DevToolsData.title = "Vike page context";

function NoOpDarkModeProvider(props) {
  return props.children;
}
