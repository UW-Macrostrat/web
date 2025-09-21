import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";
import { fetchAPIData } from "~/_utils";
import { navigate } from "vike/client/router";

export function Page() {
    const unit_id = usePageContext()?.urlPathname.split("/")?.[3] || [];

    fetchAPIData("/units", { unit_id })
        .then(data => navigate(`/columns/${data[0].col_id}#unit=${unit_id}`))

    return null
}
