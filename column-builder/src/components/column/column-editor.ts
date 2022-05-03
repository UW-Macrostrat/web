import { useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { Table } from "../../index";
import {
  Button,
  NumericInput,
  Collapse,
  InputGroup,
  TextArea,
  Spinner,
} from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
  //@ts-ignore
} from "@macrostrat/ui-components/lib/esm";
import styles from "../comp.module.scss";
import { ColumnForm, ColumnGroupI } from "../../types";
import { ItemSuggest } from "../suggest";
import { RefI } from "../../types";
import pg, { usePostgrest } from "../../db";
import { RefEditor } from "../ref/ref-editor";
import { SubmitButton } from "..";
import { LngLatMap, Point } from "./map";

const h = hyperStyled(styles);

interface Model {
  model: ColumnForm;
  actions: any;
  hasChanges: () => boolean;
}

interface RefDataI {
  value: string;
  data: RefI;
}

function ColumnRef() {
  const [open, setOpen] = useState(false);

  const { model, actions, hasChanges }: Model = useModelEditor();
  const refs: RefI[] = usePostgrest(
    pg.from("refs").select("id, pub_year, author, ref, doi, url")
  );

  if (!refs) return h(Spinner);

  const onClick = () => {
    setOpen(!open);
  };

  const onChange = (item: RefDataI) => {
    actions.updateState({ model: { ref: { $set: item.data } } });
  };
  // have the ref suggest as well as option to create new ref.
  return h("div", [
    h(ItemSuggest, {
      items: refs.map((ref) => {
        return { value: `${ref?.author}(${ref?.pub_year})`, data: ref };
      }),
      initialSelected: {
        value: model.ref ? `${model.ref.author}(${model.ref.pub_year})` : "",
        data: model.ref || {},
      },
      onChange,
    }),
    h(Button, { onClick }, ["New Ref"]),
    h(Collapse, { isOpen: open }, [h(NewRef)]),
  ]);
}

function NewRef() {
  const { model, actions, hasChanges }: Model = useModelEditor();

  const persistChanges = async (e: RefI, c: Partial<RefI>) => {
    console.log("persistChanges!!");
    // would need to post ref to back as new ref first
    const { data, error } = await pg.from("refs").insert([e]);
    if (!error) {
      actions.updateState({ model: { ref: { $set: data[0] } } });
    }
    return data[0];
  };
  //@ts-ignore
  return h(RefEditor, { model: model.ref || {}, persistChanges });
}

function ColumnEdit({ curColGroup }: { curColGroup: Partial<ColumnGroupI> }) {
  const { model, actions, hasChanges }: Model = useModelEditor();

  const updateColumn = (field: string, e: any) => {
    actions.updateState({ model: { [field]: { $set: e } } });
  };

  const setCoords = (p: Point) => {
    const [long, lat] = p.geometry.coordinates;
    actions.updateState({
      model: { longitude: { $set: long }, latitude: { $set: lat } },
    });
  };

  return h("div", [
    h(Table, { interactive: false }, [
      h("tbody", [
        h("tr", [
          h("td", [h("h4", ["Column Group"])]),
          h("td", [curColGroup.col_group]),
        ]),
        h("tr", [
          h("td", [h("h4", ["Column Name"])]),
          h("td", [
            h(InputGroup, {
              style: { width: "200px" },
              defaultValue: model.col_name || undefined,
              onChange: (e) => updateColumn("col_name", e.target.value),
            }),
          ]),
        ]),
        h("tr", [
          h("td", [h("h4", ["Column Number"])]),
          h("td", [
            h(NumericInput, {
              style: { width: "200px" },
              defaultValue: model.col_number || undefined,
              onValueChange: (e) => updateColumn("col_number", e),
            }),
          ]),
        ]),
        h("tr", [
          h("td", [
            h(LngLatMap, {
              longitude: model.longitude ?? 0,
              latitude: model.latitude ?? 0,
              onChange: (p: Point) => setCoords(p),
            }),
          ]),
          h("td", [
            h("div", ["longitude: ", model.longitude]),
            h("div", ["latitude: ", model.latitude]),
          ]),
        ]),
        h("tr", [
          h("td", [h("h4", ["Notes"])]),
          h("td", [
            h(TextArea, {
              value: model.notes,
              onChange: (e) => updateColumn("notes", e.target.value),
            }),
          ]),
        ]),
        h("tr", [h("td", [h("h4", ["Ref"])]), h("td", [h(ColumnRef)])]),
      ]),
    ]),
    h(SubmitButton),
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
