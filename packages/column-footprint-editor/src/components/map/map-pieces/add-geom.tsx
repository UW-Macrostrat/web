import React, { useContext, useState } from "react";
import { AppContext } from "../../../context";
import { Button, TextArea } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import axios from "axios";

function PopoverContent({ addGeom }) {
  const { state, runAction } = useContext(AppContext);

  const [geom, setGeom] = useState("");

  const onClick = async () => {
    console.log(geom);
    let url = "http://0.0.0.0:8000/get-line";
    let res = await axios.post(url, { location: geom });
    let data = res.data;
    let line = data["location"];
    addGeom(line);
  };

  return (
    <div className="add-geo-popover">
      <h4 className="h4-0">Enter a WKT or GeoJSON</h4>
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
  const { state, runAction } = useContext(AppContext);

  // this should probably just be done via postgres and an api route that returns a linestring or set of linestrings
  //need a function to make sure it's a valid WKT or geojson polygon/multipolygon
  // need a function to turn it into LineStrings
  // add to the state.lines

  return (
    <div>
      <Popover2
        content={<PopoverContent addGeom={addGeom} />}
        minimal={true}
        placement="bottom-end"
      >
        <Button minimal={true}>
          <h5 className="h4-0">Add Existing Geometry</h5>
        </Button>
      </Popover2>
    </div>
  );
}
