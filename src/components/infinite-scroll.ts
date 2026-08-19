import h from "./infinite-scroll.module.sass";
import { Footer, PageBreadcrumbs } from "~/components";
import {
  useLoadControls,
  LoadProgressIndicator,
  DataPanelProps,
  DataPanel,
  SelectionInteractionStyle,
} from "@macrostrat/data-sheet";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button, InputGroup } from "@blueprintjs/core";


const PAGE_SIZE = 20;

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
    h("div.load-progress", { key: "lp" }, [
      h("div.load-progress-content", { key: "content" }, content),
      h(PageJumpControl, { key: "jump" }),
    ]),
    h(Footer, { key: "footer", className: "page-footer" }),
  ]);
}


function PageJumpControl() {
  const { loaded, total, loading, hasMore, advance } = useLoadControls();
  const [value, setValue] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const totalPages = total != null ? Math.ceil(total / PAGE_SIZE) : null;

  const scrollToPage = useCallback((pageNum: number) => {
    const items = rootRef.current
      ?.closest(".data-panel")
      ?.querySelectorAll(".data-panel-item-container:not(.is-skeleton)");
    if (items == null || items.length === 0) return;
    const idx = Math.min((pageNum - 1) * PAGE_SIZE, items.length - 1);
    items[Math.max(idx, 0)]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // Step one page per load until the target page is loaded (or the data runs out)
  useEffect(() => {
    if (target == null) return;
    if (loaded >= target * PAGE_SIZE || !hasMore) {
      scrollToPage(target);
      setTarget(null);
    } else if (!loading) {
      advance();
    }
  }, [target, loaded, loading, hasMore, advance, scrollToPage]);

  if (totalPages == null || totalPages <= 1) return null;

  const submit = () => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return;
    setTarget(Math.max(1, Math.min(n, totalPages)));
  };

  let content: ReactNode;
  if (target != null) {
    content = h(
      "span.page-jump-status",
      `Loading page ${target} of ${totalPages}…`
    );
  } else {
    content = [
      h("span.page-jump-label", { key: "label" }, "Go to page"),
      h(InputGroup, {
        key: "input",
        small: true,
        type: "number",
        min: 1,
        max: totalPages,
        value,
        onValueChange: setValue,
        onKeyDown: (e) => {
          if (e.key === "Enter") submit();
        },
        style: { width: "5em" },
      }),
      h("span.page-jump-total", { key: "total" }, `/ ${totalPages}`),
      h(
        Button,
        {
          key: "go",
          small: true,
          intent: "primary",
          disabled: value === "",
          onClick: submit,
        },
        "Go"
      ),
    ];
  }

  return h("div.page-jump", { ref: rootRef }, content);
}

interface InfiniteScrollProps<T> extends DataPanelProps<T> {
  headerElements: ReactNode;
}
