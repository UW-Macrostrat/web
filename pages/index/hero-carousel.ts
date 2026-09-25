/** The featured-area carousel under the hero: which area is showing, and the
 * row of dots and arrows that moves through them.
 *
 * Its own module because both halves of the hero use it. The still — the
 * server-rendered snapshot the page opens on — swaps images with it, and the
 * live hero flies the camera with it; neither should pull the other's
 * dependencies in, and the still in particular must not reach mapbox-gl.
 */
import h from "./hero.module.sass";
import { useCallback, useState } from "react";
import { Button } from "@blueprintjs/core";
import { featuredAreas, type FeaturedArea } from "./featured-areas";

export interface Carousel {
  areas: FeaturedArea[];
  area: FeaturedArea;
  index: number;
  go(index: number): void;
}

/** The areas on offer and which one is showing. The list is the fixed one the
 * server also knows, so the browser opens on exactly what was rendered. */
export function useFeaturedAreas(serverArea: FeaturedArea): Carousel {
  const areas = featuredAreas;

  const [index, setIndex] = useState(() => {
    const i = areas.findIndex((a) => a.id === serverArea.id);
    return i < 0 ? 0 : i;
  });

  const go = useCallback(
    (next: number) => {
      const count = areas.length;
      setIndex(((next % count) + count) % count);
    },
    [areas.length]
  );

  return { areas, area: areas[index], index, go };
}

function dotButton(
  item: FeaturedArea,
  i: number,
  index: number,
  go: (n: number) => void
) {
  let className = undefined;
  if (i === index) className = "active";
  return h("button.caption-dot", {
    key: item.id,
    className,
    title: item.title,
    "aria-label": item.title,
    onClick: () => go(i),
  });
}

/** Under the hero: the way through the featured areas, and nothing else. The
 * name and the age range moved onto the map itself, where what they describe
 * is. */
export function HeroContextBar({ carousel }: { carousel: Carousel }) {
  const { areas, index, go } = carousel;
  if (areas.length < 2) return null;

  return h(
    "div.hero-context",
    h("div.caption-nav", [
      h(Button, {
        minimal: true,
        small: true,
        icon: "chevron-left",
        title: "Previous area",
        onClick: () => go(index - 1),
      }),
      h(
        "div.caption-dots",
        areas.map((item, i) => dotButton(item, i, index, go))
      ),
      h(Button, {
        minimal: true,
        small: true,
        icon: "chevron-right",
        title: "Next area",
        onClick: () => go(index + 1),
      }),
    ])
  );
}
