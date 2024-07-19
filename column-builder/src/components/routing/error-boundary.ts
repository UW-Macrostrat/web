import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { Intent, Dialog, Callout, Divider } from "@blueprintjs/core";

import styles from "../comp.module.scss";
import { PostgrestError } from "@supabase/postgrest-js";
const h = hyperStyled(styles);


function ErrorDialog(props: { errors: PostgrestError[] }) {
  return h(Dialog, { isOpen: true, style: { paddingBottom: "0" } }, [
    h(
      Callout,
      { intent: Intent.DANGER, title: "Error has occured", icon: "error" },
      [
        props.errors.map((error, i) => {
          return h(React.Fragment, [
            h.if(error.message != null)("p", { key: i }, [
              "Message: ",
              error.message,
            ]),
            h.if(error.hint != null)("p", { key: i }, ["Hint: ", error.hint]),
            h(Divider),
          ]);
        }),
      ]
    ),
  ]);
}

export { ErrorDialog };
