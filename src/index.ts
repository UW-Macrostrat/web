import "@blueprintjs/core/lib/css/blueprint.css";
import "./styles/padding.css";
import { FocusStyleManager } from "@blueprintjs/core";

import h from "@macrostrat/hyper";
import { Page } from "./pages/map/index.page.client";

FocusStyleManager.onlyShowFocusOnTabs();

import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("app-container"));

// Render the application
root.render(h(Page));
