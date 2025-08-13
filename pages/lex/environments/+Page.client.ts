import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { LexListPage } from "../economics/+Page.client";

export function Page() {
  const { res } = useData();  
  return h(LexListPage, { res, title: "Environments", route: "environments", id: "environ_id" });
}