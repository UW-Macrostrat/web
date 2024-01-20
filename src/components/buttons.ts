import { Button, ButtonProps } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { useHashNavigate } from "../app-state";

export const LinkButton = (props: ButtonProps & { to: string }) => {
  const { to, ...rest } = props;
  const onClick = useHashNavigate(to);
  return h(Button, {
    ...rest,
    onClick,
  });
};
