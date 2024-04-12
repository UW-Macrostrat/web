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
  Card
} from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import AddButton from "~/pages/maps/ingestion/components/AddButton";
import IngestProcessCard from "~/pages/maps/ingestion/components/IngestProcessCard";
import { useEffect, useState, useContext } from "react";

import Tag from "./components/Tag"
import IngestNavbar from "~/pages/maps/ingestion/components/navbar";

const h = hyper.styled(styles);


export function Page({ user, url }) {

  const [ingestProcess, setIngestProcess] = useState<IngestProcess[]>([])
  const [ingestFilter, setIngestFilter] = useState<string>("")
  const [tags, setTags] = useState<string[]>([]);

  const getIngestProcesses = async () => {

    // Get the query from the url
    let urlFilter = "";
    if(window.location.search) {
      urlFilter = window.location.search.substring(1);
    }


    const response = await fetch(`${ingestPrefix}/ingest-process?source_id=order_by&source_id=not.is.null&state=eq.ingested&page_size=1000&${ingestFilter}&${urlFilter}`);
    const ingest_processes = await response.json();
    setIngestProcess(ingest_processes);
  }

  useEffect(() => {
    getIngestProcesses();
  }, [ingestFilter])

  useEffect(() => {
    const getTags = async () => {
      const response = await fetch(`${ingestPrefix}/ingest-process/tags`);
      const tags = await response.json();
      setTags(tags);
    }
    getTags();

    window.onpopstate = () => {
      getIngestProcesses()
    }
  }, [])


  return h("div", [
    h(IngestNavbar, { user: user }),
    h("div",
      { style: {display: "grid", gridTemplateColumns: "1000px", justifyContent: "center"} },
      [h("h1", {style: {marginLeft: "7px"}}, ["Source Map Ingestion"])]
    ),

    h("div",
      {
        style: {display: "grid", gridTemplateColumns: "800px 200px", justifyContent: "center"}
      },
      [
        h("div", {style: {display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))"}}, [
          h.if(user != null)(Card, {
              interactive: true,
              style: {
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                padding: "0.5em",
                margin: "0.5em",
                borderRadius: "0.5em",
                backgroundColor: "#f0f0f0",
                overflow: "scroll"
              },
              onClick: () => {
                window.location = "/maps/ingestion/add"
              }
            }, [
              h("div", {style: {display: "flex", margin: "auto"}}, [
                h(Icon, {
                  icon: "add",
                  size: 36,
                  style: {
                    margin: "auto"
                  }
                }, []),
                h("h3", {style: {margin: "auto", marginLeft: "7px"}}, ["Add Source Map"])
              ])
            ]
          ),
          ingestProcess.map((d) => {
            return h(
              "div",
              {
                key: d.id,
                style: { maxWidth: "1000px", width: "100%" }
              },
              [
                h(IngestProcessCard, {
                  ingestProcess: d,
                  user: user,
                }),
              ]
            );
          })
        ]),
        h("div", {
          style: {
            display: "block",
            marginTop: "7px"
          }
        }, [
          h("h3", {style: {margin: 0, marginBottom: "7px"}}, ["Tags"]),
          h(Tag, {
            value: "None",
            onClick: async () => {
              setIngestFilter("")
              const url = new URL(window.location.origin + window.location.pathname);
              url.searchParams.delete("tags")
              window.history.pushState({page: "Update Search Params"}, "Title", url);
            },
            style: {width: "100%", marginBottom: "7px"}
          }),
          tags.map((tag) => {
            return h(Tag, {
              key: tag,
              value: tag,
              onClick: async () => {

                const url = new URL(window.location.origin + window.location.pathname);
                url.searchParams.set("tags", `eq.${tag}`);
                setIngestFilter(`tags=eq.${tag}`)
                window.history.pushState({page: "Update Search Params"}, "Title", url);
              },
              style: {width: "100%", marginBottom: "7px"}
            })
          })
        ])
      ]
    ),
  ]);
}




