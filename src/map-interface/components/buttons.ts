import h from "@macrostrat/hyper";
import { Button, ButtonProps } from "@blueprintjs/core";
import { useHashNavigate } from "../app-state/nav-hooks";

export const LinkButton = (props: ButtonProps & { to: string }) => {
  const { to, ...rest } = props;
  const onClick = useHashNavigate(to);
  return h(Button, {
    ...rest,
    onClick,
  });
};
