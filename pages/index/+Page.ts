import { Image, Navbar, Footer, SiteTitle } from "~/components/general";
import hyper from "@macrostrat/hyper";
import { LinkCard } from "~/components/cards";
import { useData } from "vike-react/useData";
import { isDev, webAssetsPrefix } from "@macrostrat-web/settings";
import styles from "./+Page.module.sass";

const h = hyper.styled(styles);

export default function Page() {
  return h("div.page-main", [
    h("header.site-header", [
      h(SiteTitle, { className: "main-title" }, [
        h("h2.subtitle", "The data system for the crust"),
      ]),
    ]),
    h(Navbar, { className: "site-navbar" }),
    h("div.hero", [
      h("div.hero-backdrop", {
        style: {
          // Put the background image here to allow us to dynamically change the prefix
          backgroundImage: `url('${webAssetsPrefix}/main-page/cover_large.jpg')`,
        },
      }),
      h("div.hero-content", [
        h("p.hero-text", [
          "Macrostrat integrates geologic maps and stratigraphic columns " +
            "into a  model of the Earth's crustal framework through time.",
        ]),
        h(MacrostratStats),
      ]),
    ]),
    h("div.buttons", [
      h("h2", "Geologic maps"),
      h(LinkCard, { title: "Map interface", href: "/map/#3/40.78/-94.13" }, [
        "An integrated geological map of the world",
      ]),
      h(
        LinkCard,
        { title: "Map index", href: "/maps" },
        "Maps from different data providers that have been integrated into Macrostrat"
      ),
      h("div.details", [
        h("p", {}, [
          "With over 225 maps from data providers around the world at every scale, Macrostrat is the world's largest homogenized geologic map database. ",
          "Our data processing pipeline links geologic map polygons to stratigraphic columns, external stratigraphic name lexicons, and geochronological intervals. ",
          "This enhancement of map data allows for direct links to the literature via ",
          h("a", { href: "https://xdd.wisc.edu", target: "_blank" }, "xDD"),
          " (formly GeoDeepDive).",
        ]),
        h("p", [
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
        h("p", {}, [
          "Get started by ",
          h("a", { href: "/map" }, "exploring the map"),
          " or ",
          h("a", { href: "/map/sources" }, "taking a look at"),
          " which maps are currently a part of Macrostrat.",
        ]),
      ]),
      h("h2", "Stratigraphic columns"),
      h(LinkCard, { title: "Columns", href: "/columns" }, [
        "Regional and local descriptions of the evolution of the Earth's crust through time",
      ]),
      h(
        "p",
        "Macrostrat's stratigraphic columns account for the organization of rocks in the crust and their evolution over Earth history."
      ),
      h(
        "p",
        "Macrostrat stores both regional columns that represent a unified chronostratigraphic framework and measured sections and drill core logs that provide detailed information about specific locations."
      ),

      h(LinkCard, { title: "Macrostrat Lexicon", href: "/lex" }, [
        h(
          "p",
          "Comprehensive searchable list of stratigraphic names, lithologies, environments and more"
        ),
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
          " Go mobile!",
        ]),
      ]),
      h(
        LinkCard,
        { title: "Usage Map", href: "/usage-map" },
        h("p", "Macrostrat usage map")
      ),
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
    h(Donate),
    h(Footer),
  ]);
}

const Donate = () =>
  h("div.donate-container", {}, [
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
      h("span.top-stat-label", {}, "columns"),
    ]),
    h("div.stat", {}, [
      h("span.top-stat#n_units", {}, formatNumber(units)),
      h("span.top-stat-label", {}, "rock units"),
    ]),
    h("div.stat", {}, [
      h("span.top-stat#n_polys", {}, formatNumber(polygons)),
      h("span.top-stat-label", {}, "map polygons"),
    ]),
    h("div.stat", {}, [
      h("span.top-stat#n_names", {}, formatNumber(projects)),
      h("span.top-stat-label", {}, "projects"),
    ]),
  ]);
}
