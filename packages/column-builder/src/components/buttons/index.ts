import { hyperStyled } from "@macrostrat/hyper";
import { useModelEditor } from "@macrostrat/ui-components";
import { Link } from "../routing/routing-helpers";
import { Button, ButtonGroup } from "@blueprintjs/core";
import styles from "./btns.module.scss";
import { ReactChild } from "react";

const h = hyperStyled(styles);

function EditButton({
  href,
  small = false,
}: {
  href: string;
  small?: boolean;
}) {
  return h(Link, { href }, [
    h(Button, {
      small,
      minimal: true,
      intent: "success",
      icon: "edit",
      onClick: (e) => {
        e.stopPropagation();
      },
    }),
  ]);
}

interface CreateButtonI {
  text: string;
  href: string;
  minimal?: boolean;
}

function CreateButton(props: CreateButtonI) {
  const { text, href, minimal = true } = props;
  return h(Link, { href }, [
    h(
      Button,
      {
        minimal,
        intent: "success",
      },
      [text]
    ),
  ]);
}

interface CancelButtonI {
  href: string;
}

function CancelButton(props: CancelButtonI) {
  const { href } = props;
  return h(Link, { href }, [
    h(
      Button,
      {
        intent: "danger",
      },
      ["Cancel"]
    ),
  ]);
}

function SubmitButton(props: { disabled?: boolean }) {
  const { hasChanges, actions } = useModelEditor();

  return h(
    Button,
    {
      disabled: props.disabled || !hasChanges(),
      intent: "success",
      onClick: () => actions.persistChanges(),
    },
    ["Submit"]
  );
}

function AddButton(props: {
  onClick: () => void;
  minimal?: boolean;
  children: ReactChild;
}) {
  const { onClick, minimal = true, children } = props;

  return h(
    Button,
    { minimal: minimal, onClick, fill: true, intent: "success" },
    ["+ ", children]
  );
}

function PositionIncrementBtns(props: {
  onClickUp: () => void;
  onClickDown: () => void;
  position_bottom: number;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return h("div.position-increment-container", [
    props.position_bottom,
    h(ButtonGroup, { vertical: true, minimal: true }, [
      h(Button, {
        icon: "chevron-up",
        className: styles["flat-btn"],
        disabled: props.isFirst,
        onClick: props.onClickUp,
      }),
      h(Button, {
        icon: "chevron-down",
        className: styles["flat-btn"],
        disabled: props.isLast,
        onClick: props.onClickDown,
      }),
    ]),
  ]);
}

export {
  CreateButton,
  EditButton,
  SubmitButton,
  CancelButton,
  AddButton,
  PositionIncrementBtns,
};
