import React from "react";
import { Overlay, Button, Card } from "@blueprintjs/core";
import "./main.css";

function OverlayBox(props) {
  const { open, children, closeOpen } = props;

  const overlayProperties = {
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: true,
    enforceFocus: false,
    hasBackdrop: false,
    usePortal: true,
    useTallContent: false,
  };

  return (
    <Overlay isOpen={open} {...overlayProperties}>
      <div className="overlay">
        <Card>
          {children}
          <Button intent="danger" onClick={closeOpen}>
            Close
          </Button>
        </Card>
      </div>
    </Overlay>
  );
}

export { OverlayBox };
