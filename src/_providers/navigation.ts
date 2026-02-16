import h from "@macrostrat/hyper";
import {
  MacrostratInteractionProvider,
  MacrostratItemIdentifier,
} from "@macrostrat/data-components";

function buildHrefForItem(item: MacrostratItemIdentifier) {
  if (!item) return null;
  if ("col_id" in item) {
    let link = `/columns/${item.col_id}`;
    if ("project_id" in item) {
      link = `/projects/${item.project_id}` + link;
    }
    const params = new URLSearchParams();
    // if ("facet" in item) {
    //   params.set("facet", item.facet);
    // }
    if ("unit_id" in item) {
      params.set("unit", item.unit_id.toString());
    }
    const paramString = params.toString();
    if (paramString.length > 0) {
      link += `#${paramString}`;
    }
    return link;
  }
  // Projects that aren't tied to a specific column
  if ("project_id" in item) {
    return `/projects/${item.project_id}`;
  }
  if ("unit_id" in item) {
    return `/lex/units/${item.unit_id}`;
  }
  if ("lith_id" in item) {
    return `/lex/lithologies/${item.lith_id}`;
  }
  if ("environ_id" in item) {
    return `/lex/environments/${item.environ_id}`;
  }
  if ("lith_att_id" in item) {
    return `/lex/lithology-attributes/${item.lith_att_id}`;
  }
  if ("strat_name_id" in item) {
    return `/lex/strat-names/${item.strat_name_id}`;
  }
  if ("concept_id" in item) {
    return `/lex/strat-concepts/${item.concept_id}`;
  }
  if ("int_id" in item) {
    return `/lex/intervals/${item.int_id}`;
  }
  return null;
}

export function NavigationLinkProvider({ children }) {
  return h(
    MacrostratInteractionProvider,
    { linkDomain: "/", hrefForItem: buildHrefForItem },
    children
  );
}
