import { hyperStyled } from "@macrostrat/hyper";
import { StratNameSuggest } from "../../index";
import { Select, ItemRenderer } from "@blueprintjs/select";
import {
  Button,
  MenuItem,
  FormGroup,
  InputGroup,
  Icon,
} from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
  //@ts-ignore
} from "@macrostrat/ui-components/lib/esm";
import styles from "../comp.module.scss";
import { RANK, StratNameI } from "../../types";
import { SubmitButton } from "..";
import { StratNameDataI } from ".";
import { StratNameHierarchy } from "./hierarchy";

const h = hyperStyled(styles);

interface Model {
  model: StratNameI;
  actions: any;
  hasChanges: () => boolean;
}

function RankSelect({
  updateStratName,
}: {
  updateStratName: (field: string, i: any) => void;
}) {
  const { model, actions, hasChanges }: Model = useModelEditor();

  const possibleRanks = ["SGp", "Gp", "SubGp", "Fm", "Mbr", "Bed"];

  const itemRenderer: ItemRenderer<string> = (
    item: string,
    { handleClick, index }
  ) => {
    const active = model.rank == item;
    return h(MenuItem, {
      key: index,
      labelElement: active ? h(Icon, { icon: "tick" }) : null,
      text: item,
      onClick: handleClick,
      active: active,
    });
  };

  return h(
    Select,
    {
      filterable: false,
      items: possibleRanks,
      popoverProps: {
        minimal: true,
      },
      itemRenderer,
      selectedItem: model.rank,
      onItemSelect: (item) => updateStratName("rank", item),
    },
    [h(Button, { rightIcon: "double-caret-vertical" }, [model.rank])]
  );
}

/* 
Edit the name and rank of strat_name - text input and select
Assign other strat_name as parent
Add to a concept
*/
function StratNameEdit() {
  const { model, actions, hasChanges }: Model = useModelEditor();

  const updateStratName = (field: string, e: any) => {
    actions.updateState({ model: { [field]: { $set: e } } });
  };

  return h("div", { style: { display: "flex" } }, [
    h("div", [
      h("div.row", [
        h(
          FormGroup,
          {
            helperText: "Edit existing Strat name",
            label: "Stratigraphic Name",
            labelInfo: "(optional)",
          },
          [
            h(InputGroup, {
              style: { width: "200px" },
              defaultValue: model.strat_name,
              onChange: (e) => updateStratName("strat_name", e.target.value),
            }),
          ]
        ),
        h(FormGroup, { label: "Rank" }, [h(RankSelect, { updateStratName })]),
      ]),

      h(
        FormGroup,
        {
          helperText: "This will assign the parent of Cerro Tipon Fm",
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
      h(SubmitButton),
    ]),
    h(StratNameHierarchy, { strat_name_id: model.id }),
  ]);
}

interface StratNameEditorProps {
  model: StratNameI | {};
  persistChanges: (e: StratNameI, c: Partial<StratNameI>) => StratNameI;
}

export function StratNameEditor(props: StratNameEditorProps) {
  return h(
    ModelEditor,
    {
      model: props.model,
      persistChanges: props.persistChanges,
      isEditing: true,
      canEdit: true,
    },
    [h(StratNameEdit)]
  );
}
