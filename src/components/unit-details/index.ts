import classNames from "classnames";
import { mergeAgeRanges } from "@macrostrat-web/utility-functions";
import { LithologyTag } from "~/components";
import h from "./main.module.sass";
import { Button, Popover } from "@blueprintjs/core";
import { DOMElement } from "react";
import { JSONView } from "@macrostrat/ui-components";

export function UnitDetailsPopover({
  style,
  children,
  boundary,
}: {
  style: object;
  children: React.ReactNode;
  boundary?: DOMElement<any, any>;
}) {
  const content = h(LegendPopoverContainer, children);

  return h(
    "div.popover-main",
    {
      style,
    },
    h(
      Popover,
      { content, isOpen: true, usePortal: false, boundary },
      h("span.popover-target")
    )
  );
}

export function LegendPopoverContainer({ children }) {
  return h("div.legend-panel-outer", [h("div.legend-info-panel", children)]);
}

export function LegendPanelHeader({ title, id, onClose }) {
  return h("header.legend-panel-header", [
    h.if(title != null)("h3", title),
    h("div.spacer"),
    h.if(id != null)("code", id),
    h.if(onClose != null)(Button, {
      icon: "cross",
      minimal: true,
      small: true,
      onClick() {
        onClose();
      },
    }),
  ]);
}

export function LegendJSONView({ data }) {
  return h(JSONView, { data, hideRoot: true, className: "legend-json-view" });
}

export function DataField({
  label,
  value,
  inline = true,
  showIfEmpty = false,
  className,
  children,
  unit,
}: {
  label?: string;
  value?: any;
  inline?: boolean;
  showIfEmpty?: boolean;
  className?: string;
  children?: any;
  unit?: string;
}) {
  if (!showIfEmpty && (value == null || value === "") && children == null) {
    return null;
  }

  return h("div.data-field", { className: classNames(className, { inline }) }, [
    h("div.label", label),
    h("div.data-container", [
      h.if(value != null)(Value, { value, unit }),
      children,
    ]),
  ]);
}

export type IntervalShort = {
  id: number;
  b_age: number;
  t_age: number;
  name: string;
  color: string;
  rank: number;
};

export function IntervalField({ intervals }: { intervals: IntervalShort[] }) {
  const unique = uniqueIntervals(...intervals);
  const ageRange = mergeAgeRanges(unique.map((d) => [d.b_age, d.t_age]));
  return h([
    h(
      DataField,
      {
        label: "Intervals",
      },
      [
        unique.map((interval) => {
          return h(Interval, {
            key: interval.id,
            interval,
            showAgeRange: true,
          });
        }),
        h(Value, { unit: "Ma", value: `${ageRange[0]} - ${ageRange[1]}` }),
      ]
    ),
  ]);
}

function Value({
  value,
  unit,
  children,
}: {
  value?: any;
  unit?: string;
  children?: any;
}) {
  const val = value ?? children;
  return h("span.value-container", [
    h("span.value", val),
    h.if(unit != null)([" ", h("span.unit", unit)]),
  ]);
}

function Interval({
  interval,
  showAgeRange = false,
}: {
  interval: IntervalShort;
  showAgeRange?: boolean;
}) {
  return h(LithologyTag, {
    data: interval,
  });
}

function uniqueIntervals(
  ...intervals: (IntervalShort | undefined)[]
): IntervalShort[] {
  const unique = new Map<number, IntervalShort>();
  for (const interval of intervals) {
    if (interval == null) continue;
    unique.set(interval.id, interval);
  }
  return Array.from(unique.values()).sort((a, b) => b.b_age - a.b_age);
}

export function LithologyList({ lithologies }) {
  return h(
    DataField,
    { label: "Lithologies" },
    lithologies.map((lith) => {
      return h(LithologyTag, { data: lith });
    })
  );
}
