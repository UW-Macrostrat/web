import h from "@macrostrat/hyper";
import { Page as ColumnListPage } from "#/columns/+Page.ts";

export function Page() {
  return h(ColumnListPage, {
    title: "Groups",
  });
}
