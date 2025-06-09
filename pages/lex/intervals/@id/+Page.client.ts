import { usePageContext } from "vike-react/usePageContext";
import { IndividualPage } from "~/components/lex";

export function Page() {
  const pageContext = usePageContext();
  const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
  return IndividualPage(id, "int_id", "intervals");
}
