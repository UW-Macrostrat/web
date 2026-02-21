import { apiV2Prefix, postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "cross-fetch";

export async function fetchAPIV2Result(apiURL: string, params: any) {
  let url = new URL(apiV2Prefix + apiURL);
  if (params != null) {
    let p1 = params;
    // If we already have a URLSearchParams object, just use it directly
    if (!(p1 instanceof URLSearchParams)) {
      p1 = new URLSearchParams(params);
    }
    url.search = p1.toString();
  }
  try {
    const res = await fetchWrapper(url.toString());
    const res1 = await res?.json();
    if (res1.error != null) {
      const msg = res1.error?.message ?? res1.error;
      throw new Error(msg);
    }
    return res1?.success;
  } catch (error) {
    let msg = error?.message ?? error;
    console.error(`Error fetching ${url}:`, msg);
    throw error;
  }
}

export async function fetchAPIData(apiURL: string, params: any) {
  const res = await fetchAPIV2Result(apiURL, params);
  return res?.data || [];
}

export async function fetchAPIRefs(apiURL: string, params: any) {
  const res = await fetchAPIV2Result(apiURL, params);
  return res?.refs || [];
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

function isServer() {
  return (
    typeof window === "undefined" ||
    (typeof process !== "undefined" && process.release?.name === "node")
  );
}

async function fetchWrapper(url: string): Promise<Response> {
  const startTime = performance.now();
  try {
    const res = await fetch(url);
    if (isServer()) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(
        `Fetching ${url} - status ${res.status} - ${duration.toFixed(2)} ms`
      );
      const cacheStatus = res.headers.get("x-cache");
      if (cacheStatus != null) {
        console.log(`Cache: ${cacheStatus}`);
      }
    }
    return res;
  } catch (error) {
    // Not really sure why we have to catch and re-throw here, but if we don't,
    // the app crashes.
    throw new Error(`Network error while fetching ${url}: ${error}`);
  }
}
