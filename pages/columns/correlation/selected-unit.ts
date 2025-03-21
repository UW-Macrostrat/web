import { ForeignObject, useColumn } from "@macrostrat/column-components";
import { UnitDetailsPanel, useSelectedUnit } from "@macrostrat/column-views";
import { DOMElement } from "react";
import { UnitDetailsPopover } from "~/components/unit-details";
import h from "@macrostrat/hyper";

export function SelectedUnitPopoverContainer({ width, height, padding = 0 }) {
  const extraWidth = padding * 2;

  return h(
    ForeignObject,
    {
      width: width + extraWidth,
      height: height + extraWidth,
      style: {
        transform: `translate(-${padding}px, -${padding}px)`,
        pointerEvents: "none",
      },
    },
    h(
      "div.selected-unit-popover-container",
      {
        style: {
          width,
          height,
          transform: `translate(${padding}px, ${padding}px)`,
        },
      },
      [h(SelectedUnitPopover, { width })]
    )
  );
}

function SelectedUnitPopover<T>({
  width,
  scrollParentRef,
}: {
  width: number;
  scrollParentRef: React.RefObject<DOMElement<any, any>>;
}) {
  const { scale, divisions } = useColumn();

  const item0 = useSelectedUnit();
  const item = divisions.find((d) => d.unit_id == item0?.unit_id);

  if (item == null) {
    return null;
  }

  const { t_age, b_age } = item0;
  const range = [b_age, t_age];

  const content = h(UnitDetailsPanel, {
    unit: item,
    showLithologyProportions: true,
  });

  const top = scale(range[1]);
  const bottom = scale(range[0]);

  return h(
    UnitDetailsPopover,
    {
      style: {
        top,
        left: 0,
        width,
        height: bottom - top,
      },
      boundary: scrollParentRef?.current,
      usePortal: true,
    },
    content
  );
}
