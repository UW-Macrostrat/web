import "babel-polyfill";
import "@blueprintjs/core/lib/css/blueprint.css";
import "./styles/padding.css";

import { FocusStyleManager } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import App from "./app";

FocusStyleManager.onlyShowFocusOnTabs();

import { render } from "react-dom";

// Render the application
render(h(App), document.getElementById("app-container"));
