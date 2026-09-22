import {
  Image,
  MacrostratIcon,
  MacrostratIconStyle,
  SiteTitle,
} from "~/components/general";
import { LinkCard } from "~/components/cards";
import { Link, StickyHeader } from "~/components";
import { useData } from "vike-react/useData";
import { webAssetsPrefix } from "@macrostrat-web/settings";
import h from "./+Page.module.sass";
import { platformNavItems } from "~/layouts/footer";
import { clientOnly } from "~/components/lex/client-only";
import {
  LexSearchHost,
  SiteSearchPrompt,
} from "~/components/lex/search-omnibar";
import type { HeroData } from "./+data";

/** The live map-and-column hero reaches mapbox-gl, so it loads on the client
 * only; the static cover photo stands in until it mounts. */
const HeroLive = clientOnly(() =>
  import("./hero.client").then((m) => m.HeroLive)
);

/** The homepage: what Macrostrat is in a line, the data itself, a few entry
 * points, what is new, and an honest beta notice. Design notes live in the
 * workbench feature area "Homepage design and layout". */
export default function Page() {
  return h("div.page-main", [
    // Everything above the hero, and nothing else: the wordmark, the tagline
    // and the beta tag on the left, the site search on the right. The class
    // goes on `StickyHeader` itself rather than on a wrapper around it: a
    // sticky element can only travel inside its own parent, so a wrapper sized
    // to the header leaves it nowhere to stick. `.is-stuck`, where the title
    // shrinks, comes from `StickyHeader`.
    h(StickyHeader, { className: h["site-header"] }, [
      h("div.site-header-inner", [
        // `className` on a component is a prop, not a tag class, so the style
        // module doesn't scope it — look the hashed name up instead.
        h(
          SiteTitle,
          { className: h["main-title"], logo: h(DissolvingLogo) },
          [h("h2.subtitle", "The data system for the crust")]
        ),
        h(V2BetaTag),
        h("div.site-search", h(SiteSearchPrompt)),
      ]),
    ]),
    // The one omnibar instance the search prompt opens (also on ⌘K).
    h(LexSearchHost),
    h(Hero),
    h(MacrostratStats),
    h(SiteLead),
    h(EntryPoints),
    h(WhatsNew),
    h(PlatformLinks),
  ]);
}

/** The two marks, stacked and cross-faded: the full logo while the header is at
 * its own size, the simple one — what the breadcrumbs carry on every other page
 * — once it sticks. Two images rather than one whose `src` changes, because a
 * swapped `src` cannot dissolve; which of them shows is decided by `.is-stuck`
 * in the stylesheet. */
function DissolvingLogo() {
  return h("span.logo-dissolve", [
    h(MacrostratIcon, { className: h["logo-full"] }),
    h(MacrostratIcon, {
      iconStyle: MacrostratIconStyle.SIMPLE,
      className: h["logo-simple"],
    }),
  ]);
}

/** That this is v2 and a beta is worth one tag beside the wordmark, not a
 * banner across the top of the page. It leads to `/community`, which is where
 * the feedback the banner used to ask for actually goes. */
function V2BetaTag() {
  return h(
    Link,
    {
      href: "/community",
      className: h["v2-beta-tag"],
      title: "Macrostrat v2 is in beta — tell us what you find",
    },
    "v2 beta 🎉"
  );
}

/** The hero: the map, the column inset over it, and the age filter and credits
 * beneath — all of it live, with the cover photo standing in until it mounts. */
function Hero() {
  const { hero } = useData() as { hero: HeroData | null };

  let content;
  if (hero != null) {
    content = h(HeroLive, { hero, fallback: h(HeroStatic) });
  } else {
    // Only when the day's location couldn't be resolved at all.
    content = h(HeroStatic);
  }

  return h("section.hero", content);
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

/** What Macrostrat is, in a line. It used to sit in the header; the header is
 * now the wordmark and the search and nothing else. */
function SiteLead() {
  return h("p.site-lead", [
    "Geologic maps and stratigraphic columns, integrated into one model of ",
    "the Earth's crust through time.",
  ]);
}

function EntryPoints() {
  return h(
    "nav.entry-points",
    entryPoints.map((item) => {
      let icon = null;
      if (item.image != null) {
        icon = h(Image, {
          className: "entry-icon",
          src: item.image,
          width: "22px",
          height: "22px",
        });
      }
      return h(
        LinkCard,
        {
          key: item.href,
          title: item.title,
          href: item.href,
          className: "entry-card",
        },
        [h("p", [icon, item.text])]
      );
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
 * list the footer uses, so the two never disagree — and the same card as the
 * entry points above, quieter, so the page reads as one set of boxes rather
 * than as content followed by a row of buttons. */
function PlatformLinks() {
  const items = platformNavItems.filter((item) => item.href !== "/heatmap");
  return h("nav.platform-links", [
    h("h2", "About the project"),
    h(
      "div.platform-cards",
      items.map((item) =>
        h(
          LinkCard,
          {
            key: item.href,
            title: item.text,
            href: item.href,
            className: "platform-card",
          },
          [h("p", item.description)]
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
