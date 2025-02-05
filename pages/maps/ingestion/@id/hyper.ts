import hyper from "@macrostrat/hyper";

// Duplicative style imports
import "~/styles/blueprint-select";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import "@blueprintjs/table/lib/css/table.css";
import "./override.sass";

import styles from "./tables/edit-table.module.sass";

const h = hyper.styled(styles);

export default h;
