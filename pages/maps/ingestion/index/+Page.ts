import h from "./+Page.module.sass";
import { useAuth } from "@macrostrat/form-components";
import { IngestionListPanel } from "./ingestion-list.ts";
import { Footer, PageBreadcrumbs } from "~/components";
import { useLoadControls, LoadProgressIndicator } from "@macrostrat/data-sheet";
import { ReactNode } from "react";
import { Button } from "@blueprintjs/core";
import { LoginButton } from "../components/navbar.ts";

export function Page() {
  const { user } = useAuth();

  return h("div.page", [
    h("header.page-header", [
      h(PageBreadcrumbs, { separateTitle: false }),
      h(LoginButton, { user, minimal: true }),
    ]),
    h(IngestionListPanel, { footer: h(IngestionPanelFooter) }),
  ]);
}

function IngestionPanelFooter() {
  const c = useLoadControls();

  let content: ReactNode = h(LoadProgressIndicator);
  if (c.paused) {
    content = h([
      content,
      h(
        Button,
        {
          large: true,
          minimal: true,
          intent: "primary",
          onClick: c.loadMore,
        },
        "Load more"
      ),
    ]);
  }

  return h("div.footer-panel", [
    h("div.load-progress", content),
    h(Footer, { className: "page-footer" }),
  ]);
}
