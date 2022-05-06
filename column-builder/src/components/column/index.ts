import { Button, ButtonGroup, Checkbox } from "@blueprintjs/core";
import h from "react-hyperscript";

function SectionUnitCheckBox(props: {
  data: any;
  onChange: (e: number) => void;
}) {
  const onChange = (e: any) => {
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

export interface ColBtnMenuI {
  toggleUnitsView: () => void;
  toggleDrag: () => void;
  state: { unitsView: boolean; drag: boolean };
}

function ColumnPageBtnMenu(props: ColBtnMenuI) {
  const {
    state: { unitsView, drag },
  } = props;
  return h(ButtonGroup, [
    h(Button, { onClick: props.toggleUnitsView }, [
      unitsView ? "Section view" : "Unit view",
    ]),
    h(Button, { onClick: props.toggleDrag, disabled: !unitsView }, [
      drag ? "Disable drag" : "Enable drag",
    ]),
  ]);
}

export * from "./map";
export { SectionUnitCheckBox, MergeDivideBtn, ColumnPageBtnMenu };
