import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Overlay,
  Button,
  Card,
  Navbar,
  FormGroup,
  Collapse,
} from "@blueprintjs/core";
import { OverlayBox, SaveButton } from "../../blueprint";
import { useAPIResult, useModelEditor } from "@macrostrat/ui-components";
import { ColumnSuggest } from "./column-suggest";
import { NewColGroups } from "./new-column";

function unwrapColumnGroups(res) {
  const { data } = res;
  return data;
}

function ColumnGroup() {
  const { model, isEditing, actions } = useModelEditor();
  const [open, setOpen] = useState(false);

  const data = useAPIResult(
    "http://0.0.0.0:8000/col-groups?all",
    {},
    { unwrapResponse: unwrapColumnGroups }
  );

  if (!data) return <div />;

  const { col_group, col_group_name, col_group_id } = model;

  const onChangeGroup = (e) => {
    actions.updateState({
      model: {
        col_group: { $set: e.col_group },
        col_group_id: { $set: e.col_group_id },
        col_group_name: { $set: e.col_group_name },
      },
    });
  };

  const onCreateColGroup = (col_group_id, col_group, col_group_name) => {
    setOpen(false);
    actions.updateState({
      model: {
        col_group: { $set: col_group },
        col_group_id: { $set: col_group_id },
        col_group_name: { $set: col_group_name },
      },
    });
  };

  if (isEditing) {
    return (
      <div>
        <ColumnSuggest
          items={data}
          onChange={onChangeGroup}
          initialItem={model}
        />
        <Button
          onClick={() => {
            setOpen(!open);
          }}
        >
          New Col Group
        </Button>
        <Collapse isOpen={open}>
          <NewColGroups onCreate={onCreateColGroup} />
        </Collapse>
      </div>
    );
  }
  return (
    <div>
      <h4>Column Group: {col_group}</h4>
      <h4>Column Group Name: {col_group_name}</h4>
    </div>
  );
}

export { ColumnGroup };
