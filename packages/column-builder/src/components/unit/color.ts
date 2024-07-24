import { hyperStyled } from "@macrostrat/hyper";
import pkg from "react-color";
const { ChromePicker } = pkg;

import { Popover2 } from "@blueprintjs/popover2";
import styles from "../comp.module.scss";

const h = hyperStyled(styles);

interface ColorProps {
  color: string;
  onChange: (hex: string) => void;
}

function ColorBlock(props: ColorProps) {
  const onChange = (color: { hex: string }) => {
    const { hex } = color;
    props.onChange(hex);
  };
  return h("div", [
    h(
      Popover2,
      {
        content: h(ChromePicker, {
          onChange: onChange,
          color: props.color ? props.color : "black",
        }),
      },
      [h("div.color-block", { style: { backgroundColor: props.color } })]
    ),
  ]);
}

export { ColorBlock };
