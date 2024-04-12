import {
  Icon,
  IconSize,
  Navbar,
  AnchorButton,
  Tooltip,
  Card
} from "@blueprintjs/core";

import { ingestPrefix } from "@macrostrat-web/settings";

import hyper from "@macrostrat/hyper";
import styles from "./empty.module.sass";
const h = hyper.styled(styles);

const IngestNavbar = ({user}) => {
  return h(Navbar, {}, [
    h(Navbar.Group, { align: "left" }, [h(Navbar.Heading, "Map Ingestion")]),
    h(Navbar.Group, { align: "right" }, [
      h(
        Tooltip,
        { content: user == undefined ? "Log In" : "Logged In" },
        h(AnchorButton, {
          icon: user == undefined ? "log-in" : "user",
          style: {
            margin: "0 0.5em",
            borderRadius: "50%",
            backgroundColor: user == undefined ? "#fdeb88" : "#90d090",
          },
          onClick() {
            // Assemble the return URL on click based on the current page
            const return_url =
              window.location.origin + window.location.pathname;
            window.location.href = `${ingestPrefix}/security/login?return_url=${return_url}`;
          },
        })
      ),
    ]),
  ])
}

export default IngestNavbar;