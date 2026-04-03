import h from "@macrostrat/hyper";
import { EditSourceForm } from "../source-form";
import { usePageProps } from "~/renderer/usePageProps";

interface EditInterfaceMetaProps {
  source_id?: number;
  source?: any;
}

export function Page() {
  const { source_id, source, ingestProcess }: EditInterfaceMetaProps =
    usePageProps();
  return h([h(EditSourceForm, { sourceId: source_id })]);
}
