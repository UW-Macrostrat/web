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
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Card, Icon } from "@blueprintjs/core";
import { clientOnly } from "~/components/lex/client-only";
import type { MapSnapshotImage } from "~/map-snapshots/spec";
import { HeroContextBar, useFeaturedAreas, type Carousel } from "./hero-carousel";
import type { FeaturedArea } from "./featured-areas";
import type { HeroData } from "./+data";
import type { StaticHeroColumn } from "./hero-column";

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
  const stillColumn = useStillColumn(hero, carousel.area);

  const stillView = h(HeroStill, {
    carousel,
    still,
    stillColumn,
    coverImage,
    onEngage: engage,
  });
  if (!live) return stillView;

  // The live hero opens wherever the carousel was left, keeping the still on
  // screen while its chunk loads and over the map until the map has drawn.
  return h(HeroLive, {
    hero: heroOpeningOn(hero, carousel.area),
    still,
    fallback: stillView,
  });
}

/** The still's column for the area showing. The opening area's comes with the
 * page; another's is fetched as static markup when the carousel reaches it,
 * and kept. `undefined` while that fetch is out, null when there is none. */
function useStillColumn(
  hero: HeroData,
  area: FeaturedArea
): StaticHeroColumn | null | undefined {
  const [columns, setColumns] = useState<
    Record<string, StaticHeroColumn | null>
  >(() => ({ [hero.area.id]: hero.stillColumn ?? null }));
  const known = area.id in columns;

  useEffect(() => {
    if (known) return;
    let cancelled = false;
    fetch(`/_hero/still-column/${encodeURIComponent(area.id)}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .catch(() => null)
      .then((column) => {
        if (cancelled) return;
        setColumns((prev) => ({ ...prev, [area.id]: column }));
      });
    return () => {
      cancelled = true;
    };
  }, [area.id, known]);

  return columns[area.id];
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
  stillColumn,
  coverImage,
  onEngage,
}: {
  carousel: Carousel;
  still: MapSnapshotImage | null;
  stillColumn: StaticHeroColumn | null | undefined;
  coverImage: string;
  onEngage(): void;
}) {
  const engagement = useEngagement(onEngage);
  const { area } = carousel;

  // The same two cells as the live hero, so engaging doesn't move anything.
  // An area with a column keeps its slot while the markup is on its way, so
  // the map doesn't widen and narrow as the carousel moves.
  let frameTag = "div.hero-frame";
  let columnSlot: ReactNode = h(
    "div.hero-column-slot",
    h(Card, { className: h["hero-column-panel"] })
  );
  if (stillColumn != null) {
    columnSlot = h(StillColumn, { key: area.id, column: stillColumn, onEngage });
  } else if (stillColumn === null) {
    frameTag = "div.hero-frame.no-column";
    columnSlot = null;
  }

  let picture: ReactNode = h("div.hero-cover-photo", {
    style: { backgroundImage: `url('${coverImage}')` },
  });
  if (still != null) picture = h(StillImage, { area, image: still });

  return h([
    h(frameTag, { key: "frame" }, [
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
          h("div.hero-engage-hint", [
            h(Icon, { icon: "hand-up", size: 12 }),
            "Interactive map",
          ]),
          h("div.hero-overlay", h("h3.hero-title", area.title)),
          h(StillAttribution),
        ]
      ),
      columnSlot,
    ]),
    h(HeroContextBar, { key: "context", carousel }),
  ]);
}

/** The column, as the server rendered it: static markup in both themes, one
 * shown by CSS. No column JavaScript runs here; pressing the column loads the
 * live hero, as pressing the map does — except on its name, which is a link. */
function StillColumn({
  column,
  onEngage,
}: {
  column: StaticHeroColumn;
  onEngage(): void;
}) {
  const onPointerDown = useCallback(
    (event) => {
      if (event.target.closest?.("a") != null) return;
      onEngage();
    },
    [onEngage]
  );
  return h("div.hero-column-slot.hero-still-column", { onPointerDown }, [
    h("div.still-column-light", {
      dangerouslySetInnerHTML: { __html: column.light },
    }),
    h("div.still-column-dark", {
      dangerouslySetInnerHTML: { __html: column.dark },
    }),
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
