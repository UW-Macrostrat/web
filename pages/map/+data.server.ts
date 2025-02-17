import type { PageContextServer } from "vike/types";

export async function data(pageContext: PageContextServer) {
  console.log("Data function called");
  console.log(pageContext.clientIPAddress);
  return {};
}
