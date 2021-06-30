import React from "react";
import { render } from "react-dom";
import { AppContextProvider } from "./context";
import { Map } from "./components";

function App() {
  return (
    <AppContextProvider>
      <div>
        <Map />
      </div>
    </AppContextProvider>
  );
}

render(<App />, document.getElementById("root"));
