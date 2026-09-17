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
    console.log(error);
    // Not really sure why we have to catch and re-throw here, but if we don't,
    // the app crashes.
    throw new Error(`Network error while fetching ${url}: ${error}`);
  }
}

/** The full project definition list. It is small, changes rarely, and four
 * server-rendered pages need it before they can render anything — `/columns`
 * for its section headers and the project filter, `/projects`, a project
 * overview, a column page. The v2 route counts columns and units for every
 * project, so it is one of the slowest calls the server makes; caching it for
 * a few minutes keeps that off the critical path of most requests. */
const ALL_PROJECTS_TTL = 5 * 60 * 1000;

let allProjectsCache: { fetchedAt: number; value: Promise<any[]> } | null = null;

export function fetchAllProjects(): Promise<any[]> {
  const now = Date.now();
  if (allProjectsCache != null && now - allProjectsCache.fetchedAt < ALL_PROJECTS_TTL) {
    return allProjectsCache.value;
  }
  // The in-flight promise is cached, not just the result, so concurrent
  // requests for a cold cache share a single fetch.
  const value = fetchAPIData("/defs/projects", { all: true }).catch((err) => {
    // A failed fetch shouldn't be remembered for the whole TTL.
    if (allProjectsCache?.value === value) allProjectsCache = null;
    throw err;
  });
  allProjectsCache = { fetchedAt: now, value };
  return value;
}

const projectCache = new Map<number, any>();

export async function fetchProjectData(project: string | number) {
  const project_id = typeof project === "string" ? parseInt(project) : project;
  if (projectCache.has(project_id)) {
    return projectCache.get(project_id);
  }
  const urlBase = apiV2Prefix + "/defs/projects";
  const url = `${urlBase}?project_id=${project_id}`;
  const res = await getAndUnwrap(url);
  const data = res?.[0] ?? null;
  if (data != null) {
    projectCache.set(project_id, data);
  }
  return data;
}

export async function getAndUnwrap<T>(url: string): Promise<T> {
  const res = await fetchWrapper(url);
  const res1 = await res.json();
  return res1.success?.data ?? null;
}
