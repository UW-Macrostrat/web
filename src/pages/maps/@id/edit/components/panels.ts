import { ReactNode, useEffect } from "react";
import { useRef } from "react";
import { useStoredState } from "@macrostrat/ui-components";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { on } from "events";
export const h = hyper.styled(styles);

export enum AdjustSide {
  LEFT = "left",
  RIGHT = "right",
}

export function WidthAdjustablePanel({
  children,
  adjustSide = AdjustSide.RIGHT,
  expand,
  className,
  storageID = null,
}: {
  children: ReactNode;
  adjustSide?: AdjustSide;
  expand?: boolean;
  className?: string;
  storageID?: string;
}) {
  const [maxWidth, setMaxWidth] = useStoredState(
    storageID,
    0,
    (v) => typeof v === "number"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMaxWidth(window.innerWidth / 2);
  }, []);

  if (expand) {
    return h("div.width-adjustable-panel", { className }, [
      h("div.width-adjustable-panel-content", {}, children),
    ]);
  }
  return h(
    "div.width-adjustable-panel",
    { style: { maxWidth: maxWidth + "px" }, className },
    [
      h.if(adjustSide == AdjustSide.LEFT)(WidthAdjuster, {
        onAdjust: (dx) => {
          const newMaxWidth = maxWidth - dx;
          setMaxWidth(newMaxWidth);
        },
      }),
      h("div.width-adjustable-panel-content", {}, children),
      h.if(adjustSide == AdjustSide.RIGHT)(WidthAdjuster, {
        onAdjust: (dx) => {
          const newMaxWidth = maxWidth + dx;
          setMaxWidth(newMaxWidth);
        },
      }),
    ]
  );
}

function WidthAdjuster({ onAdjust }: { onAdjust: (dx: number) => void }) {
  const startPosition = useRef(0);
  return h(
    "div.width-adjuster",
    {
      onDragStart: (e) => {
        startPosition.current = e.clientX;
      },
      onDragEnd: (e) => {
        const dx = e.clientX - startPosition.current;
        onAdjust(dx);
      },
      draggable: true,
    },
    []
  );
}
