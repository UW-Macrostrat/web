import { render } from "vike/abort";
import type { PageContext } from "vike/types";

export async function guard(pageContext: PageContext) {
  const { user } = pageContext;
  let userString = "You're not even logged in anyway.";
  let code: 401 | 403 = 401;
  if (user != null) {
    const userName = user.name ?? "Anonymous";
    userString = `Not even you, ${userName}`;
    code = 403;
  }

  throw render(code, `Nobody is allowed to access this page. ` + userString);
}
