import React, { useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { useModelEditor } from "@macrostrat/ui-components";
import {
  Button,
  Callout,
  Card,
  Dialog,
  Divider,
  Menu,
  MenuItem,
} from "@blueprintjs/core";
import styles from "../comp.module.scss";
import { UnitsView } from "~/types";
import { FormalStratName, InformalUnitName } from "../unit";
import pg, { usePostgrest } from "~/db";
import { StratNameConceptLongI, StratNameI } from "~/types";
import { StratNameStack } from "./panel-stack";

const h = hyperStyled(styles);

export function StratNameConceptCard(props: {
  concept_id?: number;
  strat_name: string;
}) {
  const data: StratNameConceptLongI[] = usePostgrest(
    pg
      .from("strat_names_meta")
      .select("*,intervals(*),refs(*)")
      .match({ concept_id: props.concept_id })
  );

  if (!data || typeof data == "undefined") return null;

  const concept: StratNameConceptLongI = data[0];

  return h(
    Callout,
    {
      className: "concept-card",
      intent: "success",
      title: `${props.strat_name} is a part of ${concept.refs.author}`,

      style: {
        backgroundColor: concept.intervals.interval_color + "40",
      },
    },
    [
      h("p.geologic-age", [concept.province]),
      h("p.geologic-age", [
        concept.geologic_age,
        " (",
        concept.intervals.age_bottom,
        "ma",
        " - ",
        concept.intervals.age_top,
        "ma)",
      ]),
      h("p.source", [
        "reference: ",
        h("a", { href: concept.url, target: "_blank" }, [concept.refs.author]),
      ]),
    ]
  );
}

function UnitStratNameModalEditor() {
  const [open, setOpen] = useState(false);
  const { model, actions } = useModelEditor();
  const { unit }: { unit: UnitsView } = model;

  const onSubmitStratName = (e: StratNameI | null) => {
    if (!e) return;

    actions.updateState({
      model: {
        unit: {
          unit_strat_name: { $set: `${e.strat_name} ${e.rank}` },
          strat_names: { $set: e },
          strat_name_id: { $set: e.id },
        },
      },
    });
  };

  const onStratNameSelect = (e: StratNameI | null) => {
    onSubmitStratName(e);
    setOpen(false);
  };

  return h(React.Fragment, [
    h(
      Button,
      { minimal: true, onClick: () => setOpen(true), style: { padding: 0 } },
      ["(modify)"]
    ),
    h(
      Dialog,
      {
        style: { width: "600px" },
        isOpen: open,
        title: `Modify Unit #${unit.id} strat_name`,
        onClose: () => setOpen(false),
      },
      [
        h(StratNameStack, {
          col_id: unit.col_id,
          stratName: unit.strat_names,
          onStratNameSelect,
        }),
      ]
    ),
  ]);
}

export { UnitStratNameModalEditor };
