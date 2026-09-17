/** Surface lines and labels drawn over the column.
 *
 * A page-local stand-in for `ColumnSurfaces` in `@macrostrat/column-views`,
 * with the same contract (`surfaces`, `selectedSurface`, `onSelectSurface`);
 * this app resolves the published library, so the component here is what runs
 * until the library's surfaces view ships and is bumped. It reads the column's
 * composite scale, so it must be rendered as a child of `Column`.
 */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useCompositeScale,
  useMacrostratColumnData,
} from "@macrostrat/column-views";
import {
  type EditorSurface,
  formatAge,
  surfaceLabel,
  surfaceToken,
} from "./surfaces";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export interface SurfacesOverlayProps {
  surfaces: EditorSurface[];
  selectedSurface: string | null;
  onSelectSurface: (id: string | null) => void;
  showLabels?: boolean;
  /** Labels closer than this (px) are thinned out; the selected surface's
   * label is always shown. */
  minLabelSpacing?: number;
}

export function SurfacesOverlay(props: SurfacesOverlayProps) {
  const {
    surfaces,
    selectedSurface,
    onSelectSurface,
    showLabels = true,
    minLabelSpacing = 16,
  } = props;
  const scale = useCompositeScale();
  const { totalHeight } = useMacrostratColumnData();

  const ref = useRef<HTMLDivElement>(null);
  const extent = useUnitsColumnExtent(ref);

  let style: CSSProperties = { height: totalHeight };
  if (extent != null) {
    style = { ...style, left: extent.left, width: extent.width };
  }

  const placed = useMemo(
    () =>
      placeSurfaces(
        surfaces,
        scale,
        selectedSurface,
        showLabels,
        minLabelSpacing
      ),
    [surfaces, scale, selectedSurface, showLabels, minLabelSpacing]
  );

  return h(
    "div.surfaces-overlay",
    { ref, style, className: classNames({ measuring: extent == null }) },
    placed.map(({ surface, y, showLabel }) =>
      h(SurfaceMarker, {
        key: surface.id,
        surface,
        y,
        selected: surface.id === selectedSurface,
        showLabel,
        onSelect: onSelectSurface,
      })
    )
  );
}

interface PlacedSurface {
  surface: EditorSurface;
  y: number;
  showLabel: boolean;
}

/** Pixel positions for the surfaces, and which get a label: walking down the
 * column, a label is dropped when it would sit within `minSpacing` of the
 * last one shown. The selected surface always keeps its label. */
function placeSurfaces(
  surfaces: EditorSurface[],
  scale: (age: number) => number | null,
  selectedSurface: string | null,
  showLabels: boolean,
  minSpacing: number
): PlacedSurface[] {
  const placed: PlacedSurface[] = [];
  for (const surface of surfaces) {
    const y = scale(surface.age);
    if (y == null) continue;
    placed.push({ surface, y, showLabel: false });
  }
  placed.sort((a, b) => a.y - b.y);
  if (!showLabels) return placed;

  let lastLabelY = -Infinity;
  for (const item of placed) {
    const selected = item.surface.id === selectedSurface;
    if (selected || item.y - lastLabelY >= minSpacing) {
      item.showLabel = true;
      lastLabelY = item.y;
    }
  }
  return placed;
}

interface HorizontalExtent {
  left: number;
  width: number;
}

/** Where the units column sits within the `Column`, so the overlay covers the
 * units rather than the axes and labels. The library's class names are
 * hashed, so the container is found by a name fragment; `null` (full width)
 * when it can't be. */
function useUnitsColumnExtent(
  ref: RefObject<HTMLDivElement | null>
): HorizontalExtent | null {
  const [extent, setExtent] = useState<HorizontalExtent | null>(null);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (parent == null) return;
    const target = parent.querySelector<HTMLElement>(
      '[class*="section-units-container"]'
    );
    if (target == null) return;

    function measure() {
      const p = parent.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const next = { left: t.left - p.left, width: t.width };
      setExtent((prev) => {
        if (prev?.left === next.left && prev?.width === next.width) return prev;
        return next;
      });
    }

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return extent;
}

function SurfaceMarker({
  surface,
  y,
  selected,
  showLabel,
  onSelect,
}: {
  surface: EditorSurface;
  y: number;
  selected: boolean;
  showLabel: boolean;
  onSelect: (id: string | null) => void;
}) {
  const onClick = useCallback(
    (evt: MouseEvent) => {
      // The column deselects its unit on any click; keep ours to the surface
      evt.stopPropagation();
      if (selected) {
        onSelect(null);
      } else {
        onSelect(surface.id);
      }
    },
    [surface.id, selected, onSelect]
  );

  let label = null;
  if (showLabel) {
    label = h("div.surface-marker-label", [
      h("span.primary", surfaceLabel(surface)),
      h.if(surface.calibration != null)(
        "span.secondary",
        formatAge(surface.age)
      ),
    ]);
  }

  return h(
    "div.surface-marker",
    {
      style: { top: y },
      className: classNames(surfaceClasses(surface), { selected }),
      title: `${surfaceLabel(surface)} (${surface.status || "unspecified"})`,
      onClick,
    },
    [h("div.surface-marker-line"), label]
  );
}

/** The same status / type class tokens the library's surfaces view uses */
export function surfaceClasses(surface: {
  status?: string | null;
  type?: string | null;
}): string {
  return classNames(
    `status-${surfaceToken(surface.status)}`,
    `type-${surfaceToken(surface.type)}`
  );
}
