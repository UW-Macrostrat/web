import React from "react";
import { base } from "../../context/env";
import axios from "axios";
import {
  AppToaster,
  SavingToast,
  SuccessfullySaved,
  BadSaving,
} from "../blueprint";

const onSaveLines = async (changeSet, project_id) => {
  AppToaster.show({
    message: <SavingToast />,
    intent: "primary",
  });
  try {
    let url = base + `${project_id}/lines`;
    const res = await axios.put(url, {
      change_set: changeSet,
      project_id,
    });
    AppToaster.show({
      message: <SuccessfullySaved />,
      intent: "success",
      timeout: 3000,
    });
  } catch (error) {
    AppToaster.show({
      message: <BadSaving />,
      intent: "danger",
      timeout: 5000,
    });
  }
};

export { onSaveLines };
