import { fetchAllProjects } from "~/_utils";

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const projects = await fetchAllProjects();

  return {
    projects,
  };
}
