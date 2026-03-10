import h from "@macrostrat/hyper";

export function GoogleFonts() {
  /** Function to put Google Fonts in the head of the document. */
  const fonts: string[] = [
    "Geologica:wght,CRSV@100..900,0",
    "Crimson+Pro:ital,wght@0,200..900;1,200..900",
    "Maven+Pro:wght@400..900",
    "Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000",
    "PT+Serif:ital,wght@0,400;0,700;1,400;1,700",
    //"Spectral:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,200;1,300;1,400;1,500;1,600;1,700;1,800",
    "Domine:wght@400..700",
  ];

  const fontStr = fonts.join("&family=");
  const href = `https://fonts.googleapis.com/css2?family=${fontStr}&display=swap`;

  return h([
    h("link", {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    }),
    h("link", {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "true",
    }),
    h("link", {
      href,
      rel: "stylesheet",
    }),
  ]);
}
