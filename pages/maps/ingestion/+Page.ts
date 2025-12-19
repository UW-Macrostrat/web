import { AnchorButton } from "@blueprintjs/core";
import { postgrestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import react, { useCallback, useEffect, useState } from "react";
import { PageBreadcrumbs } from "~/components";
import { IngestProcessCard } from "./components";
import styles from "./main.module.sass";
import { useAuth, AuthStatus } from "@macrostrat/form-components";

import { ContentPage } from "~/layouts";
import Tag from "./components/Tag";

const h = hyper.styled(styles);
type MapSource = {
  source_id: number;
  name: string | null;
};
interface IngestProcess {
  id: number;
  source_id: number | null;
  slug: string;
  name: string;
  scale: string | null;
  raster_url: string | null;
  tags?: string[] | { tag: string }[];
  state?: string;
}
export function Page() {
  const { user } = useAuth();
  const [mapSources, setMapSources] = useState<Record<number, MapSource>>({});
  const [ingestProcess, setIngestProcess] = useState<IngestProcess[]>([]);
  const [ingestFilter, setIngestFilter] = useState<URLSearchParams>(undefined);
  const [tags, setTags] = useState<string[]>([]);

  const updateTags = useCallback(() => {
    getTags().then((tags) => setTags(tags));
  }, []);

  const getMapSources = async (): Promise<Record<number, MapSource>> => {
    const res = await fetch(
      "https://dev.macrostrat.org/api/pg/maps_sources?select=source_id,name"
    );
    const rows: MapSource[] = await res.json();

    return Object.fromEntries(rows.map((r) => [r.source_id, r]));
  };

  const updateIngestProcesses = useCallback(() => {
    getIngestProcesses(ingestFilter).then((ingestProcesses) => {
      setIngestProcess(ingestProcesses);
    });
  }, [ingestFilter]);

  // Get the initial data with the filter from the URL
  react.useEffect(() => {
    // Get the ingest process data
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    searchParams.set("state", "not.eq.abandoned");
    setIngestFilter(searchParams);
    updateIngestProcesses();
    updateTags();

    // Set up the popstate event listener
    window.onpopstate = () => {
      updateIngestProcesses();
    };
  }, []);
  useEffect(() => {
    getMapSources().then(setMapSources);
  }, []);

  // Re-fetch data when the filter changes
  react.useEffect(() => {
    if (ingestFilter) {
      updateIngestProcesses();
    }
  }, [ingestFilter]);

  return h(ContentPage, [
    h(PageBreadcrumbs),
    h("div.ingestion-title-bar", [
      h("h1", ["Map ingestion queue"]),
      h("div.spacer"),
      h(AuthStatus),
    ]),
    h("div", [
      h("div.ingestion-body", [
        h(AddMapButton, { user }),
        h(TagFilterManager, {
          tags,
          setIngestFilter: setIngestFilter,
          ingestFilter: ingestFilter,
        }),
      ]),
      h("h2", "Maps"),
      h(
        "div.ingestion-body",
        ingestProcess.map((d) => {
          const name =
            d.source_id != null ? mapSources[d.source_id]?.name : undefined;

          return h(IngestProcessCard, {
            key: d.id,
            ingestProcess: d,
            refTitle: name,
            user: user,
            onUpdate: () => {
              updateTags();
              updateIngestProcesses();
            },
          });
        })
      ),
    ]),
  ]);
}

function TagFilterManager({ tags, setIngestFilter, ingestFilter }) {
  return h("div.tag-filter-manager", [
    h("h3", ["Filter by tag"]),
    h(Tag, {
      value: "pending",
      active: (ingestFilter?.getAll("state") ?? []).includes("eq.pending"),
      onClick: async () => {
        updateUrl("state", "eq.pending", setIngestFilter);
      },
    }),
    h(Tag, {
      value: "ingested",
      active: (ingestFilter?.getAll("state") ?? []).includes("eq.ingested"),
      onClick: async () => {
        updateUrl("state", "eq.ingested", setIngestFilter);
      },
    }),
    tags.map((tag) => {
      return h(Tag, {
        key: tag,
        value: tag,
        active: (ingestFilter?.getAll("tags") ?? []).includes(`eq.${tag}`),
        onClick: async () => {
          updateUrl("tags", `eq.${tag}`, setIngestFilter);
        },
      });
    }),
  ]);
}

function AddMapButton({ user }) {
  return h(
    AnchorButton,
    {
      large: true,
      icon: "add",
      href: "/maps/ingestion/add",
      disabled: user == null,
    },
    "Add a map"
  );
}

const toggleUrlParam = (
  urlSearchParam: URLSearchParams | undefined,
  key: string,
  value: string
) => {
  // Check if this key value pair is already in the search params iteratively
  const sp = urlSearchParam
    ? new URLSearchParams(urlSearchParam)
    : new URLSearchParams();
  if (sp.getAll(key).includes(value)) sp.delete(key, value);
  else sp.append(key, value);
  return sp;
};

const updateUrl = (
  key: string,
  value: string,
  setIngestFilter: (
    filter: (filter: URLSearchParams) => URLSearchParams
  ) => void
) => {
  setIngestFilter((ingestFilter: URLSearchParams) => {
    const toggledUrl = toggleUrlParam(ingestFilter, key, value);

    let url = new URL(window.location.href);

    let urlSuffix = "";
    if (toggledUrl?.toString() !== "") {
      urlSuffix = "?" + toggledUrl;
    }
    url = new URL(url.origin + url.pathname + urlSuffix);

    window.history.pushState({ page: "Update search params" }, "Title", url);

    return toggledUrl;
  });
};

const getTags = async (): Promise<string[]> => {
  const response = await fetch(`${postgrestPrefix}/map_ingest_tags`);
  const rows = await response.json();
  return [...new Set(rows.map((r) => r.tag))];
};

const getIngestProcesses = async (ingestFilter: URLSearchParams) => {
  const response = await fetch(
    `${postgrestPrefix}/map_ingest?source_id=not.is.null&order=source_id.desc&limit=1000&${
      ingestFilter || ""
    }`
  );
  return await response.json();
};
