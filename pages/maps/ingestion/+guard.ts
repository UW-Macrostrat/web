import { redirect, render } from "vike/abort";

export default function guard(pageContext: any) {
  const path = pageContext?.urlParsed?.pathname ?? pageContext?.urlPathname;
  if (!path?.startsWith("/maps/ingestion/add")) return; // only gate /add

  const user = pageContext?.user;
  const roles: string[] = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
    ? [user.role]
    : [];

  // pick the correct admin role names for your app:
  const allowed =
    roles.includes("ingestion_admin") ||
    roles.includes("admin") ||
    roles.includes("web_admin"); // keep/remove as needed

  if (!allowed) {
    throw render(403, "Only admins are allowed to access this page.");
    // or: throw redirect(`/security/login?return_url=${path}`);
  }
}

// if (user === undefined) {
//   // Render the login page while preserving the URL. (This is novel technique
//   // which we explain down below.)
//   // throw redirect(
//   //   `${ingestPrefix}/security/login?return_url=${pageContext.urlParsed.pathname}`
//   // );
//   /* The more traditional way, redirect the user:
//   throw redirect('/login')
//   */
//   return;
// }
// if (!user.groups.includes(1)) {
//   // Render the error page and show message to the user
//   throw render(403, "Only admins are allowed to access this page.");
// }
