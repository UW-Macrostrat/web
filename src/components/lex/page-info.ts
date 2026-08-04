import h from "@macrostrat/hyper";
import { Tag } from "@macrostrat/data-components";
import type { PageInfo } from "~/_utils/helpers.ts";

export interface LexPageInfoOptions {
  /** Human-readable item name (breadcrumb + title). */
  name?: string;
  /** Numeric item id, shown right-aligned in the title row. */
  identifier?: number;
  /** Item color, if any — renders the title as a colored tag. */
  color?: string;
  /** Optional abbreviation, shown as an "aka" subtitle. */
  abbrev?: string;
}

/** Build a standardized `PageInfo` for a `/lex` detail page, so the layout's
 * expanded breadcrumbs render a consistent header (colored tag when the item has
 * a color, plain name otherwise) with the id right-aligned in the title row.
 *
 * Undefined fields are omitted so a not-yet-loaded record never clobbers the
 * route-derived breadcrumb name. Import this directly (not via the `lex` barrel)
 * to keep the breadcrumb path free of the barrel's heavy map/chart deps.
 */
export function lexPageInfo(opts: LexPageInfoOptions): PageInfo {
  const { name, identifier, color, abbrev } = opts;
  const info: Partial<PageInfo> = {};

  if (name != null) {
    info.name = name;
    info.title = () => h(LexItemTitle, { name, color, abbrev });
  }
  if (identifier != null) {
    info.identifier = identifier;
  }

  return info as PageInfo;
}

/** The numeric id from the current `@id` route (`ctx.routeParams.id`), or
 * undefined if it isn't a number. This is the value shown in the URL, so it's a
 * reliable identifier regardless of how each record names its id field. */
export function routeId(ctx: any): number | undefined {
  const id = Number(ctx?.routeParams?.id);
  return Number.isFinite(id) ? id : undefined;
}

function LexItemTitle({ name, color, abbrev }: LexPageInfoOptions) {
  let nameNode;
  if (color != null) {
    nameNode = h(Tag, { color, name });
  } else {
    nameNode = h("span", name);
  }

  let abbrevNode = null;
  const showAbbrev = abbrev != null && abbrev !== name;
  if (showAbbrev) {
    abbrevNode = h("span.subtitle", [" aka ", h(Tag, { color, name: abbrev })]);
  }

  return h("span.lex-item-title", [nameNode, abbrevNode]);
}
