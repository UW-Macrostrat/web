function title(pageContext) {
  const { col_name } = pageContext.pageProps.columnInfo;
  return col_name;
}

export { title };
