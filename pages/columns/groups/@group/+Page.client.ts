import { usePageContext } from "vike-react/usePageContext";
import { IndividualPage } from "../../../../src/components/lex/index";

export function Page() {
  const pageContext = usePageContext();
  const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
  return IndividualPage(id, "col_group_id", "groups");
}
