import hyper from "@macrostrat/hyper";
import { DarkModeProvider } from "@macrostrat/ui-components";
import React from "react";
import { PageContextProvider } from "./page-context";
import { PageContext, PageStyle } from "./types";

import "@blueprintjs/core/lib/css/blueprint.css";
import "../styles/_theme.styl";
import "../styles/core.sass";
import "../styles/padding.css";

import styles from "./page-shell.module.sass";

const h = hyper.styled(styles);

export function PageShell({
  children,
  pageContext,
  pageStyle = "fullscreen",
}: {
  children: React.ReactNode;
  pageContext: PageContext;
  pageStyle?: PageStyle;
}) {
  return h(
    PageContextProvider,
    { pageContext },
    h(
      DarkModeProvider,
      { followSystem: true },
      h("div.app-shell", { className: pageStyle + "-page" }, children)
    )
  );
}
