import React, { useEffect, useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  PanelProps,
  PanelStack2,
  Panel,
  Button,
  Intent,
  Callout,
} from "@blueprintjs/core";
import styles from "./strat-name-panel.module.scss";
import { StratNameI } from "~/types";
import { StratNameSelect } from "../query-list";
import { StratNameHierarchy } from "../hierarchy";
import { StratNameConceptCard } from "../modal-editor";

const h = hyperStyled(styles);

interface SearchPanelProps {
  col_id: number;
  onSubmitStratName: (l: StratNameI) => void;
  stratName: StratNameI | null;
}

const SearchPanel: React.FC<PanelProps<SearchPanelProps>> = (props) => {
  const { col_id, onSubmitStratName } = props;

  const onItemSelect = (stratName: StratNameI) => {
    props.openPanel({
      props: { stratName, onSubmitStratName, col_id },
      renderPanel: MetaDataPanel,
    });
  };

  return h("div.strat-name-select", [
    h("h3", ["Choose a stratigraphic name"]),
    h(StratNameSelect, { col_id, onItemSelect }),
  ]);
};

interface MetaDataPanelProps {
  stratName: StratNameI | null;
  onSubmitStratName: (l: StratNameI) => void;
  col_id: number;
}

const MetaDataPanel: React.FC<PanelProps<MetaDataPanelProps>> = (props) => {
  const { stratName, onSubmitStratName, col_id } = props;

  const onBackClick = () => {
    props.closePanel();
  };

  if (!props.stratName) return h("div");
  const concept_id = props.stratName.concept_id;

  return h("div", [
    h("div.action-btns", [
      h(
        Button,
        {
          intent: Intent.WARNING,
          onClick: onBackClick,
          minimal: true,
          icon: "arrow-left",
        },
        ["Search for another"]
      ),
      h(
        Button,
        {
          minimal: true,
          intent: Intent.SUCCESS,
          onClick: () => onSubmitStratName(stratName),
          icon: "saved",
        },
        ["Save"]
      ),
    ]),
    h("div.strat-name-select", [
      h("h3", [
        `Chosen strat name: ${props.stratName?.strat_name} ${props.stratName?.rank}`,
      ]),
      h.if(concept_id != null)(StratNameConceptCard, {
        strat_name: props.stratName?.strat_name,
        concept_id,
      }),
      h.if(concept_id == null)(
        Callout,
        { intent: "warning", title: "No official lexicon" },
        [
          "This stratigraphic name is not linked to an official lexicon reference. You can use this but it may be better to find a strat_name that is linked.",
        ]
      ),
      h("h3", ["Hierarchy Summary"]),
      h("div.strat-hierarchy-constainer", [
        h(StratNameHierarchy, {
          strat_name_id: props.stratName?.id,
        }),
      ]),
    ]),
  ]);
};

interface StratNameStackProps {
  onStratNameSelect: (i: StratNameI | null) => void;
  col_id: number;
  stratName: StratNameI | null;
}

type StratPanelTypes = SearchPanelProps | MetaDataPanelProps;
type StratPanels = Panel<StratPanelTypes>;

function StratNameStack(props: StratNameStackProps) {
  const { col_id, onStratNameSelect, stratName } = props;
  const initialPanel: Panel<SearchPanelProps> = {
    props: { col_id, onSubmitStratName: onStratNameSelect, stratName },
    renderPanel: SearchPanel,
    title: "Search for a strat name",
  };

  const [currentPanelStack, setCurrentPanelStack] = useState<
    Array<StratPanels>
  >([initialPanel]);

  useEffect(() => {
    if (stratName) {
      addToPanelStack({
        props: { stratName, col_id, onSubmitStratName: onStratNameSelect },
        renderPanel: MetaDataPanel,
      });
    }
  }, []);

  const addToPanelStack = React.useCallback(
    (newPanel: StratPanels) =>
      setCurrentPanelStack((stack) => [...stack, newPanel]),
    []
  );
  const removeFromPanelStack = React.useCallback(
    () =>
      setCurrentPanelStack([
        {
          props: { col_id, onSubmitStratName: onStratNameSelect, stratName },
          renderPanel: SearchPanel,
          title: "Search for a strat name",
        },
      ]),
    []
  );

  return h(PanelStack2, {
    className: "strat-name-stack",
    stack: currentPanelStack,
    onOpen: addToPanelStack,
    onClose: removeFromPanelStack,
    renderActivePanelOnly: false,
    showPanelHeader: false,
  });
}

export { StratNameStack };
