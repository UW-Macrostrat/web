import { Button, MenuItem } from "@blueprintjs/core";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import { Cell, EditableCell2Props } from "@blueprintjs/table";
import React, { useMemo, useState, useEffect, memo } from "react";
import { useInDarkMode } from "@macrostrat/ui-components";
import { getColorPair } from "@macrostrat/color-utils";

// @ts-ignore
import h from "@macrostrat/hyper";

import "~/styles/blueprint-select";


interface Timescale {
  timescale_id: number;
  name: string;
}

export interface Interval {
  int_id: number;
  name: string;
  abbrev: string;
  t_age: number;
  b_age: number;
  int_type: string;
  timescales: Timescale[];
  color: string;
}

const IntervalOption: React.FC = ({
                                    interval,
                                    props: { handleClick, handleFocus, modifiers, ...restProps },
                                  }) => {
  const inDarkMode = useInDarkMode();
  const colors = getColorPair(interval?.color, inDarkMode);

  if (interval == null) {
    return h(
      MenuItem,
      {
        shouldDismissPopover: true,
        active: modifiers.active,
        disabled: modifiers.disabled,
        key: "",
        label: "",
        onClick: handleClick,
        onFocus: handleFocus,
        text: "",
        roleStructure: "listoption",
        ...restProps,
      },
      []
    );
  }

  return h(
    MenuItem,
    {
      style: colors,
      shouldDismissPopover: true,
      active: modifiers.active,
      disabled: modifiers.disabled,
      key: interval.int_id,
      label: interval.int_id.toString(),
      onClick: handleClick,
      onFocus: handleFocus,
      text: interval.name,
      roleStructure: "listoption",
      ...restProps,
    },
    []
  );
};

const IntervalOptionMemo = memo(IntervalOption);

const IntervalOptionRenderer: ItemRenderer<Interval> = (
  interval: Interval,
  props
) => {
  return h(IntervalOptionMemo, {
    key: interval.int_id,
    interval,
    props,
  });
};

const filterInterval: ItemPredicate<Interval> = (query, interval) => {
  if (interval?.name == undefined) {
    return false;
  }
  return interval.name.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

interface IntervalSelectionProps extends EditableCell2Props {
  intervals: Interval[];
  onPaste: (e) => Promise<boolean>;
  onCopy: (e) => Promise<boolean>;
}

let IntervalSelection = ({
                           value,
                           onConfirm,
                           intent,
                           intervals,
                           onPaste,
                           onCopy,
                           ...props
                         }: IntervalSelectionProps) => {
  const [active, setActive] = React.useState(false);

  const interval = useMemo(() => {
    let interval = null;
    if (intervals.length != 0) {
      interval = intervals.filter(
        (interval) => interval.int_id == parseInt(value)
      )[0];
    }

    return interval;
  }, [value, intervals, intent]);

  return h(
    Cell,
    {
      ...props,
      style: { ...props.style, padding: 0 },
    },
    [
      h(
        Select2<Interval>,
        {
          fill: true,
          items: active ? intervals : [],
          className: "update-input-group",
          popoverProps: {
            position: "bottom",
            minimal: true,
          },
          popoverContentProps: {
            onWheelCapture: (event) => event.stopPropagation(),
          },
          itemPredicate: filterInterval,
          itemRenderer: IntervalOptionRenderer,
          onItemSelect: (interval: Interval, e) => {
            onConfirm(interval.int_id.toString());
          },
          noResults: h(MenuItem, {
            disabled: true,
            text: "No results.",
            roleStructure: "listoption",
          }),
        },
        h(IntervalButton, { interval, intent, setActive })
      ),
    ]
  );
};

function IntervalButton({ interval, intent, setActive }) {
  const inDarkMode = useInDarkMode();
  const colors = getColorPair(interval?.color, inDarkMode);
  return h(
    Button,
    {
      style: {
        ...colors,
        fontSize: "12px",
        minHeight: "0px",
        padding: intent ? "0px 10px" : "1.7px 10px",
        boxShadow: "none",
        border: intent ? "2px solid green" : "none",
      },
      fill: true,
      alignText: "left",
      text: h(
        "span",
        { style: { overflow: "hidden", textOverflow: "ellipses" } },
        interval?.name ?? "Select an Interval"
      ),
      rightIcon: "double-caret-vertical",
      className: "update-input-group",
      placeholder: "Select A Filter",
      onClick: () => setActive(true),
    },
    []
  );
}

export function Page() {

  const [intervals, setIntervals] = useState<Interval[]>([]);

  useEffect(() => {
    async function getIntervals() {
      let response = await fetch(`https://macrostrat.org/api/v2/defs/intervals?timescale_id=1`);

      if (response.ok) {
        let response_data = await response.json();
        let data = response_data.success.data;
        data.sort(
          (a: Interval, b: Interval) =>
            b.timescales.length - a.timescales.length
        );
        setIntervals(data);
      }
    }

    getIntervals();
  }, []);

  return h("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
    },
  }, [
    h(IntervalSelection, {
      value: 1,
      onConfirm: () => {},
      intent: true,
      intervals: intervals
    })
  ])
}
