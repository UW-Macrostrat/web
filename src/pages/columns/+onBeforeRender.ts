import { getGroupedColumns } from "../projects/@project/+onBeforeRender";

export async function onBeforeRender(pageContext) {
  const columnGroups = await getGroupedColumns(1);
  return {
    pageContext: {
      pageProps: { columnGroups },
    },
  };
}
