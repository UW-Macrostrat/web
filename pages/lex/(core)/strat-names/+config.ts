export default {
  pageInfo: { name: "Names" },
  // The hybrid content/map frame (`~/layouts/hybrid`): the list is the content.
  // Only the list mode is enabled for now (see `+Page.ts`), but the frame is
  // what supplies the standard header, the panel-as-scroller layout, the
  // content footer — and the `NavigationLinkProvider` that `pageStyle:
  // "fullscreen"` does not, without which every item on the page rendered as
  // unlinked text.
  pageStyle: "hybrid",
};
