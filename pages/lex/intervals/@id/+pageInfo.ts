import { PageInfo } from "~/_utils/breadcrumbs.ts";
import h from "./main.module.sass";
import { Tag } from "@macrostrat/data-components";

export function pageInfo(pageContext: any): PageInfo {
  const { data } = pageContext;
  const { resData } = data;
  return {
    name: resData.name,
    title() {
      return h(LexItemHeader, { resData, name: resData.name });
    },
    identifier: resData.int_id,
  };
}

function LexItemHeader({ resData, name }) {
  const color = resData?.color;
  let abbrev = null;
  const hasAbbrev = resData?.abbrev && resData?.abbrev !== name;
  if (hasAbbrev) {
    abbrev = h("span.subtitle", [
      " aka ",
      h(Tag, { color, name: resData.abbrev }),
    ]);
  }

  return h("span.interval-name", [
    h(Tag, { color: resData?.color, name }),
    abbrev,
  ]);
}
