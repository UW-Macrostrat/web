import h from "@macrostrat/hyper";
import { Page as ColumnListPage } from "#/columns/index/+Page.ts";

export function Page() {
  return h(ColumnListPage, {
    title: "Groups",
  });
}
