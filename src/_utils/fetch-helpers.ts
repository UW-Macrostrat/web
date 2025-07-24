import { apiV2Prefix, apiDomain } from "@macrostrat-web/settings";
import fetch from "cross-fetch";

export async function fetchAPIData(apiURL: string, params: any) {
  let url = new URL(apiV2Prefix + apiURL);
  if (params != null) {
    url.search = new URLSearchParams(params).toString();
  }
  const res = await fetch(url.toString());
  const res1 = await res?.json();
  return res1?.success?.data || [];
}

export async function fetchAPIRefs(apiURL: string, params: any) {
  let url = new URL(apiV2Prefix + apiURL);
  if (params != null) {
    url.search = new URLSearchParams(params).toString();
  }
  const res = await fetch(url.toString());
  const res1 = await res?.json();
  return res1?.success?.refs || [];
}

export async function fetchPGData(apiURL: string, params: any) {
  let url = new URL(apiDomain + "/api/pg" + apiURL);
  if (params != null) {
    url.search = new URLSearchParams(params).toString();
  }
  console.log("Fetching PG Data from:", url.toString());
  const res = await fetch(url.toString());
  const res1 = await res?.json();
  return res1 || [];
}
