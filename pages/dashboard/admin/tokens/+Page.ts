import hyper from "@macrostrat/hyper";
import { HotkeysProvider } from "@blueprintjs/core";
import { AdminOnly } from "../admin-only";
import { TokensHelp, TokensSheet } from "../tokens-sheet";
import styles from "../main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  return h("div.admin-page", [
    h(AdminOnly, { what: "manage tokens" }, [
      h(TokensHelp),
      h(HotkeysProvider, h(TokensSheet)),
    ]),
  ]);
}
