import h from "./infinite-scroll.module.sass";
import { Footer, PageBreadcrumbs } from "~/components";
import {
  useLoadControls,
  LoadProgressIndicator,
  DataPanelProps,
  DataPanel,
  SelectionInteractionStyle,
} from "@macrostrat/data-sheet";
import { ReactNode } from "react";
import { Button } from "@blueprintjs/core";

export function InfiniteScrollPage<T>({
  className,
  headerElements,
  ...rest
}: InfiniteScrollProps<T>) {
  return h("div.page", [
    h("header.page-header", [
      h(PageBreadcrumbs, { separateTitle: false }),
      headerElements,
    ]),
    h(
      "div.data-panel-container",
      h(DataPanel<T>, {
        pageSize: 20,
        autoLoadPages: 2,
        className: "ingestion-panel",
        statusBar: false,
        enableSelection: SelectionInteractionStyle.MODAL,
        toolbarStyle: "floating",
        contentFooter: h(InfiniteScrollFooter),
        ...rest,
      })
    ),
  ]);
}

export function InfiniteScrollFooter({ className }) {
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

  return h("div.footer-panel", { className }, [
    h("div.load-progress", content),
    h(Footer, { className: "page-footer" }),
  ]);
}

interface InfiniteScrollProps<T> extends DataPanelProps<T> {
  headerElements: ReactNode;
}
