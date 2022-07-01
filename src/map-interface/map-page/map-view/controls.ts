import h from "@macrostrat/hyper";
import Base from "mapbox-gl-controls/lib/Base/Base";
import Button from "mapbox-gl-controls/lib/Button/Button";
import { useRef, useEffect } from "react";
import { useMapRef } from "./context";

export class ThreeDControl extends Base {
  button: Button;

  constructor() {
    super();
    this.button = new Button();
  }

  insert() {
    this.addClassName("mapbox-3d");
    this.button.setText("3D");
    this.button.onClick(() => {
      this.map.easeTo({ pitch: 60, duration: 1000 });
    });
    this.addButton(this.button);
  }

  onAddControl() {
    this.insert();
  }
}

export function MapControlWrapper({ className, control }) {
  const map = useMapRef();
  const controlContainer = useRef<HTMLDivElement>();
  const controlRef = useRef<Base>();

  useEffect(() => {
    if (map?.current == null) return;
    const ctrl = new control();
    controlRef.current = ctrl;
    const controlElement = ctrl.onAdd(map.current);
    controlContainer.current.appendChild(controlElement);
    return () => {
      controlRef.current?.onRemove();
    };
  }, [map?.current, controlRef, controlContainer]);

  return h("div.map-control-wrapper", { className, ref: controlContainer });
}
