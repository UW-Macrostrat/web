import { AnchorButton, Spinner } from "@blueprintjs/core";
import { apiV3Prefix, postgrestPrefix } from "@macrostrat-web/settings";
import react, { useCallback, useEffect, useState } from "react";
import { IngestProcessCard } from "./components";
import h from "./main.module.sass";
import { useAuth, AuthStatus } from "@macrostrat/form-components";

import Tag from "./components/Tag";

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
  const [ingestProcess, setIngestProcess] = useState<IngestProcess[]>([]);
  const [ingestFilter, setIngestFilter] = useState<URLSearchParams>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  const updateTags = useCallback(() => {
    getTags().then((tags) => setTags(tags));
  }, []);

  const updateIngestProcesses = useCallback(() => {
    getIngestProcesses(ingestFilter).then((ingestProcesses) => {
      setIngestProcess(ingestProcesses);
    });
  }, [ingestFilter]);

  // Get the initial data with the filter from the URL
  useEffect(() => {
    // Get the ingest process data
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    searchParams.set("state", "not.eq.abandoned");
    setIngestFilter(searchParams);
    updateTags();

    // Set up the popstate event listener
    window.onpopstate = () => {
      const url = new URL(window.location.href);
      setIngestFilter(new URLSearchParams(url.search));
    };
  }, []);

  // Re-fetch data when the filter changes
  useEffect(() => {
    if (ingestFilter) {
      updateIngestProcesses();
    }
  }, [ingestFilter]);

  console.log(ingestProcess);
  const maps = ingestProcess ?? [];

  return h("div.main", [
    h("div.ingestion-title-bar", [
      h("h1", ["Map ingestion queue"]),
      h("div.spacer"),
      h(AuthStatus),
    ]),
    h("div", [
      h("div.ingestion-body", [
        h(AddMapButton, { user }),
        h(TagFilterManager, {
          states,
          tags,
          setIngestFilter: setIngestFilter,
          ingestFilter: ingestFilter,
        }),
      ]),
      h("h2", "Maps"),
      h(
        "div.ingestion-body",
        maps.map((d) => {
          const name = d.name;

          return h(IngestProcessCard, {
            key: d.id,
            data: d,
            refTitle: name,
            user: user,
            // onUpdate: () => {
            //   updateTags();
            //   updateStates();
            //   updateIngestProcesses();
            // },
          });
        })
      ),
    ]),
  ]);
}

function TagFilterManager({ states, tags, setIngestFilter, ingestFilter }) {
  return h("div.tag-filter-manager", [
    h("h3", ["Filter by tag"]),

    states.map((state) => {
      return h(Tag, {
        key: `state-${state}`,
        value: state,
        active: (ingestFilter?.getAll("state") ?? []).includes(`eq.${state}`),
        onClick: async () => {
          updateUrl("state", `eq.${state}`, setIngestFilter);
        },
      });
    }),
    tags.map((tag) => {
      return h(Tag, {
        key: `tag-${tag}`,
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

const getStates = async (): Promise<string[]> => {
  const response = await fetch(
    `${postgrestPrefix}/map_ingest?select=state&state=not.is.null&source_id=not.is.null&order=state.asc`
  );
  const rows: { state: string | null }[] = await response.json();
  return [...new Set(rows.map((r) => r.state).filter(Boolean))] as string[];
};

const getIngestProcesses = async (ingestFilter: URLSearchParams) => {
  const ingestResponse = await fetch(apiV3Prefix + "/map-ingestion/pg/maps");

  const data = await ingestResponse.json();
  if (!Array.isArray(data)) {
    console.error("Unexpected response from map-ingestion/pg/maps", data);
    return [];
  }
  return data;
  //
  // const tagResponse = await fetch(`${postgrestPrefix}/map_ingest_tags`);
  // const tagRows: { ingest_process_id: number; tag: string }[] =
  //   await tagResponse.json();
  //
  // const tagsByIngestProcessId = tagRows.reduce<Record<number, string[]>>(
  //   (acc, row) => {
  //     if (!acc[row.ingest_process_id]) {
  //       acc[row.ingest_process_id] = [];
  //     }
  //
  //     acc[row.ingest_process_id].push(row.tag);
  //     return acc;
  //   },
  //   {}
  // );
  //
  // return ingestProcesses.map((process) => ({
  //   ...process,
  //   tags: tagsByIngestProcessId[process.id] ?? [],
  // }));
};
