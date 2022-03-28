export const SETTINGS = {
  baseMapURL:
    "mapbox://styles/jczaplewski/cl1b1pf4m000f14p4cqowlto0?optimize=true",
  satelliteMapURL:
    "mapbox://styles/jczaplewski/cj3bpe4xk00002rqndidf9dw4?optimize=true",
  // TODO: make these configurable with environment variables
  // burwellTileDomain:
  //   window.location.hostname === "localhost"
  //     ? "https://tiles.macrostrat.org"
  //     : window.location.hostname === "dev.macrostrat.org"
  //     ? "https://devtiles.macrostrat.org"
  //     : "https://tiles.macrostrat.org",
  // apiDomain:
  //   window.location.hostname === "localhost"
  //     ? "https://dev.macrostrat.org"
  //     : `https://${window.location.hostname}`,
  burwellTileDomain: "https://devtiles.macrostrat.org",
  apiDomain: "https://dev.macrostrat.org",
  gddDomain: "https://geodeepdive.org",
  pbdbDomain: "https://paleobiodb.org",
  mapboxAccessToken:
    "pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiWnQxSC01USJ9.oleZzfREJUKAK1TMeCD0bg",
};
