import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";

// Styles

// Page for a list of maps
import styles from "./main.module.sass";
import {
  Icon,
  IconSize,
  Navbar,
  AnchorButton,
  Tooltip,
  Card,
} from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import AddButton from "~/pages/maps/ingestion/components/AddButton";
import IngestProcessCard from "~/pages/maps/ingestion/components/ingest-process-card";
import { useEffect, useState, useContext } from "react";

import Tag from "./components/Tag";
import IngestNavbar from "~/pages/maps/ingestion/components/navbar";

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

const updateUrl = (key: string, value: string, setIngestFilter: (filter: (filter: URLSearchParams) => URLSearchParams) => void) => {
  setIngestFilter((ingestFilter: URLSearchParams) => {

    const toggledUrl = toggleUrlParam(ingestFilter, key, value);

    const url = new URL(window.location.href);
    const urlWithSearch = new URL(
      url.origin + url.pathname + "?" + toggledUrl
    );

    window.history.pushState(
      { page: "Update Search Params" },
      "Title",
      urlWithSearch
    );

    return toggledUrl;
  });
}

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
  return await response.json();
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
    setIngestFilter(searchParams)
    getIngestProcesses(searchParams).then((ingestProcesses) => {setIngestProcess(ingestProcesses)});

    // Get the current set of tags
    getTags().then((tags) => setTags(tags));

    // Set up the popstate event listener
    window.onpopstate = () => {
      getIngestProcesses(ingestFilter).then((ingestProcesses) => {setIngestProcess(ingestProcesses)});
    };
  }, []);

  // Re-fetch data when the filter changes
  useEffect(() => {
    if (ingestFilter) {
      getIngestProcesses(ingestFilter).then((ingestProcesses) => {setIngestProcess(ingestProcesses)});
    }
  }, [ingestFilter]);

  return h("div", [
    h(IngestNavbar, { user: user }),
    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1000px",
          justifyContent: "center",
        },
      },
      [h("h1", { style: { marginLeft: "7px" } }, ["Source Map Ingestion"])]
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "800px 200px",
          justifyContent: "center",
        },
      },
      [
        h(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
            },
          },
          [
            h.if(user != null)(
              Card,
              {
                interactive: true,
                style: {
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  padding: "0.5em",
                  margin: "0.5em",
                  borderRadius: "0.5em",
                  backgroundColor: "#f0f0f0",
                  overflow: "scroll",
                },
                onClick: () => {
                  window.location = "/maps/ingestion/add";
                },
              },
              [
                h("div", { style: { display: "flex", margin: "auto" } }, [
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
                  h("h3", { style: { margin: "auto", marginLeft: "7px" } }, [
                    "Add Source Map",
                  ]),
                ]),
              ]
            ),
            ingestProcess.map((d) => {
              return h(
                "div",
                {
                  key: d.id,
                  style: { maxWidth: "1000px", width: "100%" },
                },
                [
                  h(IngestProcessCard, {
                    ingestProcess: d,
                    user: user,
                    onUpdate: () => getTags().then((tags) => setTags(tags))
                  }),
                ]
              );
            }),
          ]
        ),
        h(
          "div",
          {
            style: {
              display: "block",
              marginTop: "7px",
            },
          },
          [
            h("h3", { style: { margin: 0, marginBottom: "7px" } }, ["Tags"]),
            h(Tag, {
              value: "pending",
              active: ingestFilter?.getAll("state").includes("eq.pending"),
              onClick: async () => {
                updateUrl("state", "eq.pending", setIngestFilter);
              },
              style: { width: "100%", marginBottom: "7px" },
            }),
            h(Tag, {
              value: "ingested",
              active: ingestFilter?.getAll("state").includes("eq.ingested"),
              onClick: async () => {
                updateUrl("state", "eq.ingested", setIngestFilter);
              },
              style: { width: "100%", marginBottom: "7px" },
            }),
            tags.map((tag) => {
              return h(Tag, {
                key: tag,
                value: tag,
                active: ingestFilter?.getAll("tags").includes(`eq.${tag}`),
                onClick: async () => {
                  updateUrl("tags", `eq.${tag}`, setIngestFilter);
                },
                style: { width: "100%", marginBottom: "7px" },
              });
            }),
          ]
        ),
      ]
    ),
  ]);
}
