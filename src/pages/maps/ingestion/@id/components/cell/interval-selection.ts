import { Button, MenuItem } from "@blueprintjs/core";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import { Cell, EditableCell2Props } from "@blueprintjs/table";
import React, { useMemo, memo } from "react";

// @ts-ignore
import hyper from "@macrostrat/hyper";

import "~/styles/blueprint-select";
import styles from "../../edit-table.module.sass";

const h = hyper.styled(styles);

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
  console.log("test");

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
      style: { backgroundColor: interval.color },
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

let IntervalSelection = ({
  value,
  onConfirm,
  intent,
  intervals,
  ...props
}: EditableCell2Props & { intervals: Interval[] }) => {
  const [localValue, setLocalValue] = React.useState<string>(value);

  const interval = useMemo(() => {
    let interval = null;
    if (intervals.length != 0) {
      interval = intervals.filter(
        (interval) => interval.int_id == parseInt(value)
      )[0];
    }

    return interval;
  }, [value, localValue, intervals]);

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
          items: intervals,
          className: "update-input-group",
          popoverProps: {
            position: "bottom",
            minimal: true,
          },
          popoverContentProps: {
            onWheelCapture: (event) => event.stopPropagation(),
          },
          itemRenderer: IntervalOptionRenderer,
          onItemSelect: (interval: Interval, e) => {
            onConfirm(interval.int_id.toString());
            setLocalValue(interval.int_id.toString());
          },
          noResults: h(MenuItem, {
            disabled: true,
            text: "No results.",
            roleStructure: "listoption",
          }),
        },
        [
          h(
            Button,
            {
              style: {
                backgroundColor: interval?.color ?? "white",
                fontSize: "12px",
                minHeight: "0px",
                padding: "1.7px 10px",
                boxShadow: "none",
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
            },
            []
          ),
        ]
      ),
    ]
  );
};

IntervalSelection = memo(IntervalSelection);

export default IntervalSelection;
