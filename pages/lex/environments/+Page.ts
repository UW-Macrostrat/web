import {
  Hierarchy,
  MacrostratHierarchyItem,
} from "@macrostrat-web/lithology-hierarchy";
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";

export function Page() {
  const { data } = useData<Data>();
  return h(Hierarchy, {
    data,
    itemComponent: MacrostratHierarchyItem,
  });
}
