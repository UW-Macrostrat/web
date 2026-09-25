/** The homepage hero as the server sends it: a snapshot of the map, and the
 * live map only once the reader reaches for it.
 *
 * The live hero is mapbox-gl, WebGL, terrain and column-views — a lot of
 * JavaScript for a page most readers scroll past. So the page opens on a still
 * of exactly that map (rendered ahead of time by the snapshot route, see
 * `hero-snapshot.ts`) with the same chrome over it as HTML, and a carousel that
 * swaps stills rather than flying a camera. A press, a tap or a key on the map
 * loads the live hero; hovering or focusing it starts the download.
 *
 * Server-safe: nothing here imports mapbox-gl. With no snapshot for an area —
 * snapshots off, the renderer not yet run for a changed area — the cover photo
 * stands in, as it did before.
 */
import h from "./hero.module.sass";
import { useCallback, useState, type ReactNode } from "react";
import { AnchorButton, Icon } from "@blueprintjs/core";
import { clientOnly } from "~/components/lex/client-only";
import type { MapSnapshotImage } from "~/map-snapshots/manifest";
import { HeroContextBar, useFeaturedAreas, type Carousel } from "./hero-carousel";
import type { FeaturedArea } from "./featured-areas";
import type { HeroData } from "./+data";

const loadLiveHero = () => import("./hero.client");

const HeroLive = clientOnly(() => loadLiveHero().then((m) => m.HeroLive));

export function HeroStage({
  hero,
  coverImage,
}: {
  hero: HeroData;
  /** The photo shown for an area with no still. */
  coverImage: string;
}) {
  const carousel = useFeaturedAreas(hero.area);
  const [live, setLive] = useState(false);
  const engage = useCallback(() => setLive(true), []);
  const still = hero.snapshots?.[carousel.area.id] ?? null;

  const stillView = h(HeroStill, { carousel, still, coverImage, onEngage: engage });
  if (!live) return stillView;

  // The live hero opens wherever the carousel was left, keeping the still on
  // screen while its chunk loads and over the map until the map has drawn.
  return h(HeroLive, {
    hero: heroOpeningOn(hero, carousel.area),
    still,
    fallback: stillView,
  });
}

/** The server's seed describes the day's area. If the reader moved the
 * carousel first, the live hero opens there instead and fetches its column. */
function heroOpeningOn(hero: HeroData, area: FeaturedArea): HeroData {
  if (area.id === hero.area.id) return hero;
  return { ...hero, area, column: null };
}

function HeroStill({
  carousel,
  still,
  coverImage,
  onEngage,
}: {
  carousel: Carousel;
  still: MapSnapshotImage | null;
  coverImage: string;
  onEngage(): void;
}) {
  const engagement = useEngagement(onEngage);
  const { area } = carousel;

  let picture: ReactNode = h("div.hero-cover-photo", {
    style: { backgroundImage: `url('${coverImage}')` },
  });
  if (still != null) picture = h(StillImage, { area, image: still });

  return h([
    h("div.hero-frame.no-column", { key: "frame" }, [
      h(
        "div.hero-map-slot.hero-still",
        {
          role: "button",
          tabIndex: 0,
          "aria-label": `Load the interactive map of ${area.title}`,
          ...engagement,
        },
        [
          picture,
          h(AnchorButton, {
            className: `pz-important-button ${h["hero-explore"]}`,
            href: "/map",
            icon: "map",
            large: true,
            // A way out, not a way in: following the link shouldn't also
            // start loading the map it leaves behind.
            onPointerDown: stopPropagation,
            onKeyDown: stopPropagation,
            text: "Explore the map",
          }),
          h("div.hero-engage-hint", [
            h(Icon, { icon: "hand-up", size: 12 }),
            "Interactive map",
          ]),
          h("div.hero-overlay", h("h3.hero-title", area.title)),
          h(StillAttribution),
        ]
      ),
    ]),
    h(HeroContextBar, { key: "context", carousel }),
  ]);
}

function StillImage({
  area,
  image,
}: {
  area: FeaturedArea;
  image: MapSnapshotImage;
}) {
  return h("img.hero-still-image", {
    src: image.src,
    srcSet: image.srcSet,
    width: image.width,
    height: image.height,
    alt: `${area.title}: satellite imagery with Macrostrat's geologic map over it`,
    fetchPriority: "high",
    decoding: "async",
  });
}

/** The live map's attribution is a Mapbox control; the still is only the
 * canvas, so it carries its own. */
function StillAttribution() {
  return h("div.hero-still-attribution", [
    h("a", { href: "https://www.mapbox.com/about/maps/" }, "© Mapbox"),
    " ",
    h("a", { href: "https://www.openstreetmap.org/copyright" }, "© OpenStreetMap"),
    " ",
    h("a", { href: "https://www.maxar.com/" }, "© Maxar"),
  ]);
}

/** Pointer, touch or key on the map takes the reader to the live hero;
 * pointing at it or tabbing to it starts the download, so the press usually
 * finds the chunk already there. */
function useEngagement(onEngage: () => void) {
  const prefetch = useCallback(() => {
    loadLiveHero();
  }, []);
  const onKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onEngage();
    },
    [onEngage]
  );
  return {
    onPointerEnter: prefetch,
    onFocus: prefetch,
    onPointerDown: onEngage,
    onKeyDown,
  };
}

function stopPropagation(event) {
  event.stopPropagation();
}
