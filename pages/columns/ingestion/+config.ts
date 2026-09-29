// Column ingestion is a client-only admin form (uploads + polls api-v3), so it
// opts out of SSR and uses the plain content layout rather than the `/columns`
// hybrid map style.
export default {
  title: "Column ingestion",
  ssr: false,
  pageStyle: "content",
};
