import { hyperStyled } from "@macrostrat/hyper";
import { ColumnGroupI } from "../../types";
import { FormGroup, InputGroup } from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
  ModelEditButton,
  //@ts-ignore
} from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import {SubmitButton } from "..";

const h = hyperStyled(styles);

function ColumnGroupEdit() {
  const {
    model,
    actions,
    isEditing,
    hasChanges,
  }: {
    model: ColumnGroupI;
    actions: any;
    isEditing: boolean;
    hasChanges: () => boolean;
  } = useModelEditor();

  // two text editors, name and description
  // could have a suggest for the timescale

  const defaultColGroupShort =
    model.col_group.length > 0 ? model.col_group : undefined;
  const defaultColGroupLong =
    model.col_group_long.length > 2 ? model.col_group_long : undefined;

  const updateProject = (field: string, e: any) => {
    actions.updateState({ model: { [field]: { $set: e } } });
  };

  return h("div", [
    h(
      FormGroup,
      {
        helperText: "Add a short column group name",
        label: "Column Group Name (short)",
        labelFor: "project-input",
        labelInfo: "(required)",
      },
      [
        h(InputGroup, {
          style: { width: "200px" },
          defaultValue: defaultColGroupShort,
          onChange: (e) => updateProject("col_group", e.target.value),
        }),
      ]
    ),
    h(
      FormGroup,
      {
        helperText: "Add a long column group name",
        label: "Column Group Name (long)",
        labelFor: "descrip-input",
        labelInfo: "(recommended)",
      },
      [
        h(InputGroup, {
          style: { width: "300px" },
          defaultValue: defaultColGroupLong,
          onChange: (e) => updateProject("col_group_long", e.target.value),
        }),
      ]
    ),
    h(SubmitButton),
  ]);
}

interface ColumnGroupEditorProps {
  model: ColumnGroupI | {};
  persistChanges: (
    e: Partial<ColumnGroupI>,
    c: Partial<ColumnGroupI>
  ) => ColumnGroupI;
}

function ColumnGroupEditor(props: ColumnGroupEditorProps) {
  return h(
    ModelEditor,
    {
      model: props.model,
      //@ts-ignore
      persistChanges: props.persistChanges,
      canEdit: true,
      isEditing: true,
    },
    [h(ColumnGroupEdit)]
  );
}

export { ColumnGroupEditor };
