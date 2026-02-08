import { scaleLinear } from "@visx/scale";
import { AxisBottom } from "@visx/axis";
import { asChromaColor } from "@macrostrat/color-utils";
import h from "./main.module.sass";

export function AgeRefinementPlot({ macrostrat, mapInfo }) {
  // Plot the amount by which the age was refined

  const mapData = mapInfo.mapData[0];
  const b_age = Math.max(mapData.b_int.b_age, macrostrat.b_age);
  const t_age = Math.min(mapData.t_int.t_age, macrostrat.t_age);

  const scale = scaleLinear({
    domain: [1.02 * b_age, t_age * 0.98],
    range: [20, 360],
  });

  // use visx to plot the age refinement
  return h("div.age-refinement-plot", [
    h(AgeRefinementBar, {
      scale,
      data: macrostrat,
      label: "Macrostrat age model",
    }),
    h(AgeRefinementBar, {
      scale,
      data: mapData,
      label: "Map legend",
    }),
    // Age axis
    h("svg", { width: "100%", height: "40px" }, [
      h(AxisBottom, {
        scale,
        numTicks: 5,
        top: 1,
        left: 0,
        label: "Age (Ma)",
      }),
    ]),
  ]);
}

function AgeRefinementBar({ scale, data, color, label = null }) {
  const { b_int, t_int } = data;
  const b_age = data.b_age ?? b_int.b_age;
  const t_age = data.t_age ?? t_int.t_age;
  const backgroundColor = color ?? b_int.color;
  const accentColor = asChromaColor(backgroundColor).darken(0.5).hex();
  const labelColor = asChromaColor(backgroundColor).darken(2).hex();

  const left = scale(b_age);
  const width = scale(t_age) - scale(b_age);

  let labelTranslate = 5;
  let textAlign = "start";

  // Adjust label placement

  if (width < 100) {
    if (left < 100) {
      labelTranslate = width + 5;
    } else {
      labelTranslate = -305;
      textAlign = "end";
    }
  }

  return h(
    "div.age-refinement-bar",
    {
      style: {
        marginLeft: `${left}px`,
        width: `${width}px`,
        height: "18px",
        backgroundColor,
        border: `2px solid ${accentColor}`,
        position: "relative",
      },
    },
    h(
      "div.age-refinement-bar-label",
      {
        style: {
          transform: `translateX(${labelTranslate}px)`,
          color: labelColor,
          fontSize: "10px",
          width: 300,
          textAlign,
        },
      },
      label
    )
  );
}
