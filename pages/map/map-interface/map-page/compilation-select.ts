/** Which compilation the map is drawn from: a dropdown for the Settings page's
 * Experiments panel.
 *
 * Every served compilation the API knows is listed, with the legacy carto
 * build beside the default; choosing one repoints the map's tiles at
 * `/map/{slug}` and the location panel's query at the same compilation, so
 * what is described is what is drawn. **Default** chooses none, so the servers'
 * default build answers and nothing goes in the URL; anything else is carried
 * in the hash so a view can be shared.
 * Beta: tiles for a non-default compilation are drawn per request rather than
 * cached. A scale-dependent compilation viewed outside its zoom band gets a
 * warning underneath.
 */
import { HTMLSelect, Tag } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { useAppActions, useAppState } from "../app-state";
import { compilationLabel, compilationsAtom } from "~/_utils/compilations";
import { CompilationZoomWarning } from "~/components";
import h from "./settings-panel.module.sass";

/** The servers' default build: `carto` once an environment has switched,
 * the legacy build before. */
const DEFAULT_OPTION = { value: "", label: "Default" };

export function CompilationSelect() {
  const compilations = useAtomValue(compilationsAtom);
  const current = useAppState((s) => s.compilation) ?? "";
  const zoom = useAppState((s) => s.mapPosition.target?.zoom ?? null);
  const runAction = useAppActions();

  let options: { value: string; label: string }[];
  let disabled = false;
  let selected = null;
  if (compilations.state == "hasData") {
    options = [
      DEFAULT_OPTION,
      ...compilations.data.map((c) => ({
        value: c.slug,
        label: compilationLabel(c),
      })),
    ];
    selected = compilations.data.find((c) => c.slug == current) ?? null;
  } else {
    // Loading, or the list could not be fetched: show what is drawn, inert.
    options = [{ value: current, label: current || DEFAULT_OPTION.label }];
    disabled = true;
  }

  return h("div.control-wrapper.compilation-control", [
    h("span.control-label", [
      h("span.control-label-text", "Compilation"),
      h(Tag, { minimal: true }, "Beta"),
    ]),
    h(HTMLSelect, {
      fill: true,
      disabled,
      value: current,
      options,
      onChange(evt) {
        let compilation: string | null = evt.currentTarget.value;
        if (compilation == "") compilation = null;
        runAction({ type: "set-compilation", compilation });
      },
    }),
    h(CompilationZoomWarning, { compilation: selected, zoom }),
    h("p.info", "The compilation the map is drawn from and described by."),
  ]);
}
