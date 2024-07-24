import { Ref, useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  Button,
  NumericInput,
  InputGroup,
  TextArea,
  Spinner,
  FormGroup,
  Card,
  MenuItem,
  Drawer,
  Collapse,
  Callout,
} from "@blueprintjs/core";
import styles from "../comp.module.scss";
import { ColumnForm, ColumnGroupI } from "~/types";
import { DataI, ItemSuggest } from "../suggest";
import { RefI } from "~/types";
import pg, { usePostgrest } from "../../db";
import { RefEditor } from "../ref/ref-editor";
import { SubmitButton } from "..";
import { LngLatMap } from "./map";
import { Point, Pub, PublicationFinder } from "@macrostrat/form-components";
import { ModelEditor, useModelEditor } from "@macrostrat/ui-components";
import { ItemRenderer } from "@blueprintjs/select";
import { Model } from "./column-editor";

const h = hyperStyled(styles);

interface RefDataI {
  value: string;
  data: RefI;
}

function formPubSelectText(ref: RefI) {
  const title = ref.ref?.length > 50 ? ref.ref.slice(0, 50) + "..." : ref.ref;

  return `${ref?.author}(${ref?.pub_year})-${title}`;
}

const ColumnRefItemRenderer: ItemRenderer<DataI<RefI>> = (
  item: DataI<RefI>,
  { handleClick, modifiers, index }
) => {
  const { value, data } = item;
  return h(MenuItem, {
    key: index,
    text: h(Callout, [
      h("div", [data.ref]),
      h("div.ref-author", [data.author, "(", data.pub_year, ")"]),
      h("div.doi", [data.doi]),
    ]),
    onClick: handleClick,
    active: modifiers.active,
  });
};

function ColumnRef() {
  const [open, setOpen] = useState(false);
  const [newRefOpen, setNewRefOpen] = useState(false);

  const { model, actions }: Model = useModelEditor();
  const refs: RefI[] = usePostgrest(
    pg.from("refs").select("id, pub_year, author, ref, doi, url")
  );

  if (!refs) return h(Spinner);

  const onClick = () => {
    setOpen(!open);
  };

  const onChange = (item: RefDataI) => {
    actions.updateState({ model: { refs: { $set: [item.data] } } });
  };

  const onPubFinderClick = async (e: Pub) => {
    const newRef: RefI = {
      ref: e.title,
      pub_year: e.year,
      author: e.author,
      doi: e.doi,
      url: e.link,
    };
    const { data, error } = await pg.from("refs").insert([newRef]);
    if (!error) {
      actions.updateState({ model: { refs: { $set: [data[0]] } } });
    }
    setOpen(false);
    setNewRefOpen(false);
  };

  // have the ref suggest as well as option to create new ref.
  return h("div", [
    h(ItemSuggest, {
      items: refs.map((ref) => {
        return { value: formPubSelectText(ref), data: ref };
      }),
      itemRenderer: ColumnRefItemRenderer,
      initialSelected: {
        value: model.refs[0] ? formPubSelectText(model.refs[0]) : "",
        data: model.refs[0] || {},
      },
      onChange,
    }),
    h(Button, { onClick, icon: "plus" }),
    h(
      Drawer,
      {
        usePortal: true,
        isOpen: open,
        onClose: () => setOpen(false),
        title: "Add a new reference",
      },
      [
        h(
          "div",
          {
            style: {
              padding: "5px",
              display: "flex",
              flexDirection: "column",
            },
          },
          [
            h("div", [
              h("h3", { style: { marginBottom: 0 } }, [
                "Search for a Publication",
              ]),
              h(PublicationFinder, {
                onClick: onPubFinderClick,
              }),
            ]),
            h("div", [
              h(
                Button,
                {
                  minimal: true,
                  fill: true,
                  onClick: () => setNewRefOpen(!newRefOpen),
                },
                ["+ Can't find the paper, add it's details +"]
              ),
              h(Collapse, { isOpen: newRefOpen }, [h(NewRef)]),
            ]),
          ]
        ),
      ]
    ),
  ]);
}

function NewRef() {
  const { model, actions, hasChanges }: Model = useModelEditor();

  const persistChanges = async (e: RefI, c: Partial<RefI>) => {
    console.log("persistChanges!!");
    // would need to post ref to back as new ref first
    const { data, error } = await pg.from("refs").insert([e]);
    if (!error) {
      actions.updateState({ model: { refs: { $set: [data[0]] } } });
    }

    return e;
  };
  //@ts-ignore
  return h(RefEditor, { model: model.ref || {}, persistChanges });
}

export { ColumnRef };
