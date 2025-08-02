import React, { useContext, useState } from "react";
import { AppContext } from "../../../context";
import { Button, TextArea } from "@blueprintjs/core";
import { Popover2, Tooltip2 } from "@blueprintjs/popover2";
import axios from "axios";
import { base } from "../../../context/env";

function PopoverContent({ addGeom }) {
  const { state, runAction } = useContext(AppContext);

  const [geom, setGeom] = useState("");

  const onClick = async () => {
    let url = base + "get-line";
    let res = await axios.post(url, { location: geom });
    let data = res.data;
    let line = data["location"];
    addGeom(line);
  };

  return (
    <div className="add-geo-popover">
      <h4 className="h4-0">Enter a WKT</h4>
      <TextArea
        onChange={(e) => setGeom(e.target.value)}
        style={{ height: "150px" }}
      />
      <Button intent="success" onClick={onClick}>
        Add
      </Button>
    </div>
  );
}

export function AddKnownGeom({ addGeom }) {
  return (
    <div>
      <Popover2
        content={<PopoverContent addGeom={addGeom} />}
        minimal={true}
        placement="bottom-end"
      >
        <Tooltip2 content="Add Existing Geometry">
          <Button rightIcon="shapes" />
        </Tooltip2>
      </Popover2>
    </div>
  );
}
