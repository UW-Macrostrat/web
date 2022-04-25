import { Button, Checkbox } from "@blueprintjs/core";
import h from "react-hyperscript";

function ColumnSectionCheckBox(props: {
  data: any;
  onChange: (e: number) => void;
}) {
  const onChange = (e) => {
    props.onChange(props.data);
  };
  return h(Checkbox, { onChange });
}

function MergeSectionsBtn(props: { onClick: () => void; disabled: boolean }) {
  return h(
    Button,
    {
      disabled: props.disabled,
      minimal: true,
      onClick: props.onClick,
      intent: "success",
    },
    ["Merge"]
  );
}

export { ColumnSectionCheckBox, MergeSectionsBtn };
