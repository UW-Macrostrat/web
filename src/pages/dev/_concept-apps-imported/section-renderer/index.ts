import "core-js/stable";
import "regenerator-runtime/runtime";

import { FocusStyleManager } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";

FocusStyleManager.onlyShowFocusOnTabs();

import { render } from "react-dom";
import h from "@macrostrat/hyper";
import App from "./app";
import "./main.styl";

render(h(App), document.querySelector("#app"));
