import Base from "mapbox-gl-controls/lib/Base/Base";
import Button from "mapbox-gl-controls/lib/Button/Button";

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
