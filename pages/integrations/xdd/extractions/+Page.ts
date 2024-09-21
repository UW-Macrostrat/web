import h from "@macrostrat/hyper";
import { PostgrestClient } from "@supabase/postgrest-js";
import { usePageContext } from "vike-react/usePageContext";

import { ContentPage } from "~/layouts";
import { PageHeaderV2 } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";
import {
  AuthorList,
  InfiniteScroll,
  LoadingPlaceholder,
} from "@macrostrat/ui-components";
import { create } from "zustand";

const postgrest = new PostgrestClient(postgrestPrefix);

interface DataStore {
  data: any[];
  hasMore: boolean;
  lastID: number | null;
  loadMore: (set: any) => void;
  setData: (data: any[]) => void;
  isLoading: boolean;
}

const useStore = create<DataStore>((set, get) => ({
  data: [],
  isLoading: false,
  hasMore: true,
  lastID: null,
  setData: (data) => set({ data, isLoading: false }),
  loadMore: async () => {
    const { lastID, isLoading } = get();
    set({ isLoading: true });
    if (isLoading) return;

    let req = postgrest
      .from("kg_publication_entities")
      .select("citation,paper_id")
      .order("paper_id", { ascending: true });

    if (lastID != null) {
      req = req.gt("paper_id", lastID);
    }

    const res = await req.limit(10);

    set((state) => {
      return {
        data: [...state.data, ...res.data],
        isLoading: false,
        hasMore: res.data.length > 0,
        lastID: res.data[res.data.length - 1]?.paper_id,
      };
    });
  },
}));

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
  const { data, isLoading, hasMore, loadMore } = useStore();

  return h(InfiniteScroll, { hasMore, loadMore, offset: 500, isLoading }, [
    h(PaperList, { data }),
    h.if(isLoading)(LoadingPlaceholder),
  ]);
}

function PaperList({ data }) {
  const ctx = usePageContext();
  const pageLink = ctx.urlPathname;
  return h("div.paper-list", [
    data.map((d) => {
      return h("div", [
        h(xDDCitation, {
          citation: d.citation,
          href: pageLink + `/${d.paper_id}`,
        }),
        h.if(d.n_matches != null)(
          "p",
          `${d.n_matches} stratigraphic name matches`
        ),
      ]);
    }),
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
  console.log(newCitation);
  const names = author?.map((d) => d.name);
  console.log(names);
  return h("div", [
    h("h2.title", h("a", { href }, title)),
    h("h3.journal", null, journal),
    h(AuthorList, { names }),
    h(IdentLink, { identifier: getBestIdentifier(identifier) }),
  ]);
}

function IdentLink({ identifier }) {
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
