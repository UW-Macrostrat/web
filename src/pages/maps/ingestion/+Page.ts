import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { Card, Icon } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import IngestProcessCard from "~/pages/maps/ingestion/components/IngestProcessCard";
import styles from "./main.module.sass";
import { PageBreadcrumbs } from "~/renderer";

import IngestNavbar from "./components/navbar";
import Tag from "./components/Tag";
import { LinkCard } from "~/components";
import { ContentPage } from "~/layouts";

const h = hyper.styled(styles);

const toggleUrlParam = (
  urlSearchParam: URLSearchParams,
  key: string,
  value: string
) => {
  // Check if this key value pair is already in the search params iteratively
  if (urlSearchParam.getAll(key).includes(value)) {
    urlSearchParam.delete(key, value);
  } else {
    urlSearchParam.append(key, value);
  }

  return new URLSearchParams(urlSearchParam.toString());
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

    const url = new URL(window.location.href);
    const urlWithSearch = new URL(url.origin + url.pathname + "?" + toggledUrl);

    window.history.pushState(
      { page: "Update search params" },
      "Title",
      urlWithSearch
    );

    return toggledUrl;
  });
};

const getTags = async () => {
  const response = await fetch(`${ingestPrefix}/ingest-process/tags`);
  return await response.json();
};

const getIngestProcesses = async (ingestFilter: URLSearchParams) => {
  const response = await fetch(
    `${ingestPrefix}/ingest-process?source_id=order_by&source_id=not.is.null&page_size=1000&${
      ingestFilter || ""
    }`
  );
  let res = await response.json();
  // Reverse the array so that the most recent ingestions are at the top
  res = res.reverse();
  return res;
};

export function Page({ user, url }) {
  const [ingestProcess, setIngestProcess] = useState<IngestProcess[]>([]);
  const [ingestFilter, setIngestFilter] = useState<URLSearchParams>(undefined);
  const [tags, setTags] = useState<string[]>([]);

  // Get the initial data with the filter from the URL
  useEffect(() => {
    // Get the ingest process data
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    setIngestFilter(searchParams);
    getIngestProcesses(searchParams).then((ingestProcesses) => {
      setIngestProcess(ingestProcesses);
    });

    // Get the current set of tags
    getTags().then((tags) => setTags(tags));

    // Set up the popstate event listener
    window.onpopstate = () => {
      getIngestProcesses(ingestFilter).then((ingestProcesses) => {
        setIngestProcess(ingestProcesses);
      });
    };
  }, []);

  // Re-fetch data when the filter changes
  useEffect(() => {
    if (ingestFilter) {
      getIngestProcesses(ingestFilter).then((ingestProcesses) => {
        setIngestProcess(ingestProcesses);
      });
    }
  }, [ingestFilter]);

  return h(ContentPage, [
    h(PageBreadcrumbs),
    h(IngestNavbar, { user }),
    h("div.ingestion-title-bar", [h("h1", ["Map ingestion"])]),
    h("div.ingestion-body", [
      h("div.ingestion-context", [
        h(AddMapButton, { user }),
        h(TagFilterManager, {
          tags,
          setIngestFilter: setIngestFilter,
          ingestFilter: ingestFilter,
        }),
      ]),
      h("h2", "Maps"),
      h(
        "div.ingestion-cards",
        ingestProcess.map((d) => {
          return h(IngestProcessCard, {
            ingestProcess: d,
            user: user,
            // What is this doing?
            onUpdate: () => getTags().then((tags) => setTags(tags)),
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
      active: ingestFilter?.getAll("state").includes("eq.pending"),
      onClick: async () => {
        updateUrl("state", "eq.pending", setIngestFilter);
      },
    }),
    h(Tag, {
      value: "ingested",
      active: ingestFilter?.getAll("state").includes("eq.ingested"),
      onClick: async () => {
        updateUrl("state", "eq.ingested", setIngestFilter);
      },
    }),
    tags.map((tag) => {
      return h(Tag, {
        key: tag,
        value: tag,
        active: ingestFilter?.getAll("tags").includes(`eq.${tag}`),
        onClick: async () => {
          updateUrl("tags", `eq.${tag}`, setIngestFilter);
        },
      });
    }),
  ]);
}

function AddMapButton({ user }) {
  if (user == null) return null;
  return h(
    LinkCard,
    {
      interactive: true,
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        padding: "0.5em",
        margin: "0.5em",
        borderRadius: "0.5em",
        overflow: "scroll",
      },
      href: "/maps/ingestion/add",
    },
    [
      h("div", [
        h(
          Icon,
          {
            icon: "add",
            size: 36,
            style: {
              margin: "auto",
            },
          },
          []
        ),
        h("h3", ["Add a map"]),
      ]),
    ]
  );
}
