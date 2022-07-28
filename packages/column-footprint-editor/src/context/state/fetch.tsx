import React from "react";
import {
  AppToaster,
  SavingToast,
  SuccessfullySaved,
  BadSaving,
} from "../../components/blueprint";
import axios from "axios";
import { base } from "../env";

async function fetchColumns(project_id) {
  let url = base + `${project_id}/columns`;
  const res = await axios.get(url);

  return res.data;
}

async function fetchLines(project_id) {
  let url = base + `${project_id}/lines`;
  const res = await axios.get(url);

  return res.data;
}

async function fetchPoints(project_id) {
  let url = base + `${project_id}/points`;
  const res = await axios.get(url);
  return res.data;
}

async function fetchProjColGroups(project_id) {
  let url = base + `${project_id}/col-groups`;
  const res = await axios.get(url);
  return res.data.data;
}

async function fetchVoronoiPolygons(project_id, points, radius, quad_segs) {
  let url = base + `${project_id}/voronoi`;
  const res = await axios.put(url, { points, radius, quad_segs });
  return res.data.polygons;
}

const saveLines = async (changeSet, project_id) => {
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
  } else {
    AppToaster.show({
      message: <SuccessfullySaved />,
      intent: "success",
      timeout: 3000,
    });
  }
};

export {
  fetchColumns,
  fetchLines,
  fetchVoronoiPolygons,
  fetchProjColGroups,
  fetchPoints,
  saveLines,
  saveVoronoiPolygons,
};
