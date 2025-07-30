import h from "./icon.module.sass";
import { ButtonGroup } from "@blueprintjs/core";
import { PageBreadcrumbs } from "~/components/navigation";

export function PageHeader({ className, title, children }) {
  /** A page header component that includes a title and breadcrumbs. */
  return h("header.page-header", { className }, [
    h("div.header-main", [
      h("div.header-top", [
        h(PageBreadcrumbs, {
          title,
        }),
        children,
      ]),
    ]),
  ]);
}

export function AssistantLinks({ children }) {
  return h("div.float-right.padding.stick-to-top", [
    h(ButtonGroup, { vertical: true, large: true }, [children]),
  ]);
}
