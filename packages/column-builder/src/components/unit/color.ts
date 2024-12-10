import pkg from "react-color";
import { Popover2 } from "@blueprintjs/popover2";
import h from "../comp.module.sass";

interface ColorProps {
  color: string;
  onChange: (hex: string) => void;
}

function ColorBlock(props: ColorProps) {
  const onChange = (color: { hex: string }) => {
    const { hex } = color;
    props.onChange(hex);
  };
  const color = props.color ?? "black";

  console.log(pkg);

  return h("div", [
    h(
      Popover2,
      {
        content: h(pkg, {
          onChange: onChange,
          color,
        }),
      },
      h("div.color-block", { style: { backgroundColor: color } })
    ),
  ]);
}

export { ColorBlock };
