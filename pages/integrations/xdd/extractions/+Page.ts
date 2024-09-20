import h from "@macrostrat/hyper";
import { PostgrestClient } from "@supabase/postgrest-js";
import { usePageContext } from "vike-react/usePageContext";

import { ContentPage } from "~/layouts";
import { PageHeaderV2 } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";

const postgrest = new PostgrestClient(postgrestPrefix);

function usePostgresQuery(query) {
  const [data, setData] = useState(null);
  useEffect(() => {
    postgrest
      .from(query)
      .select("n_matches,citation,paper_id")
      .order("n_matches", { ascending: false })
      .limit(100)
      .then((res) => {
        setData(res.data);
      });
  }, [query]);
  return data;
}

export function Page() {
  return h(ContentPage, [h(PageMain)]);
}

function PageMain() {
  return h("div", [
    h(PageHeaderV2, { title: "Stratigraphic name extractions" }),
    h(ExtractionIndex),
  ]);
}

function ExtractionIndex() {
  const data = usePostgresQuery("kg_publication_entities");
  const ctx = usePageContext();
  const pageLink = ctx.urlPathname;
  if (data == null) {
    return h("div", "Loading...");
  }

  return h([
    h(
      data.map((d) => {
        return h("div", [
          h(xDDCitation, {
            citation: d.citation,
            href: pageLink + `/${d.paper_id}`,
          }),
          h("p", `${d.n_matches} stratigraphic name matches`),
        ]);
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
  const { title } = newCitation;
  return h("div", [h("h2.title", h("a", { href }, title))]);
}
