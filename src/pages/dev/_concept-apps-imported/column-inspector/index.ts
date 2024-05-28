import "core-js/stable";
import "regenerator-runtime/runtime";

import { FocusStyleManager } from "@blueprintjs/core";
import "common/deps.styl";
import "./column-inspector.styl";

FocusStyleManager.onlyShowFocusOnTabs();

import { render } from "react-dom";
import App from "./app";
import h from "@macrostrat/hyper";

render(h(App), document.querySelector("#app"));
