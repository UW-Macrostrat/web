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
import IngestProcessCard from "~/pages/maps/ingestion/components/IngestProcessCard";
import { useEffect, useState, useContext } from "react";

const h = hyper.styled(styles);


export function Page({ user, url }) {

  const [ingestProcess, setIngestProcess] = useState<IngestProcess[]>([])

  useEffect(() => {
    const getIngestProcesses = async () => {
      const response = await fetch(`${ingestPrefix}/ingest-process?source_id=order_by&source_id=not.is.null&state=eq.ingested&page_size=1000`);
      const ingest_processes = await response.json();
      setIngestProcess(ingest_processes);
    }
    getIngestProcesses();
  }, [])


  return h("div", [
    h(Navbar, {}, [
      h(Navbar.Group, { align: "left" }, [h(Navbar.Heading, "Map Ingestion")]),
      h(Navbar.Group, { align: "right" }, [
        h(
          Tooltip,
          { content: user == undefined ? "Log In" : "Logged In" },
          h(AnchorButton, {
            icon: user == undefined ? "log-in" : "user",
            style: {
              margin: "0 0.5em",
              borderRadius: "50%",
              backgroundColor: user == undefined ? "#fdeb88" : "#90d090",
            },
            onClick() {
              // Assemble the return URL on click based on the current page
              const return_url =
                window.location.origin + window.location.pathname;
              window.location.href = `${ingestPrefix}/security/login?return_url=${return_url}`;
            },
          })
        ),
      ]),
    ]),
    h(ContentPage, [
        h("div", {style: {display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))"}}, [
          ingestProcess.map((d) => {
            return h(
              "div",
              { style: { maxWidth: "1000px", width: "100%", margin: "auto" } },
              [
                h(IngestProcessCard, {
                  ingestProcess: d,
                  user: user,
                }),
              ]
            );
          })
        ])
      ]
    ),
  ]);
}




