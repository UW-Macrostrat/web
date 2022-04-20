import { hyperStyled } from "@macrostrat/hyper";
//@ts-ignore
import { useModelEditor } from "@macrostrat/ui-components/lib/esm";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@blueprintjs/core";
import styles from "../comp.module.scss";
import { createLink } from "../helpers";

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

function SubmitButton() {
  const { hasChanges, actions } = useModelEditor();

  return h(
    Button,
    {
      disabled: !hasChanges(),
      intent: "success",
      onClick: () => actions.persistChanges(),
    },
    ["Submit"]
  );
}

export { CreateButton, EditButton, SubmitButton, CancelButton };
