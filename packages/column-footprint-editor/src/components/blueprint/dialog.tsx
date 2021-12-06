import React, { useState, useEffect } from "react";
import { Overlay, Button, Card } from "@blueprintjs/core";
import "./main.css";

function OverlayBox(props) {
  const {
    open,
    children,
    closeOpen,
    className = "overlay",
    closeButton = true,
    cardStyles = {},
  } = props;

  const [state, setState] = useState({ top: 100, left: 20 });
  const [offset, setOffset] = useState({ rel_x: 0, rel_y: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    //setup event listeners
    if (!dragging) return;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [dragging]);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setOffset(getOffest(e));
  };

  const onMouseUp = (e) => {
    setDragging(false);
    e.stopPropagation();
    e.preventDefault();
  };

  const getOffest = (e) => {
    const rel_x = e.pageX - state.left;
    const rel_y = e.pageY - state.top;
    return { rel_x, rel_y };
  };

  const onMouseMove = (e) => {
    if (dragging) {
      const { rel_x, rel_y } = offset;
      const left_ = e.pageX - rel_x;
      const top_ = e.pageY - rel_y;
      setState({ top: top_, left: left_ });
    }
    e.stopPropagation();
    e.preventDefault();
  };

  const overlayProperties = {
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: true,
    enforceFocus: false,
    hasBackdrop: false,
    usePortal: true,
    useTallContent: false,
  };

  const style = { top: `${state.top}px`, left: `${state.left}px` };

  return (
    <Overlay isOpen={open} {...overlayProperties}>
      <div className={className} style={style} onMouseDown={onMouseDown}>
        <Card style={cardStyles}>
          {children}
          {closeButton ? (
            <Button intent="danger" onClick={closeOpen}>
              Close
            </Button>
          ) : null}
        </Card>
      </div>
    </Overlay>
  );
}

export { OverlayBox };
