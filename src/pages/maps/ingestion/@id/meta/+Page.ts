import hyper from "@macrostrat/hyper";
import { Header } from "../components";
import styles from "../edit-page.module.sass";
import { EditSourceForm } from "../source-form";
import { ContentPage } from "~/layouts";

const h = hyper.styled(styles);

interface EditInterfaceMetaProps {
  source_id?: number;
  source?: any;
}

export function Page({ source_id, source }: EditInterfaceMetaProps) {
  return h(ContentPage, { centered: true }, [
    h("div", {}, [
      h(Header, {
        title: source.name,
        sourceURL: source.url,
      }),
      h(EditSourceForm, { sourceId: source_id }),
    ]),
  ]);
}
