import h from "@macrostrat/hyper";
import { Header } from "../components";
import { EditSourceForm } from "../source-form";
import { ContentPage } from "~/layouts";
import { usePageProps } from "~/renderer/usePageProps";

interface EditInterfaceMetaProps {
  source_id?: number;
  source?: any;
}

export function Page() {
  const { source_id, source, ingestProcess }: EditInterfaceMetaProps =
    usePageProps();
  return h(ContentPage, { centered: true }, [
    h("div", {}, [
      h(Header, {
        title: source.name,
        sourceURL: source.url,
        ingestProcess,
      }),
      h(EditSourceForm, { sourceId: source_id }),
    ]),
  ]);
}
