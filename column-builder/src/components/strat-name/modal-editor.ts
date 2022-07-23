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
import { InformalUnitName } from "../unit";
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
  const { model: unit, actions } = useModelEditor();

  const onSubmitStratName = (e: StratNameI | null) => {
    if (!e) return;
    actions.updateState({
      model: {
        strat_names: { $push: [e] },
      },
    });
  };

  const onDelete = (id: number) => {
    const newNames = unit.strat_names.filter((sn) => sn.id != id);
    actions.updateState({
      model: {
        strat_names: { $set: newNames },
      },
    });
  };

  const onStratNameSelect = (e: StratNameI | null) => {
    onSubmitStratName(e);
  };

  return h(React.Fragment, [
    h(Button, {
      minimal: true,
      onClick: () => setOpen(true),
      icon: "edit",
      style: { padding: 0 },
    }),
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
          stratNames: unit.strat_names,
          onStratNameSelect,
          onDelete,
        }),
      ]
    ),
  ]);
}

export { UnitStratNameModalEditor };
