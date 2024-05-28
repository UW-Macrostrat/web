import h from "@macrostrat/hyper";
import { useState, useEffect } from "react";
import { ResizeSensor } from "@blueprintjs/core";
import { RotationsProvider } from "@macrostrat/corelle";
import { Timescale } from "@macrostrat/timescale";
// import "@macrostrat/timescale/dist/timescale.css";
import { Map } from "./map";
import { getQueryString, setQueryString } from "@macrostrat/ui-components";

function useTimeState(initialValue) {
  /** Time state hook that also manages query URL */
  let { time: _initialValue } = getQueryString() ?? {};
  const val = parseInt(_initialValue);
  const _init = isNaN(val) ? initialValue : val;

  const [time, _setTime] = useState(_init);
  const setTime = t => {
    _setTime(t);
    setQueryString({ time: t });
  };

  return [time, setTime];
}

function useTimeRange(range: [number, number], initialValue: number) {
  /** A time range that can be stepped through with arrow keys */

  const [time, setTime] = useTimeState(initialValue);

  useEffect(() => {
    function checkKey(e) {
      e = e || window.event;
      if (e.keyCode == "37") {
        // left arrow
        setTime(Math.min(time + 2, range[0]));
      } else if (e.keyCode == "39") {
        // right arrow
        setTime(Math.max(time - 2, range[1]));
      }
    }
    document.onkeydown = checkKey;
  }, [time]);

  return [time, setTime];
}

function App() {
  /** The core app component */
  const model = "Wright2013";

  const [time, setTime] = useTimeRange([542, 0], 300);
  const [size, setSize] = useState({
    width: 1100,
    height: 800
  });

  return h(
    ResizeSensor,
    {
      onResize(entries) {
        const { width, height } = entries[0].contentRect;
        return setSize({ width, height });
      }
    },
    [
      h("div.app", [
        h(RotationsProvider, { model, time, debounce: 1000 }, [
          h(Map, { width: size.width, height: size.height - 100 })
        ]),
        // Many of these timescale options need to be simplified
        h(Timescale, {
          ageRange: [542, 0],
          orientation: "horizontal",
          length: size.width - 20,
          absoluteAgeScale: true,
          rootInterval: 751,
          levels: [2, 3],
          cursorPosition: time,
          axisProps: {
            orientation: "top",
            tickLength: 4,
            hideAxisLine: true,
            labelOffset: 10
          },
          onClick(event, age) {
            setTime(Math.round(age));
          }
        })
      ])
    ]
  );
}

App.isReactComponent = true;

export default App;
