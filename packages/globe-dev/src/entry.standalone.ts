import { render } from "react-dom";
import h from "@macrostrat/hyper";
import { App } from "./app";

const main = document.createElement("div");
main.className = "main";
document.body.appendChild(main);

const accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

render(h(App, { accessToken }), main);
