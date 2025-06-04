import LithologyHierarchy from "@macrostrat-web/lithology-hierarchy";
import { ContentPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import { PageBreadcrumbs, StickyHeader } from "~/components";
import styles from "./main.module.sass";
const h = hyper.styled(styles);

export function Page() {
  return h(ContentPage, [
    h("div.main", [h(StickyHeader, h(PageBreadcrumbs)), h(LithologyHierarchy)]),
  ]);
}
