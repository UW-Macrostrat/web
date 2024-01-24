import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function ContentPage({ children, className }) {
  return h("div.content-page", { className }, children);
}

export function CenteredContentPage({ children }) {
  return h(ContentPage, { className: "centered" }, children);
}
