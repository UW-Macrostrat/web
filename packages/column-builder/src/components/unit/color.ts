import pkg from "react-color";
import { Popover } from "@blueprintjs/core";
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
      Popover,
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
