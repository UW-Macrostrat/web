import { redirect } from "vike/abort";

export function Page() {
  // Redirect to the root of strat names; we don't have a separate concepts search yet.
  throw redirect("/lex/strat-names");
}
