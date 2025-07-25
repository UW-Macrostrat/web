import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";

import { ContentPage } from "~/layouts";
import { PageHeader } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import {
  AuthorList,
  PostgRESTInfiniteScrollView,
} from "@macrostrat/ui-components";

export function Page() {
  return h(ContentPage, [h(PageMain)]);
}

function PageMain() {
  return h("div", [
    h(PageHeader, { title: "Stratigraphic name extractions" }),
    h(PostgRESTInfiniteScrollView, {
      route: `${postgrestPrefix}/kg_publication_entities`,
      id_key: "id",
      limit: 10,
      order_key: "n_matches",
      ascending: false,
      itemComponent: PaperItem,
    }),
  ]);
}

function NameMatch({ type, count, pluralSuffix = "s" }) {
  let pluralType = type;
  if (count > 1) {
    pluralType += pluralSuffix;
  }

  return `${count} ${pluralType}`;
}

function PaperItem({ data }) {
  const ctx = usePageContext();
  const pageLink = ctx.urlPathname;
  return h("div", [
    h(xDDCitation, {
      citation: data.citation,
      href: pageLink + `/${data.paper_id}`,
    }),
    h.if(data.n_matches != null)(
      "p",
      h(NameMatch, {
        type: "stratigraphic name match",
        count: data.n_matches,
        pluralSuffix: "es",
      })
    ),
  ]);
}

function pruneEmptyCitationElements(citation): any {
  const keys = [
    "title",
    "author",
    "doi",
    "journal",
    "identifier",
    "volume",
    "number",
    "year",
  ];
  let newCitation = {};
  for (let key of keys) {
    if (citation[key] != null && citation[key] !== "") {
      newCitation[key] = citation[key];
    }
  }
  return newCitation;
}

function xDDCitation({ citation, href }) {
  const newCitation = pruneEmptyCitationElements(citation);
  const { title, author, journal, identifier } = newCitation;
  const names = author?.map((d) => d.name);
  return h("div", [
    h("h2.title", h("a", { href }, title)),
    h("h3.journal", null, journal),
    h(AuthorList, { names }),
    h(IdentLink, { identifier: getBestIdentifier(identifier) }),
  ]);
}

function IdentLink({ identifier }) {
  if (identifier == null) return null;
  const { type, id } = identifier;

  let ident = h("code.identifier", id);
  if (type == "doi") {
    ident = h("a", { href: "https://dx.doi.org/doi/" + id }, ident);
  }

  return h("p", [h("span.label", type), " ", ident]);
}

type Identifier = {
  id: string;
  type: string;
};

function getBestIdentifier(identifier: Identifier[] | null): Identifier | null {
  if (identifier == null || identifier.length == 0) return null;
  for (const ident of identifier) {
    if (ident.type == "doi") {
      return ident;
    }
  }
  return identifier[0];
}
