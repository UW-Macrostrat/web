import dotenv from "dotenv";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";

dotenv.config();

// Find the root of the geoip package
const pkgPath = fileURLToPath(
  import.meta.resolve("geoip-lite").replace(/\/lib\/geoip.js$/, "")
);

// Run the update script with the license key specified

if (process.env.MAXMIND_GEOIP_LICENSE_KEY) {
  process.env.LICENSE_KEY = process.env.MAXMIND_GEOIP_LICENSE_KEY;
} else {
  throw new Error("MAXMIND_GEOIP_LICENSE_KEY is not set");
}

if (process.env.GEOIP_DATA_DIR) {
  process.env.GEODATADIR = process.env.GEOIP_DATA_DIR;
  mkdirSync(process.env.GEOIP_DATA_DIR, { recursive: true });
} else {
  throw new Error("GEOIP_DATA_DIR is not set");
}

/* If we're using Yarn PNP, we need to specify a temp directory
 because the package directory is read-only */
if (process.versions.pnp && !process.env.GEOTMPDIR) {
  process.env.GEOTMPDIR =
    "/tmp/geoip_" + Math.random().toString(36).substring(7);
}

import(`${pkgPath}/scripts/updatedb.js`);
