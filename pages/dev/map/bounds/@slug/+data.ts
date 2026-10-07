/** The map's boundary and the operation types, read on the server.
 *
 * Both reads are public; only writes need the admin session. A failure leaves
 * the page on its empty state rather than a 500. */
import type { PageContextServer } from "vike/types";
import { fetchBoundary, fetchOperationTypes, type MapBoundary, type OperationType } from "./api";

export async function data(pageContext: PageContextServer) {
  const { slug } = pageContext.routeParams;
  const [boundary, operationTypes] = await Promise.all([
    orNull(fetchBoundary(slug)),
    orNull(fetchOperationTypes()),
  ]);
  return {
    boundary: boundary as MapBoundary | null,
    operationTypes: (operationTypes ?? []) as OperationType[],
  };
}

async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error("Could not load the map boundary:", error);
    return null;
  }
}
