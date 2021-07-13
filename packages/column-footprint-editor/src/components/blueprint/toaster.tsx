import React from "react";
import { Toaster, Icon, ProgressBar } from "@blueprintjs/core";

const AppToaster = Toaster.create({
  position: "top",
  maxToasts: 1,
});

const SavingToast = () => {
  return (
    <div>
      <h4 style={{ marginLeft: "10px", margin: "0px" }}>Saving...</h4>
      <ProgressBar />
    </div>
  );
};

const SuccessfullySaved = () => {
  return (
    <div style={{ display: "flex" }}>
      <Icon style={{ marginRight: "10px" }} icon="tick" />
      <h4 style={{ margin: "0px" }}>Saved Successfully!</h4>
    </div>
  );
};

const BadSaving = () => {
  return (
    <div style={{ display: "flex" }}>
      <Icon style={{ marginRight: "10px" }} icon="error" />
      Error While Saving
    </div>
  );
};

export { AppToaster, SavingToast, SuccessfullySaved, BadSaving };
