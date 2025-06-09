import { Image, Navbar, Footer } from "~/components/general";
import h from "./+Page.module.sass";
import { LinkCard } from "~/components/cards";
import { useData } from "vike-react/useData";
import { isDev } from "@macrostrat-web/settings";

export function Page() {
  return h("div.page-main", [
    h("div.start", [
      h(Image, { className: "back-img cover-image", src: "cover_large.jpg" }),
      h("div.banner", [
        h("div.header", h("h1.main-title", "Macrostrat")),
        h(
          "h2.subtitle",
          "A platform for geological data exploration, integration, and analysis"
        ),
        h(MacrostratStats),
      ]),
    ]),
    h(Navbar, { className: "main-navbar" }),
    h("div.buttons", [
      h(LinkCard, { title: "Geologic Map", href: "/map/#3/40.78/-94.13" }, [
        h("p", { className: "long" }, [
          h("div.temp", {}, [
            "With over 225 maps from data providers around the world across every scale, Macrostrat is the world's largest homogenized geologic map database. Our data processing pipeline links geologic map polygons to Macrostrat column polygons, external stratigraphic name lexicons, and geochronological intervals, enabling the enhancement of the original map data and allowing for direct links into ",
            h("a", { href: "https://xdd.wisc.edu", target: "_blank" }, "xDD"),
            " (formly GeoDeepDive).",
          ]),
          h("div.temp", {}, [
            "Are you affiliated with a state or national geologic survey? ",
            h(
              "a",
              {
                href: "mailto:contact@macrostrat.org?Subject=Geologic%20Map%20Collaboration",
              },
              "Get in touch"
            ),
            " with us - we'd love to collaborate and help publicize your maps!",
          ]),
          h("div.temp", {}, [
            "Get started by ",
            h("a", { href: "/map" }, "exploring the map"),
            " or ",
            h("a", { href: "/map/sources" }, "taking a look at"),
            " which maps are currently a part of Macrostrat.",
          ]),
        ]),
      ]),
      h(LinkCard, { title: "Maps", href: "/maps" }, [
        h("p", "The spatial footprint of rocks on the Earth's surface"),
      ]),
      h(LinkCard, { title: "Columns", href: "/columns" }, [
        h(
          "p",
          "Stratigraphic and geological columns showing the organization of rocks in time"
        ),
      ]),
      h(LinkCard, { title: "Geologic Lexicon", href: "/lex" }, [
        h("p", "Geologic units and data dictionaries"),
      ]),
      h(LinkCard, { title: "Projects", href: "/projects" }, [
        h("p", "Projects for specific regions or geological problems"),
      ]),
      h(LinkCard, { title: "Rockd", href: "https://rockd.org" }, [
        h("h3.rock-info", [
          h(Image, {
            className: "rockd-png",
            src: "rockd.png",
            width: "22px",
            height: "22px",
          }),
          h("span", " Go Mobile!"),
        ]),
      ]),
      h(
        LinkCard,
        { title: "Documentation", href: "/docs" },
        h("p", "Macrostrat documentation")
      ),
      h.if(isDev)(
        LinkCard,
        { title: "Developer apps", href: "/dev" },
        h("p", "Layers and testbed apps that aren't ready for prime time")
      ),
    ]),
    Donate,
    h(Footer),
  ]);
}

const Donate = h("div.donate-container", {}, [
  h(Image, { className: "back-img donate-img", src: "donate_medium.jpg" }),
  h("div.text-donate", [
    h(
      "a",
      {
        href: "https://secure.supportuw.org/give/?id=E0A03FA3-B2A0-431C-83EE-A121A04EEB5D",
        target: "_blank",
      },
      [h("h1.title.donate-title", "Donate Now")]
    ),
    h("div.donate-info", {}, [
      "Grant funding, principally from the ",
      h(
        "a",
        { href: "http://www.nsf.gov", target: "_blank" },
        "U.S. National Science Foundation"
      ),
      ", got Macrostrat off the ground and keeps us innovating, but maintaining and growing a free and open digital resource involves ongoing expenses beyond the grant cycle, like annual certificate renewals, cloud server hosting and backup storage that keep your connection safe, domain name registrations that keep us located on the web, and system upgrades to keep us fast and efficient. If you would like to help us continue to grow and provide free resources, you can do so with a one-time or recurring gift to the UW Foundation Paleontology Program Fund in Geology. Thank you!",
    ]),
  ]),
]);

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function MacrostratStats() {
  const { stats } = useData();
  const { columns, units, polygons, projects } = stats;

  return h("div.stats", {}, [
    h("div.stat", {}, [
      h("span.top-stat#n_columns", {}, formatNumber(columns)),
      h("span.top-stat-label", {}, "Regional Rock Columns"),
    ]),
    h("div.stat", {}, [
      h("span.top-stat#n_units", {}, formatNumber(units)),
      h("span.top-stat-label", {}, "Rock Units"),
    ]),
    h("div.stat", {}, [
      h("span.top-stat#n_polys", {}, formatNumber(polygons)),
      h("span.top-stat-label", {}, "Geologic Map Polygons"),
    ]),
    h("div.stat", {}, [
      h("span.top-stat#n_names", {}, formatNumber(projects)),
      h("span.top-stat-label", {}, "Projects"),
    ]),
  ]);
}
