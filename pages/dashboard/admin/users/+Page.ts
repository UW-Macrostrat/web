import hyper from "@macrostrat/hyper";
import { HotkeysProvider } from "@blueprintjs/core";
import { AdminOnly } from "../admin-only";
import { UsersHelp, UsersSheet } from "../users-sheet";
import styles from "../main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  return h("div.admin-page", [
    h(AdminOnly, { what: "manage users" }, [
      h(UsersHelp),
      h(HotkeysProvider, h(UsersSheet)),
    ]),
  ]);
}
