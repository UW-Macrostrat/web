import { Image, SiteTitle } from "~/components/general";
import { LinkCard } from "~/components/cards";
import { Link } from "~/components";
import { useData } from "vike-react/useData";
import { webAssetsPrefix } from "@macrostrat-web/settings";
import { AnchorButton } from "@blueprintjs/core";
import h from "./+Page.module.sass";
import { platformNavItems } from "~/layouts/footer";
import { clientOnly } from "~/components/lex/client-only";
import type { HeroData } from "./+data";

/** The live map-and-column hero reaches mapbox-gl, so it loads on the client
 * only; the static hero stands in until then (and when no column was found). */
const HeroLive = clientOnly(() =>
  import("./hero.client").then((m) => m.HeroLive)
);

/** The homepage: what Macrostrat is in a line, the data itself, a few entry
 * points, what is new, and an honest beta notice. Design notes live in the
 * workbench feature area "Homepage design and layout". */
export default function Page() {
  return h("div.page-main", [
    h(BetaNotice),
    h("header.site-header", [
      h(SiteTitle, { className: "main-title" }, [
        h("h2.subtitle", "The data system for the crust"),
      ]),
    ]),
    h(Hero),
    h(EntryPoints),
    h(WhatsNew),
    h(PlatformLinks),
  ]);
}

function BetaNotice() {
  return h("div.beta-notice", [
    h("strong", "Macrostrat v2 is in beta."),
    " The data are real and some things will be rough. ",
    h(Link, { href: "/community" }, "Tell us what you find."),
  ]);
}

function Hero() {
  const { hero } = useData() as { hero: HeroData | null };

  let panel;
  if (hero != null) {
    panel = h(HeroLive, { hero, fallback: h(HeroStatic) });
  } else {
    panel = h(HeroStatic);
  }

  return h("section.hero", [
    h("div.hero-lead", [
      h("p.hero-text", [
        "Geologic maps and stratigraphic columns, integrated into one model of ",
        "the Earth's crust through time.",
      ]),
      h(HeroCaption, { hero }),
      h(MacrostratStats),
    ]),
    h("div.hero-panel", panel),
  ]);
}

/** What the live panel is showing, so the map and column read as one place. */
function HeroCaption({ hero }: { hero: HeroData | null }) {
  if (hero == null) return null;
  const { location, column } = hero;
  return h("p.hero-caption", [
    "Beneath ",
    h("strong", location.name),
    ": the ",
    h(Link, { href: `/columns/${column.col_id}` }, column.col_name),
    ` column, ${column.t_units} rock units spanning ${formatAge(column.b_age)} of Earth history.`,
  ]);
}

function formatAge(ma: number): string {
  if (ma >= 1000) return `${(ma / 1000).toFixed(1)} billion years`;
  return `${Math.round(ma)} million years`;
}

function HeroStatic() {
  return h("div.hero-static", {
    style: {
      backgroundImage: `url('${webAssetsPrefix}/main-page/cover_large.jpg')`,
    },
  });
}

const entryPoints = [
  {
    title: "Map",
    href: "/map/#3/40.78/-94.13",
    text: "The world's geologic maps, harmonized into one.",
  },
  {
    title: "Columns",
    href: "/columns",
    text: "The rock record through time, region by region.",
  },
  {
    title: "Lexicon",
    href: "/lex",
    text: "Stratigraphic names, lithologies, intervals and environments.",
  },
  {
    title: "Projects",
    href: "/projects",
    text: "Columns and maps for specific regions and problems.",
  },
  {
    title: "Rockd",
    href: "https://rockd.org",
    text: "The mobile field companion. Explore and record the geology around you.",
    image: "rockd.png",
  },
];

function EntryPoints() {
  return h(
    "nav.entry-points",
    entryPoints.map((item) => {
      let icon = null;
      if (item.image != null) {
        icon = h(Image, { className: "entry-icon", src: item.image, width: "22px", height: "22px" });
      }
      return h(LinkCard, { key: item.href, title: item.title, href: item.href, className: "entry-card" }, [
        h("p", [icon, item.text]),
      ]);
    })
  );
}

function WhatsNew() {
  const { news } = useData() as any;
  const posts: any[] = news ?? [];
  if (posts.length === 0) return null;
  return h("section.whats-new", [
    h("h2", "What's new"),
    h(
      "ul.news-list",
      posts.map((post) =>
        h("li.news-item", { key: post.href }, [
          h("span.news-date", post.date),
          h(Link, { href: post.href }, post.title),
          h("span.news-summary", post.summary),
        ])
      )
    ),
    h(Link, { href: "/news", className: "news-more" }, "All news"),
  ]);
}

/** The pages about the project, below the data rather than in a header. Same
 * list the footer uses, so the two never disagree. */
function PlatformLinks() {
  const items = platformNavItems.filter((item) => item.href !== "/heatmap");
  return h("nav.platform-links", [
    h("h2", "About the project"),
    h(
      "ul",
      items.map((item) =>
        h(
          "li",
          { key: item.href },
          h(AnchorButton, { href: item.href, icon: item.icon, minimal: true, large: true }, item.text)
        )
      )
    ),
  ]);
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function MacrostratStats() {
  const { stats } = useData() as any;
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
