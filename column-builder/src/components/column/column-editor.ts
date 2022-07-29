import { hyperStyled } from "@macrostrat/hyper";
import {
  NumericInput,
  InputGroup,
  TextArea,
  FormGroup,
  Card,
  Callout,
} from "@blueprintjs/core";
import styles from "../comp.module.scss";
import { ColumnForm, ColumnGroupI } from "~/types";

import { SubmitButton } from "..";
import { LngLatMap } from "./map";
import { Point } from "deps/ui-components/packages/form-components/src";
import { ModelEditor, useModelEditor } from "@macrostrat/ui-components";
import { ColumnRef } from "./column-ref";

const h = hyperStyled(styles);

export interface Model {
  model: ColumnForm;
  actions: any;
  hasChanges: () => boolean;
}

interface ModelComponentBaseProps {
  updateColumn: (field: string, e: any) => void;
}
function ColumnNotes(props: ModelComponentBaseProps) {
  const { model, actions, hasChanges }: Model = useModelEditor();

  return h("div", [
    h("h4", { style: { marginBottom: 0 } }, ["Notes"]),
    h(TextArea, {
      style: { width: "400px", height: "150px" },
      value: model.notes ?? "",
      onChange: (e) => props.updateColumn("notes", e.target.value),
    }),
  ]);
}

function ColumnName(props: ModelComponentBaseProps) {
  const { model, actions, hasChanges }: Model = useModelEditor();

  return h("div", [
    h(
      FormGroup,
      { label: h("h4", { style: { margin: 0 } }, ["Column Name"]) },
      [
        h(InputGroup, {
          style: { width: "200px" },
          defaultValue: model.col_name || undefined,
          onChange: (e) => props.updateColumn("col_name", e.target.value),
        }),
      ]
    ),
  ]);
}

function ColumnNumber(props: ModelComponentBaseProps) {
  const { model, actions, hasChanges }: Model = useModelEditor();
  return h(
    FormGroup,
    { label: h("h4", { style: { margin: 0 } }, ["Column Number"]) },
    [
      h(NumericInput, {
        style: { width: "200px" },
        defaultValue: model.col || undefined,
        onValueChange: (e: number) => props.updateColumn("col", e),
      }),
    ]
  );
}

function ColumnRef_() {
  const { model, actions, hasChanges }: Model = useModelEditor();

  return h(
    Callout,
    {
      style: {
        width: "400px",
        marginTop: "10px",
        marginBottom: "10px",
      },
      title: "Reference",
    },
    [
      h("div.ref", [model.refs[0]?.ref]),
      h("div.ref-author", [
        model.refs[0]?.author,
        "(",
        model.refs[0]?.pub_year,
        ")",
      ]),
      h("div.doi", [
        h("a", { href: model.refs[0]?.url, target: "_blank" }, [
          model.refs[0]?.doi,
        ]),
      ]),
      h(ColumnRef),
    ]
  );
}

function isDisabled(model: ColumnForm) {
  if (typeof model.col_name == "undefined") return true;
  if (typeof model.lat == "undefined" || typeof model.lng == "undefined")
    return true;
  if (typeof model.refs == "undefined") return true;
  return false;
}

function ColumnEdit({ curColGroup }: { curColGroup: Partial<ColumnGroupI> }) {
  const { model, actions, hasChanges }: Model = useModelEditor();

  const updateColumn = (field: string, e: any) => {
    actions.updateState({ model: { [field]: { $set: e } } });
  };

  const setCoords = (p: Point) => {
    const [long, lat] = p.geometry.coordinates;
    actions.updateState({
      model: { lng: { $set: long }, lat: { $set: lat } },
    });
  };

  return h(Card, [
    h("div.col-editor-container", [
      h("div.left", [
        h("h4", ["Column Group: ", curColGroup.col_group]),
        h(ColumnName, { updateColumn }),
        h(ColumnNumber, { updateColumn }),
        h("div", [h("td", [h(ColumnNotes, { updateColumn }), h(ColumnRef_)])]),
      ]),
      h("div.right", [
        h(Card, { style: { minWidth: "600px" }, elevation: 1 }, [
          h(LngLatMap, {
            disabled: model.poly_geom != null,
            longitude: model.lng ?? 0,
            latitude: model.lat ?? 0,
            onChange: (p: Point) => setCoords(p),
          }),
          h.if(model.poly_geom != null)(
            Callout,
            {
              intent: "warning",
              title: "No editing location",
              style: { width: "600px" },
            },
            [
              "This column has an associated footprint geometry.",
              " All editing must take place in Column-Topology-Editor.",
            ]
          ),
        ]),
      ]),
    ]),
    h(SubmitButton, { disabled: isDisabled(model) }),
  ]);
}

interface ColumnEditorProps {
  model: ColumnForm | {};
  curColGroup: Partial<ColumnGroupI>;
  persistChanges: (e: ColumnForm, c: Partial<ColumnForm>) => ColumnForm;
}

export function ColumnEditor(props: ColumnEditorProps) {
  return h(
    ModelEditor,
    {
      model: props.model,
      persistChanges: props.persistChanges,
      isEditing: true,
      canEdit: true,
    },
    [
      h(ColumnEdit, {
        curColGroup: props.curColGroup,
      }),
    ]
  );
}
