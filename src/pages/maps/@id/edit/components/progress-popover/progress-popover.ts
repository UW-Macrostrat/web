import { ProgressBar, ProgressBarProps } from "@blueprintjs/core";

import hyper from "@macrostrat/hyper";

import styles from "./main.module.sass";
const h = hyper.styled(styles);

export interface ProgressPopoverProps extends React.HTMLProps<HTMLDivElement> {
  text: string;
  value: number;
  progressBarProps?: ProgressBarProps;
}

export default function ProgressPopover({text, value, progressBarProps}: ProgressPopoverProps) {
  return h("div", {
    className: "progress-popover"
  }, [
    h(ProgressBar, {
      value: value,
      ...progressBarProps
    }),
    h("div", {
      className: "progress-popover-text"
    }, text)
  ]);
}
