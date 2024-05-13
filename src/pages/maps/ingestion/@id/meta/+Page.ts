import h from "@macrostrat/hyper";
import { Header } from "../components";
import { EditSourceForm } from "../source-form";
import { ContentPage } from "~/layouts";

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
