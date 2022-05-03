import { Button, Checkbox } from "@blueprintjs/core";
import h from "react-hyperscript";

function SectionUnitCheckBox(props: {
  data: any;
  onChange: (e: number) => void;
}) {
  const onChange = (e) => {
    e.stopPropagation();
    props.onChange(props.data);
  };
  return h(Checkbox, { onChange });
}

function MergeDivideBtn(props: {
  onClick: () => void;
  disabled: boolean;
  text: string;
}) {
  return h(
    Button,
    {
      disabled: props.disabled,
      minimal: true,
      onClick: props.onClick,
      intent: "success",
    },
    [props.text]
  );
}
export * from "./map";
export { SectionUnitCheckBox, MergeDivideBtn };
