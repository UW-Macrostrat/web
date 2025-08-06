import React from "react";
import { Navbar, Card, Icon } from "@blueprintjs/core";
import { SaveButton } from "../blueprint";

function Header(props) {
  const { onSave, disabled } = props;

  return (
    <Navbar>
      <Navbar.Group>
        <h4 style={{ color: "#DB3737" }}>Warning, more than one identity</h4>
        <Navbar.Divider />
        <h4>Choose one</h4>
        <Navbar.Divider />
        <SaveButton minimal={true} onClick={onSave} disabled={disabled} />
      </Navbar.Group>
    </Navbar>
  );
}

function Body(props) {
  const { features, onClickID, clickedID } = props;

  return (
    <div style={{ display: "flex", marginTop: "20px" }}>
      {features.map((feature, indx) => {
        const {
          col_group: group,
          project_id,
          col_id: column_id,
          col_name: column_name,
          id: identity_id,
        } = feature["properties"];

        let className = clickedID == indx ? "clicked-entity" : "not-clicked";
        let iconName = clickedID == indx ? "selection" : "circle";

        return (
          <Card
            className={className}
            key={indx}
            elevation={1}
            interactive={true}
            onClick={() => onClickID(indx)}
          >
            <h4>
              Column: {column_name} ({column_id}))
            </h4>
            <h4>Column Group: {group}</h4>
            <h4>Project ID: {project_id}</h4>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Icon icon={iconName} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TwoIdentities(props) {
  const { features } = props;

  const [clickedID, setClickedID] = React.useState(null);

  const disabled = clickedID == null;

  const onClickID = (indx) => {
    setClickedID(indx);
  };

  const onSave = () => {

    // we will want to remove the other ids from the polygon identifier table. 
    // the identity_id is the col_id in map_digitizer.polygon table
    console.log(features[clickedID]);
  };

  return (
    <div>
      <Header onSave={onSave} disabled={disabled} />
      <Body features={features} onClickID={onClickID} clickedID={clickedID} />
    </div>
  );
}

export { TwoIdentities };
