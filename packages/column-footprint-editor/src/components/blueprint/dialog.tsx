import React from "react";
import { Overlay, Button, Card } from "@blueprintjs/core";
import "./main.css";

function PropertyDialog(props) {
  const { open, name, closeOpen } = props;

  const overlayProperties = {
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: true,
    enforceFocus: true,
    hasBackdrop: false,
    usePortal: true,
    useTallContent: false,
  };

  return (
    <Overlay isOpen={open} {...overlayProperties}>
      <div className="overlay">
        <Card>
          <h3>Column Name: {name}</h3>
          <Button intent="danger" onClick={closeOpen}>
            Close
          </Button>
        </Card>
      </div>
    </Overlay>
  );
}

export { PropertyDialog };
