import React from "react";
import { AppContextProvider } from "./context";
import { Map } from "./components";

export function App() {
  return (
    <AppContextProvider>
      <div>
        <Map />
      </div>
    </AppContextProvider>
  );
}
