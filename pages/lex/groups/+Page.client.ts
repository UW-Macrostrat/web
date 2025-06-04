import h from "@macrostrat/hyper";
import { Page as ColumnListPage } from "#/columns/+Page.ts";
import { useData } from "vike-react/useData";

export function Page() {
    const { columnGroups, res } = useData();

    console.log("Column groups:", columnGroups, res);


  return h(ColumnListPage, {
    title: "Groups",
  });
}
