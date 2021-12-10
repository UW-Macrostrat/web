import React, { useState } from "react";
import { Tooltip2, Popover2 } from "@blueprintjs/popover2";
import { Button, Divider } from "@blueprintjs/core";
import { AddKnownGeom } from "./add-geom";

function MapLegendRow(props) {
  const { col_group, col_group_name, color } = props;
  return (
    <div className="map-legend-row">
      <Tooltip2 content={<div>{col_group_name}</div>} placement="bottom-end">
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <div
            style={{
              backgroundColor: color,
              width: "10px",
              height: "10px",
              marginRight: "5px",
            }}
          ></div>
          <div>{col_group}</div>
        </div>
      </Tooltip2>
    </div>
  );
}

function MapLegend({ columns }) {
  let example_column = {
    col_group: "Column Group",
    col_group_name: "Column Group Name",
    color: "#000000",
  };
  return (
    <div className="map-legend-container">
      <MapLegendRow {...example_column} />
      <Divider />
      {columns.map((column, i) => {
        return <MapLegendRow key={i} {...column} />;
      })}
    </div>
  );
}

function MapColLegend(props) {
  const { columns } = props;

  const [open, setOpen] = useState(true);

  if (columns.length == 0) {
    return <div></div>;
  }
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Popover2
          content={<MapLegend columns={columns} />}
          minimal={true}
          placement="bottom-end"
        >
          <Tooltip2 content="Column Legend">
            <Button rightIcon="map" onClick={() => setOpen(!open)} />
          </Tooltip2>
        </Popover2>
      </div>
    </div>
  );
}

function MapToolsControl(props) {
  const { columns = [], editMode, draw, addToChangeSet } = props;

  const addGeomToDraw = (geom) => {
    let feature = draw.add(geom);

    const obj = {
      action: "draw.create",
      feature: { id: feature[0], geometry: geom },
    };

    addToChangeSet(obj);
  };

  return (
    <div>
      {editMode ? (
        <AddKnownGeom addGeom={addGeomToDraw} />
      ) : (
        <MapColLegend columns={columns} />
      )}
    </div>
  );
}

export { MapColLegend, MapToolsControl };
