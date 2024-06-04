import React, { useContext, useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  PanelProps,
  PanelStack2,
  Panel,
  Button,
  Intent,
  Callout,
  Menu,
  MenuItem,
  FormGroup,
  InputGroup,
  ControlGroup,
} from "@blueprintjs/core";
import styles from "./strat-name-panel.module.scss";
import { StratNameI } from "~/types";
import { StratNameListItem, StratNameSelect } from "../query-list";
import { StratNameHierarchy } from "../hierarchy";
import { StratNameConceptCard } from "../modal-editor";
import { RankSelect } from "../strat-name-editor";
import pg, { usePostgrest } from "~/db";

const h = hyperStyled(styles);

interface SearchPanelProps {
  col_id: number;
  onSubmitStratName: (l: StratNameI) => void;
  onDelete: (id: number) => void;
  stratNames: StratNameI[];
}

interface CurrentStratNamesProps {
  stratName: StratNameI;
  onDelete: (id: number) => void;
  onClick: (stratName: StratNameI, canAdd: boolean) => void;
}

function CurrentStratName(props: CurrentStratNamesProps) {
  const { stratName } = props;

  const data: StratNameI[] = usePostgrest(
    pg.rpc("get_strat_name_info", { strat_name_id: stratName.id })
  );

  if (!data) return null;
  return h(MenuItem, {
    text: h(StratNameListItem, { ...data[0] }),
    onClick: () => props.onClick(stratName, false),
    style: { marginBottom: "3px", background: "#EDEFF2" },
    labelElement: h(Button, {
      intent: "danger",
      minimal: true,
      icon: "trash",
      onClick: (e: any) => {
        e.stopPropagation();
        props.onDelete(stratName.id);
      },
    }),
  });
}

const SearchPanel: React.FC<PanelProps<SearchPanelProps>> = (props) => {
  const { col_id, onDelete, onStratNameSelect, stratNames } =
    useContext(StratStackContext);

  const onItemSelect = (stratName: StratNameI, canAdd?: boolean) => {
    props.openPanel({
      props: { stratName, onStratNameSelect, col_id, canAdd },
      renderPanel: MetaDataPanel,
    });
  };

  const onClickCreateNew = () => {
    props.openPanel({
      props: { onStratNameSelect },
      renderPanel: NewStratNamePanel,
    });
  };

  return h("div.strat-name-select", [
    h.if(stratNames.length > 0)("h3", ["Current stratigraphic names"]),
    h.if(stratNames.length > 0)(Menu, { style: { maxWidth: "100%" } }, [
      stratNames.map((stratName) => {
        return h(CurrentStratName, {
          key: stratName.id,
          stratName,
          onClick: onItemSelect,
          onDelete,
        });
      }),
    ]),
    h("h3", ["Choose a stratigraphic name"]),
    h(StratNameSelect, { col_id, onItemSelect, onClickCreateNew }),
  ]);
};

interface NewStratNamePanelProps {
  onStratNameSelect: (l: StratNameI) => void;
}

const NewStratNamePanel: React.FC<PanelProps<NewStratNamePanelProps>> = (
  props
) => {
  const [state, setState] = useState({ strat_name: "", rank: "Fm" });

  const updateStratName = (field: string, value: string) => {
    setState((prevState) => {
      return { ...prevState, [field]: value };
    });
  };

  const onBackClick = () => {
    props.closePanel();
  };

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
        ["Return to search"]
      ),
    ]),
    h("div.bottom", [
      h(
        FormGroup,
        {
          helperText: "Create a stratigraphic name",
          label: "Stratigraphic Name",
        },
        [
          h(ControlGroup, { fill: true }, [
            h(InputGroup, {
              fill: true,
              defaultValue: state.strat_name,
              onChange: (e) => updateStratName("strat_name", e.target.value),
            }),
            h(RankSelect, { updateStratName, rank: state.rank }),
            h(
              Button,
              { intent: "warning", disabled: state.strat_name.length < 1 },
              ["Submit"]
            ),
          ]),
        ]
      ),
      h(
        Callout,
        {
          title: "Unlinked",
          style: { borderRadius: "5px" },
        },
        [
          h("div", [
            "This name will be unlinked to external resources. ",
            "The most valuable stratigraphic name is one linked to an official lexicon or reference.",
          ]),
          h(
            Button,
            {
              intent: "success",
              rightIcon: "arrow-right",
              style: { marginTop: "3px" },
            },
            ["Link stratigraphic name"]
          ),
        ]
      ),
    ]),
  ]);
};

interface MetaDataPanelProps {
  stratName: StratNameI | null;
  onStratNameSelect: (l: StratNameI) => void;
  col_id: number;
  canAdd?: boolean;
}

const MetaDataPanel: React.FC<PanelProps<MetaDataPanelProps>> = (props) => {
  const { canAdd = true, stratName, onStratNameSelect, col_id } = props;

  const onBackClick = () => {
    props.closePanel();
  };

  const onSaveClick = (stratName: StratNameI | null) => {
    if (stratName == null) {
      return;
    }
    onStratNameSelect(stratName);
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
      h.if(canAdd)(
        Button,
        {
          minimal: true,
          intent: Intent.SUCCESS,
          onClick: () => onSaveClick(stratName),
          icon: "plus",
        },
        ["add name"]
      ),
    ]),
    h("div.strat-name-select", [
      h.if(concept_id != null)(StratNameConceptCard, {
        strat_name: props.stratName,
        concept_id,
      }),
      h.if(concept_id == null)(
        Callout,
        { intent: "warning", title: "No official lexicon" },
        [
          "This stratigraphic name is not linked to an official lexicon reference. You can use this but it may be better to find a strat_name that is linked.",
        ]
      ),
      h("h3", ["Stratigraphic name hierarchy"]),
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
  stratNames: StratNameI[];
  onDelete: (id: number) => void;
}

type StratPanelTypes = SearchPanelProps | MetaDataPanelProps;
type StratPanels = Panel<StratPanelTypes>;

/* PanelStack has the limitation of NOT re-rendering on props change.
https://github.com/palantir/blueprint/issues/3173
So I use a react context to get around the issue. 
Not perfect but better than nothing.
*/

const StratStackContext = React.createContext<StratNameStackProps>({});

function StratNameStack(props: StratNameStackProps) {
  const { col_id, onStratNameSelect, stratNames } = props;

  const initialPanel: Panel<SearchPanelProps> = {
    renderPanel: SearchPanel,
    title: "Search for a strat name",
  };

  const [currentPanelStack, setCurrentPanelStack] = useState<
    Array<StratPanels>
  >([initialPanel]);

  const addToPanelStack = React.useCallback(
    (newPanel: StratPanels) =>
      setCurrentPanelStack((stack) => [...stack, newPanel]),
    [stratNames]
  );
  const removeFromPanelStack = React.useCallback(
    () =>
      setCurrentPanelStack([
        {
          renderPanel: SearchPanel,
          title: "Search for a strat name",
        },
      ]),
    [stratNames]
  );

  return h(StratStackContext.Provider, { value: props }, [
    h(PanelStack2, {
      className: "strat-name-stack",
      stack: currentPanelStack,
      onOpen: addToPanelStack,
      onClose: removeFromPanelStack,
      renderActivePanelOnly: false,
      showPanelHeader: false,
    }),
  ]);
}

export { StratNameStack };
