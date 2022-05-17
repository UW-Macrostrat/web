import { hyperStyled } from "@macrostrat/hyper";
import { Table } from "../../index";
import { NumericInput, TextArea, InputGroup } from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
  ModelEditButton,
} from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import { RefI } from "~/types";
import { SubmitButton } from "..";
import { FeatureCell } from "../table";

const h = hyperStyled(styles);

interface Model {
  model: RefI;
  actions: any;
  hasChanges: () => boolean;
}

function RefEdit() {
  const { model, actions, hasChanges }: Model = useModelEditor();
  //author: text, year: numeric (validation), ref:textArea, doi:text, url:text

  const updateRef = (field: string, e: any) => {
    actions.updateState({ model: { [field]: { $set: e } } });
  };

  return h("div", [
    h(Table, { interactive: false }, [
      h("tr", [
        h(FeatureCell, { text: "Author" }, [
          h(InputGroup, {
            style: { width: "200px" },
            defaultValue: model.author || undefined,
            onChange: (e) => updateRef("author", e.target.value),
          }),
        ]),
        h(FeatureCell, { text: "Pub Year" }, [
          h(NumericInput, {
            style: { width: "200px" },
            defaultValue: model.pub_year || undefined,
            onValueChange: (e) => updateRef("pub_year", e),
          }),
        ]),
      ]),
      h("tr", [
        h(FeatureCell, { text: "Ref", colSpan: 3 }, [
          h(TextArea, { onChange: (e) => updateRef("ref", e.target.value) }),
        ]),
      ]),
      h("tr", [
        h(FeatureCell, { text: "DOI" }, [
          h(InputGroup, {
            style: { width: "200px" },
            defaultValue: model.doi || undefined,
            onChange: (e) => updateRef("doi", e.target.value),
          }),
        ]),
        h(FeatureCell, { text: "URL" }, [
          h(InputGroup, {
            style: { width: "200px" },
            defaultValue: model.url || undefined,
            onChange: (e) => updateRef("url", e.target.value),
          }),
        ]),
      ]),
    ]),
    h(SubmitButton),
  ]);
}

interface RefEditorProps {
  model: RefI | {};
  persistChanges: (e: RefI, c: Partial<RefI>) => RefI;
}

export function RefEditor(props: RefEditorProps) {
  return h(
    ModelEditor,
    {
      model: props.model,
      persistChanges: props.persistChanges,
      isEditing: true,
      canEdit: true,
    },
    [h(RefEdit)]
  );
}
