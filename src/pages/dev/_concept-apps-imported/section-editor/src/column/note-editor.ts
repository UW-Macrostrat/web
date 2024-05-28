/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { NoteTextEditor, useModelEditor } from "@macrostrat/column-components";
import h from "~/hyper";
import { ContentPanel } from "../ui";
import {
  TextArea,
  InputGroup,
  Button,
  ButtonGroup,
  Intent
} from "@blueprintjs/core";
import { format } from "d3-format";
import {
  SaveButton,
  CancelButton,
  DeleteButton
} from "@macrostrat/ui-components";

const fmt = format(".2f");

const HeightRange = function(props) {
  let { formatter } = props;
  if (formatter == null) {
    formatter = fmt;
  }
  const { height, top_height } = props.note;
  return h("p.height", [
    h("span.height", fmt(height)),
    h.if(top_height != null)([" – ", h("span.height", fmt(top_height))]),
    " m"
  ]);
};

const NoteEditor = function(props) {
  const { editedModel: note, updateModel, deleteModel } = useModelEditor();
  const onChange = function(event) {
    const v = event.target.value;
    return updateModel({ note: { $set: v } });
  };

  const value = note.note || "";

  return h("div.note-editor", [
    h(ContentPanel, [
      h(TextArea, { value, growVertically: true, onChange }),
      h("div.toolbar", [
        h(HeightRange, { note }),
        h(DeleteButton, {
          small: true,
          minimal: true,
          itemDescription: "this note",
          handleDelete: deleteModel
        })
      ])
    ])
  ]);
};

export { NoteEditor };
