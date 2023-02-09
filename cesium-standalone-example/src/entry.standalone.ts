import "core-js/stable";
import "regenerator-runtime/runtime";
// Styles

// done with styles!
import { render } from "react-dom";
import h from "@macrostrat/hyper";
import App from ".";

const main = document.createElement("div");
main.className = "main";
document.body.appendChild(main);

const accessToken = process.env.MAPBOX_API_TOKEN;

render(h(App, { accessToken }), main);

document.title = "Macrostrat Digital Globe";
