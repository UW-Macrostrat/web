import React, { useState, useEffect } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { Spinner } from "@blueprintjs/core";
import { IntervalI } from "../../types";
import pg from "../../db";
import styles from "../comp.module.scss";
import { MySuggest } from "../suggest";
import { FeatureCell } from "../table";

const h = hyperStyled(styles);

interface IntervalProps {
  onChange: (e: IntervalDataI) => void;
  initialSelected?: IntervalDataI;
  onQueryChange?: (e: string) => void;
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

function IntervalRow(props: IntervalRowProps) {
  const [intervals, setIntervals] = useState<IntervalDataI[] | []>([]);
  const getIntervals = async (query: string) => {
    if (query.length > 2) {
      const { data, error } = await pg
        .from("intervals")
        .select()
        .like("interval_name", `%${query}%`)
        .limit(200);
      const d = data?.map((d: IntervalI) => {
        return { value: d.interval_name, data: d };
      });
      setIntervals(d);
    } else {
      const { data, error } = await pg.from("intervals").select().limit(50);
      const d = data?.map((d: IntervalI) => {
        return { value: d.interval_name, data: d };
      });
      setIntervals(d);
    }
  };

  useEffect(() => {
    const getData = async () => {
      const { data, error } = await pg.from("intervals").select().limit(50);
      const d = data?.map((d: IntervalI) => {
        return { value: d.interval_name, data: d };
      });
      setIntervals(d);
    };
    getData();
  }, []);

  const label: string = !props.bottom ? "Top (LO): " : "Bottom (FO): ";

  const ageLabel: string = props.bottom ? "Age Bottom: " : "Age Top: ";

  return h(React.Fragment, [
    h(FeatureCell, { text: label }, [
      h.if(intervals == undefined)(Spinner),
      h.if(intervals != undefined)(MySuggest, {
        items: intervals,
        onChange: props.onChange,
        onQueryChange: getIntervals,
        initialSelected: props.initialSelected,
      }),
    ]),
    h(FeatureCell, { text: ageLabel }, [
      (props.age_bottom || props.age_top, " ma"),
    ]),
  ]);
}

export { IntervalRow };
