import React, { useState, useEffect } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { Spinner, MenuItem } from "@blueprintjs/core";
import { IntervalI } from "../../types";
import pg from "../../db";
import styles from "../comp.module.scss";
import { ItemSuggest } from "../suggest";
import { FeatureCell } from "../table";
import { ItemRenderer } from "@blueprintjs/select";

const h = hyperStyled(styles);

interface IntervalProps {
  onChange: (e: IntervalDataI) => void;
  initialSelected?: IntervalDataI;
  onQueryChange?: (e: string) => void;
  placeholder?: string;
}

export interface IntervalDataI {
  value: string;
  data: IntervalI | Partial<IntervalI>;
}

interface IntervalRowProps extends IntervalProps {
  age_bottom?: number;
  age_top?: number;
  bottom: boolean;
}

const intervalItemRenderer: ItemRenderer<IntervalDataI> = (
  item: IntervalDataI,
  { modifiers, handleClick }
) => {
  const {
    interval_name,
    age_bottom,
    age_top,
    interval_color,
    interval_type,
    id,
  } = item.data;

  const style =
    modifiers?.active ?? false
      ? {
          marginBottom: "2px",
        }
      : {
          backgroundColor: interval_color + "40", // add opaquness
          marginBottom: "2px",
        };

  return h(MenuItem, {
    key: id,
    text: h("div.interval-row", [
      `${interval_name} (${interval_type})`,
      h("i", [`${age_bottom}-${age_top} Ma`]),
    ]),
    onClick: handleClick,
    active: modifiers.active,
    style,
  });
};

function IntervalSuggest(props: IntervalProps) {
  const [intervals, setIntervals] = useState<IntervalDataI[] | []>([]);
  const getIntervals = async (query: string) => {
    if (query.length > 2) {
      const { data, error } = await pg
        .from("intervals")
        .select()
        .like("interval_name", `%${query}%`)
        .order("age_bottom")
        .limit(200);
      const d = data?.map((d: IntervalI) => {
        return { value: d.interval_name, data: d };
      });
      setIntervals(d);
    } else {
      const { data, error } = await pg
        .from("intervals")
        .select()
        .order("age_bottom")
        .limit(50);
      const d = data?.map((d: IntervalI) => {
        return { value: d.interval_name, data: d };
      });
      setIntervals(d);
    }
  };

  useEffect(() => {
    const getData = async () => {
      const { data, error } = await pg
        .from("intervals")
        .select()
        .order("age_bottom")
        .limit(50);
      const d = data?.map((d: IntervalI) => {
        return { value: d.interval_name, data: d };
      });
      setIntervals(d);
    };
    getData();
  }, []);

  return h(React.Fragment, [
    h.if(intervals == undefined)(Spinner),
    h.if(intervals != undefined)(ItemSuggest, {
      items: intervals,
      onChange: props.onChange,
      onQueryChange: getIntervals,
      initialSelected: props.initialSelected,
      itemRenderer: intervalItemRenderer,
      placeholder: props.placeholder,
    }),
  ]);
}

function IntervalRow(props: IntervalRowProps) {
  const label: string = !props.bottom ? "Top (LO): " : "Bottom (FO): ";

  const ageLabel: string = props.bottom ? "Age Bottom: " : "Age Top: ";

  return h(React.Fragment, [
    h(FeatureCell, { text: label }, [h(IntervalSuggest, { ...props })]),
    h(FeatureCell, { text: ageLabel }, [
      props.age_bottom || props.age_top,
      " ma",
    ]),
  ]);
}

export { IntervalRow, IntervalSuggest };
