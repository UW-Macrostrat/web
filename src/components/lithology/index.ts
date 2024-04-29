import { useInDarkMode } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";
import { Tag } from "@blueprintjs/core";
import { asChromaColor } from "@macrostrat/color-utils";

export function LithologyTag({ data }) {
  const darkMode = useInDarkMode();
  const luminance = darkMode ? 0.9 : 0.4;
  const color = asChromaColor(data.color);
  return h(
    Tag,
    {
      key: data.id,
      minimal: true,
      style: {
        color: color?.luminance(luminance).hex(),
        backgroundColor: color?.luminance(1 - luminance).hex(),
      },
    },
    data.name
  );
}
