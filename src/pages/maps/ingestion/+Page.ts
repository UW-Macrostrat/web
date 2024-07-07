import { AnchorButton } from "@blueprintjs/core";
import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { useEffect, useState } from "react";
import { PageBreadcrumbs, usePageProps } from "~/renderer";
import { IngestProcessCard } from "./components";
import styles from "./main.module.sass";
import { AuthStatus } from "@macrostrat/auth-components";

import { ContentPage } from "~/layouts";
import Tag from "./components/Tag";

const h = hyper.styled(styles);

export function Page() {
  const { user, url } = usePageProps();
  const [ingestProcess, setIngestProcess] = useState<IngestProcess[]>([]);
  const [ingestFilter, setIngestFilter] = useState<URLSearchParams>(undefined);
  const [tags, setTags] = useState<string[]>([]);

  // Get the initial data with the filter from the URL
  useEffect(() => {
    // Get the ingest process data
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    searchParams.set("state", "not.eq.abandoned");
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
    //h(IngestNavbar, { user }),
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
          return h(IngestProcessCard, {
            key: d.id,
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

const getTags = async () => {
  const response = await fetch(`${ingestPrefix}/ingest-process/tags`);
  return await response.json();
};

const getIngestProcesses = async (ingestFilter: URLSearchParams) => {
  const response = await fetch(
    `${ingestPrefix}/ingest-process?source_id=order_by.desc&source_id=not.is.null&page_size=1000&${
      ingestFilter || ""
    }`
  );
  return await response.json();
};
