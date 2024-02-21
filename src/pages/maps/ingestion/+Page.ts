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

const h = hyper.styled(styles);

export function Page({ sources, user, url, ingest_api }) {
  return h(ContentPage, [
    h(Navbar, {}, [
      h(Navbar.Group, { align: "left" }, [h(Navbar.Heading, "Source Maps")]),
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
              window.location.href = `${ingest_api}/security/login?return_url=${return_url}`;
            },
          })
        ),
      ]),
    ]),
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
        },
      },
      sources.map((d) => {
        return h(
          "div",
          { style: { maxWidth: "1000px", width: "100%", margin: "auto" } },
          [
            h(SourceCard, {
              source: d,
              key: d.source_id,
              user: user,
            }),
          ]
        );
      })
    ),
  ]);
}

interface Source {
  source_id: number;
  slug: string;
  name: string;
  scale: number;
  raster_url?: string;
}

const SourceCard = ({
  source,
  user,
}: {
  source: Source;
  user: any | undefined;
}) => {
  const href = `/maps/${source.source_id}`;
  const edit_href = `/maps/ingestion/${source.source_id}`;
  const { slug } = source;

  const sourcesRecordURL = `/map/dev/sources/${slug}`;

  console.log("source", source);

  return h(
    Card,
    {
      interactive: true,
      onClick: () => {
        window.location = edit_href;
      },
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        padding: "0.5em",
        margin: "0.5em",
        borderRadius: "0.5em",
        backgroundColor: "#f0f0f0",
      },
    },
    [
      h("div", {}, [
        h("div.flex.row", [
          h(
            "h4",
            { style: { margin: "0px" } },
            source.source_id + " " + source.name
          ),
          h("div.spacer"),
          h("code", slug),
        ]),
        h("h6", { style: { margin: "0px" } }, source.scale),
        h.if(source.raster_url != null)([
          " ",
          h("span.raster", { style: { marginTop: ".5rem" } }, "Raster"),
        ]),
        h("a", { href: sourcesRecordURL }, "Sources record map"),
      ]),
      h("div", {}, [
        h.if(user !== undefined)([
          "",
          h(AnchorButton, { href: edit_href, icon: "edit" }, "Edit"),
        ]),
      ]),
    ]
  );
};

function SourceItem({ source }) {
  const { source_id, name } = source;
  const href = `/maps/${source_id}`;
  const edit_href = `/maps/${source_id}/edit`;
  return h("li", [
    h("span.source-id", {}, source_id),
    " ",
    h("a", { href }, [name]),
    " ",
    h("span.scale", {}, source.scale),
    h.if(source.rasterURL != null)([" ", h("span.raster", "Raster")]),
    " ",
    h("a", { href: edit_href }, [
      h(Icon, { icon: "edit", size: IconSize.SMALL }),
    ]),
  ]);
}
