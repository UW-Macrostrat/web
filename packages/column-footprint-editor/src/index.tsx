import React from "react";
import { render } from "react-dom";
import { Map } from "./components";

function App() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}
    >
      <Map />
    </div>
  );
}

render(<App />, document.getElementById("root"));
