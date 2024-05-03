/** Quickly create xml templates for Macrostrat.
 *
 * It might be better to create this on the Python side, but this is a quick way to do it
 * for now.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = dirname(__filename);

const template = readFileSync(
  join(__dirname, "macrostrat.qlr.template"),
  "utf8"
);

// Create an API endpoint that serves the XML templates
/* We do this here instead of, say, in the tileserver
   because we want to adjust the files based on the
   tileserver URL of the instance. We might adjust this eventually */
const validLayers = ["carto", "carto-slim"];

export function createMacrostratQlrAPI(
  app,
  base,
  tileserverURL,
  macrostratInstance = "dev"
) {
  app.get(base + "/macrostrat-:layerName.qlr", (req, res) => {
    const layerName = req.params.layerName;
    if (!validLayers.includes(layerName)) {
      res.status(404).send("Invalid layer");
      return;
    }
    const qlrXML = createMacrostratQlrXML(
      macrostratInstance,
      tileserverURL,
      layerName
    );
    res.setHeader("Content-Type", "application/xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="macrostrat-${layerName}.qlr"`
    );
    res.send(qlrXML);
  });

  app.get(base, (req, res) => {
    res.send(
      validLayers.map((layer) => {
        return {
          name: layer,
          url: base + `/macrostrat-${layer}.qlr`,
        };
      })
    );
  });
}

const spatialRefSys = readFileSync(join(__dirname, "spatialref.xml"), "utf8");

export function createMacrostratQlrXML(
  macrostratInstance,
  tileserverURL,
  layerName,
  tileLayerURL = null
) {
  const layerURL = tileLayerURL || `${tileserverURL}/${layerName}`;
  const variables = {
    INSTANCE: macrostratInstance,
    TILE_LAYER_URL: layerURL,
    LAYER_NAME: layerName,
    SPATIAL_REF_SYS: spatialRefSys,
  };

  let res = template;

  for (const [key, value] of Object.entries(variables)) {
    // Replace all instances of the key with the value
    res = res.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return res;
}
