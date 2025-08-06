import { apiV2Prefix, postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "cross-fetch";

export async function fetchAPIData(apiURL: string, params: any) {
  let url = new URL(apiV2Prefix + apiURL);
  if (params != null) {
    url.search = new URLSearchParams(params).toString();
  }
  const res = await fetchWrapper(url.toString());
  const res1 = await res?.json();
  return res1?.success?.data || [];
}

export async function fetchAPIRefs(apiURL: string, params: any) {
  let url = new URL(apiV2Prefix + apiURL);
  if (params != null) {
    url.search = new URLSearchParams(params).toString();
  }
  const res = await fetchWrapper(url.toString());
  const res1 = await res?.json();
  return res1?.success?.refs || [];
}

export async function fetchPGData(apiURL: string, params: any) {
  let url = new URL(postgrestPrefix + apiURL);
  if (params != null) {
    url.search = new URLSearchParams(params).toString();
  }
  const res = await fetchWrapper(url.toString());
  const res1 = await res?.json();
  return res1 || [];
}

function fetchWrapper(url: string): Promise<Response> {
  const startTime = performance.now();

  return fetch(url).then((response) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(
      `Fetching ${url} - status ${response.status} - ${duration.toFixed(2)} ms`
    );
    return response;
  });
}
