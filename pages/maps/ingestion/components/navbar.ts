import { Navbar } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { UserPersona } from "~/components/auth";
import styles from "./empty.module.sass";
const h = hyper.styled(styles);

/** The map-ingestion header: the title and the standard persona control,
 * which reads the session itself (the `user` prop is accepted for the callers
 * that still pass it, and ignored). */
const IngestNavbar = ({ user: _user }: { user?: unknown } = {}) => {
  return h(Navbar, {}, [
    h(Navbar.Group, { align: "left" }, [h(Navbar.Heading, "Map Ingestion")]),
    h(Navbar.Group, { align: "right" }, [h(UserPersona, { large: true })]),
  ]);
};

export default IngestNavbar;
