import { Button, ButtonGroup, Checkbox } from "@blueprintjs/core";
import h from "@macrostrat/hyper";

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
      onClick: props.onClick,
    },
    [props.text]
  );
}

export interface ColBtnMenuI {
  toggleUnitsView?: () => void;
  toggleDrag: () => void;
  state: {
    unitsView: boolean;
    drag: boolean;
    divideIds: number[];
    mergeIds: number[];
  };
  divideSection: () => void;
  mergeSections: () => void;
}

function ColumnPageBtnMenu(props: ColBtnMenuI) {
  const {
    state: { unitsView, drag, divideIds, mergeIds },
  } = props;
  //@ts-ignore
  return h(ButtonGroup, [
    h(
      Button,
      {
        onClick: props.toggleUnitsView,
        intent: unitsView ? "primary" : "none",
        disabled: unitsView,
      },
      ["Unit view"]
    ),
    h(
      Button,
      {
        onClick: props.toggleUnitsView,
        intent: !unitsView ? "primary" : "none",
        disabled: !unitsView,
      },
      ["Section View"]
    ),
    h(Button, { onClick: props.toggleDrag, disabled: !unitsView }, [
      drag ? "Disable drag" : "Enable drag",
    ]),
    h.if(!unitsView)(MergeDivideBtn, {
      onClick: props.mergeSections,
      disabled: mergeIds.length < 2,
      text: "Merge Sections",
    }),
    h.if(unitsView)(MergeDivideBtn, {
      text: "Divide section",
      onClick: props.divideSection,
      disabled: divideIds.length < 1,
    }),
  ]);
}
export * from "./reducer";
export * from "./map";
export { SectionUnitCheckBox, MergeDivideBtn, ColumnPageBtnMenu };
