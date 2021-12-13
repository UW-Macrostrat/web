import h from "@macrostrat/hyper";
import { Overlay } from "@blueprintjs/core";

function BottomOverlay(props) {
  const { open, children } = props;

  const overlayProperties = {
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: true,
    enforceFocus: false,
    hasBackdrop: false,
    usePortal: false,
    useTallContent: false,
    isOpen: open,
    transitionDuration: 0,
  };

  const divStyles = {
    bottom: "0",
    width: "100vw",
  };

  return h(Overlay, { ...overlayProperties }, [
    h("div", { style: { ...divStyles } }, [children]),
  ]);
}

export { BottomOverlay };
