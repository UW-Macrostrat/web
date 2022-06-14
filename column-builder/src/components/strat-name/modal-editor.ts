import React, { useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { useModelEditor } from "@macrostrat/ui-components";
import { Button, Card, Dialog, Divider } from "@blueprintjs/core";
import styles from "../comp.module.scss";
import { UnitsView } from "~/types";
import { FormalStratName, InformalUnitName } from "../unit";
import pg, { usePostgrest } from "~/db";
import { StratNameConceptLongI } from "~/types";
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
*/
function RelatedLinkedStratNames() {
  return h(Card, { className: "related-strat-card" }, [
    h("h3", ["Suggested strat names"]),
    h(Divider),
    h("div", [h(Button, ["Fake Strat Name"])]),
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

          h.if(typeof unit.strat_names?.id !== "undefined")("div", [
            h("h3", ["Hierarchy Summary"]),
            h(StratNameHierarchy, {
              strat_name_id: unit.strat_names.id,
            }),
          ]),
        ]),
      ]
    ),
  ]);
}

export { UnitStratNameModalEditor };
