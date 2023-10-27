import hyper from "@macrostrat/hyper";
import { useRef, useEffect } from "react";
import { Timescale } from "@macrostrat/timescale";
import { useElementSize, useAPIResult } from "@macrostrat/ui-components";
import { useAppActions } from "../../../../map-interface/app-state";
import { HTMLSelect, Spinner, Button } from "@blueprintjs/core";
import styles from "./main.module.styl";
import { useAppState } from "../../../../map-interface/app-state";
import { SETTINGS } from "~/map-interface/settings";

const h = hyper.styled(styles);

function BrokenTimescale({ length, ageRange = [1000, 0] }) {
  const runAction = useAppActions();
  const age = useAppState((s) => s.core.timeCursorAge);
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

  const props = {
    absoluteAgeScale: true,
    levels: ageSpan < 80 ? [2, 4] : [1, 3],
    onClick(d, t) {
      runAction({
        type: "set-time-cursor",
        age: Math.round(t),
      });
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

function PlateModelSelector({ models }) {
  const runAction = useAppActions();
  const plateModelId = useAppState((s) => s.core.plateModelId);

  if (models == null) return null;

  const onChange = (evt) => {
    const { value } = evt.target;
    runAction({
      type: "set-plate-model",
      plateModel: value,
    });
  };

  return h(HTMLSelect, {
    value: plateModelId,
    onChange,
    options: models
      .filter((d) => {
        return d.id != 5;
      })
      .map((d) => ({
        label: d.name,
        value: d.id,
      })),
  });
}

export function TimescalePanel() {
  const plateModelId = useAppState((s) => s.core.plateModelId);
  const models = useAPIResult(
    SETTINGS.burwellTileDomain + "/carto/rotation-models"
  );
  const ref = useRef<HTMLDivElement>(null);
  const age = useAppState((s) => s.core.timeCursorAge);
  const sz = useElementSize(ref);
  const model = models?.find((d) => d.id == plateModelId);
  const runAction = useAppActions();

  useEffect(() => {
    if (model == null) return;
    const { max_age, min_age } = model;
    if (age > max_age) {
      runAction({
        type: "set-time-cursor",
        age: max_age,
      });
    } else if (age < min_age) {
      runAction({
        type: "set-time-cursor",
        age: min_age,
      });
    }
  }, [model]);

  return h("div.timescale-panel", [
    h("div.controls", [
      h("h3", [
        h("span", "Age:"),
        " ",
        h("span.age", age),
        " ",
        h("span", "Ma"),
      ]),
      h(PlateModelSelector, { models }),
    ]),
    h("div.timescale-holder", { ref }, [
      h(BrokenTimescale, {
        length: sz?.width,
        ageRange: ageRangeForModel(model),
      }),
    ]),
    h(Button, {
      icon: "cross",
      minimal: true,
      small: true,
      className: "close-button",
      onClick() {
        runAction({ type: "set-time-cursor", age: null });
      },
    }),
  ]);
}

function ageRangeForModel(model) {
  if (model == null) return [3500, 0];
  const { max_age, min_age } = model;
  return [max_age ?? 3500, min_age ?? 0];
}
