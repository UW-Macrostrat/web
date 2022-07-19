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

/* 
Need to perform a post to the api endpoint; run a reset on voronoi state
and then updateColumnsandLines, maybe default back to topology
*/
const saveVoronoiPolygons = async (project_id, points, radius, quad_segs) => {
  AppToaster.show({
    message: <SavingToast message="Tessellating polygons..." />,
    intent: "primary",
  });
  let url = base + `${project_id}/voronoi`;
  const res = await axios.post(url, { points, radius, quad_segs });
  if (res.status == 404) {
    AppToaster.show({
      message: <BadSaving />,
      intent: "danger",
      timeout: 5000,
    });
    return false;
  } else {
    AppToaster.show({
      message: <SuccessfullySaved />,
      intent: "success",
      timeout: 3000,
    });
    return true;
  }
};

export { onSaveLines, saveVoronoiPolygons };
