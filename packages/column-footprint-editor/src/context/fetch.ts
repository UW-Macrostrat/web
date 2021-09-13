import axios from "axios";

async function fetchColumns(project_id) {
  let url = `http://0.0.0.0:8000/${project_id}/columns`;
  const res = await axios.get(url);

  return res.data;
}

async function fetchLines(project_id) {
  let url = `http://0.0.0.0:8000/${project_id}/lines`;
  const res = await axios.get(url);

  return res.data;
}

async function fetchProjColGroups(project_id) {
  let url = `http://0.0.0.0:8000/${project_id}/col-groups`;
  const res = await axios.get(url);
  return res.data.data;
}

export { fetchColumns, fetchLines, fetchProjColGroups };
