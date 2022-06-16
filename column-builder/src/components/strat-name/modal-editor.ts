import React, { useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { useModelEditor } from "@macrostrat/ui-components";
import {
  Button,
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
import { StratNameHierarchy } from "./hierarchy";

const h = hyperStyled(styles);

function StratNameConceptCard(props: {
  concept_id: number;
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
    Card,
    {
      className: "concept-card",
      style: {
        backgroundColor: concept.intervals.interval_color + "40",
      },
    },
    [
      h("h4.underline", [
        `${props.strat_name} is connected to an official lexicon: ${concept.name}`,
      ]),
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

/* 
component that can 'suggest' strat_names that may be 
related and are linked to concepts

This can have multiple states:
    1. Where theres no info except col_id: can suggest any strat_name with concept
    2. informal name given, should try to search text based by that.
    3. Informal & Formal strat_name given
        - 1. formal name isn't connected to a concept
        - 2. formal name IS connected to a concept
*/
function RelatedLinkedStratNames() {
  const { model, actions } = useModelEditor();
  const { unit }: { unit: UnitsView } = model;
  const { col_id } = unit;

  const data: StratNameI[] = usePostgrest(
    pg
      .rpc("get_strat_names_col_priority", { _col_id: col_id })
      .select("*,strat_names_meta(*)")
      .limit(10)
  );

  const updateStratName = (e: StratNameI) => {
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

  return h(Card, { className: "related-strat-card" }, [
    h("h3", ["Suggested strat names"]),
    h(Divider),
    h(Menu, [
      data
        ? data.map((strat, i) => {
            return h(MenuItem, {
              key: i,
              text: strat.strat_name,
              onClick: () => updateStratName(strat),
            });
          })
        : "Fetching strat names...",
    ]),
  ]);
}

function UnitStratNameModalEditor() {
  const [open, setOpen] = useState(false);
  const { model, actions } = useModelEditor();
  const { unit }: { unit: UnitsView } = model;

  const concept_id = unit.strat_names?.strat_names_meta?.concept_id;

  return h(React.Fragment, [
    h(
      Button,
      { minimal: true, onClick: () => setOpen(true), style: { padding: 0 } },
      ["(modify)"]
    ),
    h(
      Dialog,
      {
        isOpen: open,
        title: `Modify Unit #${unit.id} strat_name`,
        onClose: () => setOpen(false),
      },
      [
        h("div.strat-name-dialog-container", [
          h("div.left", [h(InformalUnitName), h(FormalStratName)]),
          h("div.right", [h(RelatedLinkedStratNames)]),
        ]),
        h("div.strat-dialog-bottom", [
          //@ts-ignore
          h.if(typeof concept_id !== "undefined")(StratNameConceptCard, {
            strat_name: unit.strat_names?.strat_name,
            concept_id,
          }),

          h("div", [
            h("h3", [
              unit.strat_names
                ? "Hierarchy Summary"
                : "Choose a strat name to view hierarchy",
            ]),
            h(StratNameHierarchy, {
              strat_name_id: unit.strat_names?.id,
            }),
          ]),
        ]),
      ]
    ),
  ]);
}

export { UnitStratNameModalEditor };
