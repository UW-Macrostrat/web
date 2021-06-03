import React from "react";
import { render } from "react-dom";
import { Map } from "./components";

function App() {
  return (
    <div>
      <Map />
    </div>
  );
}

render(<App />, document.getElementById("root"));
