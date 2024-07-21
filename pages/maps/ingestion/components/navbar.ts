import {
  Icon,
  IconSize,
  Navbar,
  AnchorButton,
  Tooltip,
  Card,
} from "@blueprintjs/core";

import { ingestPrefix } from "@macrostrat-web/settings";

import hyper from "@macrostrat/hyper";
import styles from "./empty.module.sass";
const h = hyper.styled(styles);

const IngestNavbar = ({ user }) => {
  return h(Navbar, {}, [
    h(Navbar.Group, { align: "left" }, [h(Navbar.Heading, "Map Ingestion")]),
    h(Navbar.Group, { align: "right" }, [h(LoginButton, { user })]),
  ]);
};

export function LoginButton({ user }) {
  return h(
    Tooltip,
    { content: user == undefined ? "Log In" : "Logged In" },
    h(AnchorButton, {
      icon: user == undefined ? "blocked-person" : "user",
      intent: user == undefined ? "primary" : "success",
      large: true,
      onClick() {
        // Assemble the return URL on click based on the current page
        const return_url = window.location.origin + window.location.pathname;
        const url = `${ingestPrefix}/security/login`;
        console.log(url, return_url);
        window.location.href = `${url}?return_url=${return_url}`;
      },
    })
  );
}

export default IngestNavbar;
