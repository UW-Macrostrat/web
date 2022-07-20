import { useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { Lith, LithUnit } from "~/types";
import { LithSegment, LithSegmentContainer } from "./renderer";
import { Dialog, Switch, Button, Intent, Divider } from "@blueprintjs/core";
import styles from "./lith.module.scss";
import { LithSelect } from "./query-list";

const h = hyperStyled(styles);

interface LithDialogProps {
  liths?: LithUnit[];
  onRemove?: (l: LithUnit) => void;
  onClose: () => void;
  onSwitchChange: (i: number) => void;
  onAdd: (l: Lith) => void;
  isOpen: boolean;
}
function LithDialog(props: LithDialogProps) {
  const {
    liths = [],
    isOpen,
    onRemove = (l) => console.log(l),
    onClose,
    onSwitchChange,
    onAdd,
  } = props;

  const title = "Manage lithologies";

  const onChange = (id: number) => {
    onSwitchChange(id);
  };

  return h(
    Dialog,
    {
      isOpen,
      onClose,
      title,
      isCloseButtonShown: true,
    },
    [
      h("div.lith-dialog", [
        h(LithSegmentContainer, { liths, onClick: () => {}, large: false }),
        h("div.lith-switches", [
          liths.map((lith, i) => {
            return h(LithSwitch, { lith, index: i, onChange, onRemove });
          }),
        ]),
        h(Divider),
        h("div.lith-select", [h(LithSelect, { onItemSelect: onAdd })]),
      ]),
    ]
  );
}

interface LithSwitchProps {
  lith: LithUnit;
  onChange: (id: number) => void;
  onRemove?: (l: LithUnit) => void;
}
function LithSwitch(props: LithSwitchProps) {
  const { lith, onRemove } = props;
  return h("div.row", [
    h("div.lith-item", [
      h(LithSegment, {
        lith,
        large: true,
        onRemove,
        widthInherit: false,
      }),
    ]),
    // switch between dom and sub
    h("div.switch", [
      h(Switch, {
        innerLabel: "Sub",
        innerLabelChecked: "Dom",
        checked: lith.prop == "dom",
        onChange: () => props.onChange(lith.id),
      }),
    ]),
  ]);
}

interface LithContainerProps {
  liths: LithUnit[];
  large: boolean;
  onRemove?: (l: LithUnit) => void;
  onAdd: (l: Lith) => void;
  onSwitchProp: (id: number, prop: "dom" | "sub") => void;
  isEditing: boolean;
}
function LithContainer(props: LithContainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const onClickOpen = () => {
    if (!props.isEditing) return;
    setIsOpen(true);
  };

  return h("div", [
    h(LithDialog, {
      isOpen,
      onClose: () => setIsOpen(false),
      onAdd: props.onAdd,
      onSwitchChange: props.onSwitchProp,
      liths: props.liths,
      onRemove: props.onRemove,
    }),
    h("div.row", [
      h(LithSegmentContainer, {
        liths: props.liths,
        onRemove: props.onRemove,
        onClick: onClickOpen,
        large: props.large,
      }),
      h.if(props.isEditing)(Button, {
        intent: Intent.SUCCESS,
        icon: "plus",
        onClick: onClickOpen,
        minimal: true,
      }),
    ]),
  ]);
}

export { LithDialog, LithContainer };
