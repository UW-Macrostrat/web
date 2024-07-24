import { hyperStyled } from "@macrostrat/hyper";
import { StratNameSuggest } from "@macrostrat-web/column-builder/src";
import { Select, ItemRenderer } from "@blueprintjs/select";
import {
  Button,
  MenuItem,
  FormGroup,
  InputGroup,
  Icon,
  Card,
  Callout,
} from "@blueprintjs/core";
import { ModelEditor, useModelEditor } from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import { RANK, StratNameI } from "../../types";
import { SubmitButton } from "..";
import { StratNameDataI } from ".";
import { StratNameHierarchy } from "./hierarchy";
import { DataI, ItemSelect } from "../suggest";
import { Checkbox } from "@blueprintjs/core";

const h = hyperStyled(styles);

interface Model {
  model: StratNameI;
  actions: any;
  hasChanges: () => boolean;
}

export function RankSelect({
  updateStratName,
  rank,
}: {
  updateStratName: (field: string, i: any) => void;
  rank?: string;
}) {
  const possibleRanks = [
    { value: "SGp", data: "SGp" },
    { value: "Gp", data: "Gp" },
    { value: "SubGp", data: "SubGp" },
    { value: "Fm", data: "Fm" },
    { value: "Mbr", data: "Mbr" },
    { value: "Bed", data: "Bed" },
  ];

  const itemRenderer: ItemRenderer<DataI<string>> = (
    item: DataI<string>,
    { handleClick, index }
  ) => {
    const active = rank == item.value;
    return h(MenuItem, {
      key: index,
      labelElement: active ? h(Icon, { icon: "tick" }) : null,
      text: item.value,
      onClick: handleClick,
      active: active,
    });
  };

  return h(
    ItemSelect,
    {
      items: possibleRanks,
      itemRenderer,
      // selectedItem: model.rank,
      onItemSelect: (item) => updateStratName("rank", item.value),
    },
    [h(Button, { rightIcon: "double-caret-vertical" }, [rank ?? "Fm"])]
  );
}

/*
Edit the name and rank of strat_name - text input and select
Assign other strat_name as parent
Add to a concept
*/
function StratNameEdit(props: { new_name?: boolean }) {
  const { new_name = false } = props;
  const { model, actions, hasChanges }: Model = useModelEditor();

  const updateStratName = (field: string, e: any) => {
    actions.updateState({ model: { [field]: { $set: e } } });
  };

  const title = new_name ? "Create new strat name" : "Edit strat name";
  const helperText = new_name
    ? "Create new strat name"
    : "Edit existing strat name";

  return h("div", [
    h(StratNameHierarchy, { strat_name_id: model.id }),
    h("div", [
      h(Card, [
        h("h3", { style: { marginTop: 0 } }, [title]),
        h("div.row", [
          h(
            FormGroup,
            {
              helperText: helperText,
              label: "Stratigraphic Name",
            },
            [
              h(InputGroup, {
                style: { width: "200px" },
                defaultValue: model.strat_name,
                onChange: (e) => updateStratName("strat_name", e.target.value),
              }),
            ]
          ),
          h(FormGroup, { label: "Rank" }, [
            h(RankSelect, { updateStratName, rank: model.rank }),
          ]),
        ]),
        h.if(!new_name)("div.row", [
          h(Checkbox, { label: "Apply globally", style: { margin: "5px" } }),
          h(Checkbox, {
            label: "Apply to this unit only (create new strat name)",
            style: { margin: "5px" },
          }),
        ]),
        h(
          Callout,
          {
            intent: "warning",
            title: "Unlinked",
            style: { width: "265px", borderRadius: "5px" },
          },
          ["This name will be unlinked to external resources"]
        ),
      ]),
      h(Card, [
        h("h3", { style: { marginTop: 0 } }, ["Edit Hierarcy"]),
        h(
          FormGroup,
          {
            helperText: `This will assign the parent of ${model.strat_name} ${model.rank}`,
            label: "(re)-Assign Parent",
            labelFor: "descrip-input",
          },
          [
            h(StratNameSuggest, {
              onChange: (item: StratNameDataI) => {
                updateStratName("parent", item.data);
              },
            }),
          ]
        ),
        h(
          FormGroup,
          {
            helperText: `This will assign a child to ${model.strat_name} ${model.rank}`,
            label: `Add Name to ${model.strat_name} ${model.rank}`,
          },
          [
            h(StratNameSuggest, {
              onChange: (item: StratNameDataI) => {
                updateStratName("child", item.data);
              },
            }),
          ]
        ),
        h("h3", { style: { marginTop: 0 } }, ["Create new strat name"]),
        h("div.row", [
          h(
            FormGroup,
            {
              label: "Create new name",
              labelInfo: "(optional)",
            },
            [
              h(InputGroup, {
                style: { width: "200px" },
                onChange: (e) => console.log(e.target.value),
              }),
            ]
          ),
          h(FormGroup, { label: "Rank" }, [h(RankSelect, { updateStratName })]),
        ]),
        h("div.row", [
          h(Checkbox, { label: "Assign as Child", style: { margin: "5px" } }),
          h(Checkbox, {
            label: "Assign as Parent",
            style: { margin: "5px" },
          }),
        ]),
      ]),
      h(SubmitButton),
    ]),
  ]);
}

interface StratNameEditorProps {
  model: StratNameI | {};
  persistChanges: (e: StratNameI, c: Partial<StratNameI>) => StratNameI;
  new_name?: boolean;
}

export function StratNameEditor(props: StratNameEditorProps) {
  const { new_name } = props;
  return h(
    ModelEditor,
    {
      model: props.model,
      persistChanges: props.persistChanges,
      isEditing: true,
      canEdit: true,
    },
    [h(StratNameEdit, { new_name })]
  );
}
