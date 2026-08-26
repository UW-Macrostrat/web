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

const PAGE_SIZE = 20;
/** Pages auto-loaded per burst before the inline footer's "Load more" takes
 * over. Deep results are reached by scrolling (and, more usefully, by narrowing
 * the search) — so this is set high enough that the footer is a checkpoint
 * rather than a speed bump. */
const AUTO_LOAD_PAGES = 10;

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
        pageSize: PAGE_SIZE,
        autoLoadPages: AUTO_LOAD_PAGES,
        className: "ingestion-panel",
        statusBar: false,
        enableSelection: SelectionInteractionStyle.MODAL,
        toolbarStyle: "floating",
        contentFooter: h(InfiniteScrollFooter),
        // Typing in a text filter shouldn't fire a request per keystroke; the
        // input stays instant, only the fetch waits for the view to settle.
        filterDebounce: 300,
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
    h("div.load-progress", { key: "lp" }, content),
    h(Footer, { key: "footer", className: "page-footer" }),
  ]);
}

interface InfiniteScrollProps<T> extends DataPanelProps<T> {
  headerElements: ReactNode;
}
