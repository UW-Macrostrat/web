import { Image, Navbar, Footer } from "../index";
import { Divider } from "@blueprintjs/core";
import h from "./main.module.sass";
import { ContentPage } from "~/layouts";

export function Page() {
  return h("div", [
    h(Navbar),
    h(ContentPage, [
      h("h1.title-about", "About Macrostrat"),
      h(Divider, { className: "divider" }),
      h("div.table", [
        h("dv.table-row", [
          h("p", "Summary"),
          h(
            "p",
            "Macrostrat is a web-based platform for the visualization and analysis of geologic data."
          ),
        ]),
        h("div.table-row", [
          h("p", "License"),
          h(
            "p",
            "All data are provided under a Creative Commons Attribution 4.0 International license"
          ),
        ]),
        h("div.table-row", [
          h("p", "Citation"),
          h(
            "p",
            "In presentations: Acknowledge Macrostrat by name. You may also include any of the Macrostrat logos accessible on this webpage. In publications: Acknowledge Macrostrat as the source of any information or data. In publications, you may cite our most recent infrastructure paper, Peters et al. (2018). In addition, you should also include citations to the original references associated with the data set that was used. These references are accessible from the API. If you would like your paper listed in the official publications, please contact us and we will provide a citation and link."
          ),
        ]),
        h("div.table-row", [
          h("p", "Collaboration"),
          h(
            "p",
            "Our small team has worked hard to compile, format, and make data available via Macrostrat. We strongly encourage and welcome active collaborations, both scientific and geoinformatic. All data are provided freely on under a CC-BY-4.0 license."
          ),
        ]),
        h("div.table-row", [
          h("p", "Funding"),
          h(
            "p",
            "Major Macrostrat data infrastructure development was supported by the US National Science Foundation (EAR-1150082, ICER-1440312), with ongoing support for data acquisition supported by NSF EAR-1948843 and ICER-1928323. Continuous and ongoing support has also been provided by the UW-Madison Department of Geoscience. If you use Macrostrat and like what we do, please consider helping out with a donation. Every contribute helps us to maintain infrastructure and keep improving."
          ),
        ]),
      ]),

      h("div.api", [
        h("div.api-circle", [h("div.api-circle-text", "API")]),
        h("div#api-text", [
          "All data contained in the Macrostrat database are freely available via our Application Programming Interface (API), which provides a ",
          "convenient way to retrieve data for analysis or application creation. For more information head over to the ",
          h("a", { href: "/api" }, "API root"),
          " to explore available routes.",
        ]),
      ]),

      h("div.apps", [
        h("h1.big-apps.app-header", "Built with Macrostrat"),
        h("div.items", [
          h("a", { href: "/sift" }, [
            h("div.app-box", [
              h(Image, { src: "logo_red.png" }),
              h("div.app-background-text", [
                "Sift",
                h("p.blurb", "Explore Macrostrat (by Macrostrat)"),
              ]),
            ]),
          ]),

          h("a", { href: "https://rockd.org" }, [
            h("div.app-box", [
              h(Image, { src: "rockd.png" }),
              h("div.app-background-text", [
                "Rockd",
                h("p.blurb", "A mobile field book, Macrostrat style."),
              ]),
            ]),
          ]),

          h("a", { href: "/map" }, [
            h("div.app-box", [
              h(Image, { src: "burwell.png" }),
              h("div.app-background-text", [
                "Map",
                h(
                  "p.blurb",
                  "Integrating the world's geologic maps (by Macrostrat)"
                ),
              ]),
            ]),
          ]),

          h(
            "a",
            {
              href: "https://itunes.apple.com/us/app/mancos/id541570878?mt=8",
              target: "_blank",
              rel: "noopener noreferrer",
            },
            [
              h("div.app-box", [
                h(Image, { src: "mancos.jpg" }),
                h("div.app-background-text", [
                  "Mancos",
                  h(
                    "p.blurb",
                    "Explore Macrostrat and PBDB in iOS (by Hunt Mountain Software)"
                  ),
                ]),
              ]),
            ]
          ),

          h(
            "a",
            {
              href: "http://fc.umn.edu/",
              target: "_blank",
              rel: "noopener noreferrer",
            },
            [
              h("div.app-box", [
                h(Image, { src: "foc.png" }),
                h("div.app-background-text", [
                  "FOC",
                  h(
                    "p.blurb",
                    "A glass bottom jet (by Amy Myrbo, Shane Loeffler et al.)"
                  ),
                ]),
              ]),
            ]
          ),

          h(
            "a",
            { href: "https://github.com/UW-Macrostrat/node-api-template" },
            [
              h("div.app-box", [
                h(Image, { src: "api.png" }),
                h("div.app-background-text.app-background-text-small", [
                  "API Template",
                  h(
                    "p.blurb",
                    "Foundation of all Macrostrat services (by Macrostrat)"
                  ),
                ]),
              ]),
            ]
          ),
        ]),
      ]),

      h(Footer),
    ]),
  ]);
}
