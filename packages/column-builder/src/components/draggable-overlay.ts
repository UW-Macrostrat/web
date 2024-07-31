import { hyperStyled } from "@macrostrat/hyper";
import { useState, useEffect, ReactChild } from "react";
import { Overlay, Card } from "@blueprintjs/core";
import styles from "./comp.module.sass";

const h = hyperStyled(styles);
interface DraggableOverlayPropsI {
  open: boolean;
  children: ReactChild;
  title?: string;
  cardStyles?: object;
  top?: number;
  left?: number;
}

function DraggableOverlay(props: DraggableOverlayPropsI) {
  const { open, children, cardStyles = {}, top = 0, left = 0 } = props;

  const [state, setState] = useState({ top, left });
  const [offset, setOffset] = useState({ rel_x: 0, rel_y: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    //setup event listeners
    if (!dragging) return;
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseup", onMouseUp, true);
    return () => {
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("mousemove", onMouseMove, true);
    };
  }, [dragging]);

  const onMouseDown = (e: any) => {
    if (e.button !== 0) return;
    setDragging(true);
    setOffset(getOffest(e));
  };

  const onMouseUp = (e: any) => {
    setDragging(false);
    e.stopPropagation();
    e.preventDefault();
  };

  const getOffest = (e: any) => {
    const rel_x = e.pageX - state.left;
    const rel_y = e.pageY - state.top;
    return { rel_x, rel_y };
  };

  const onMouseMove = (e: any) => {
    if (dragging) {
      const { rel_x, rel_y } = offset;
      const left_ = e.pageX - rel_x;
      const top_ = e.pageY - rel_y;
      setState({ top: top_, left: left_ });
      const portals = Array.from(
        document.getElementsByClassName(
          "bp5-portal"
        ) as HTMLCollectionOf<HTMLElement>
      );
      portals.map((portal) => {
        portal.style.top = `${top_}px`;
        portal.style.left = `${left_}px`;
      });
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

  return h(Overlay, { isOpen: open, ...overlayProperties }, [
    h("div", {}, [
      h(Card, { style: { padding: 0, paddingBottom: "5px" }, elevation: 4 }, [
        h("div.header-drag", { onMouseDown: onMouseDown }, [props.title]),
        children,
      ]),
    ]),
  ]);
}

export { DraggableOverlay };
