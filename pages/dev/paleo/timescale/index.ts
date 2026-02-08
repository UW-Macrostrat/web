import hyper from "@macrostrat/hyper";
import { useRef } from "react";
import { Timescale, type TimescaleProps } from "@macrostrat/timescale";
import { useElementSize } from "@macrostrat/ui-components";
import { Spinner, Button } from "@blueprintjs/core";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

function BrokenTimescale({ length, ageRange = [1000, 0], age, setAge }) {
  if (length == null) return h(Spinner);

  let [maxAge, minAge] = ageRange;
  let breakAge = 541;
  let oldLength = length / 2;
  let newLength = length / 2;
  const ageSpan = maxAge - minAge;
  if (ageRange[0] < 700) {
    breakAge = maxAge;
    oldLength = null;
    newLength = length;
  } else {
    // Adjust length
    let defaultBreakPoint = (breakAge / ageSpan) * length;

    const ratio = 0.5;
    oldLength = defaultBreakPoint * ratio;
    newLength = length - oldLength;
  }

  const props: Partial<TimescaleProps> = {
    absoluteAgeScale: true,
    levels: ageSpan < 80 ? [2, 4] : [1, 3],
    onClick(e, data) {
      const { age } = data;
      setAge(Math.round(age));
    },
  };

  return h("div.broken-timescale", [
    h.if(oldLength != null)(Timescale, {
      length: oldLength,
      cursorPosition: age > breakAge ? age : null,
      ageRange: [maxAge, breakAge],
      ...props,
    }),
    h(Timescale, {
      length: newLength,
      cursorPosition: age < breakAge ? age : null,
      ageRange: [breakAge, minAge],
      ...props,
    }),
  ]);
}

export function TimescalePanel({ age, setAge, ageRange }) {
  const ref = useRef<HTMLDivElement>(null);
  const sz = useElementSize(ref);

  return h("div.timescale-panel", [
    h("div.timescale-holder", { ref }, [
      h(BrokenTimescale, {
        length: sz?.width,
        ageRange,
        age,
        setAge,
      }),
    ]),
    h(Button, {
      icon: "cross",
      minimal: true,
      small: true,
      className: "close-button",
      onClick() {
        //runAction({ type: "set-time-cursor", age: null });
      },
    }),
  ]);
}
