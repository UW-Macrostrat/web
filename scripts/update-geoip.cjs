#!/usr/bin/env node

const dotenv = require("dotenv");
dotenv.config();

// Find the root of the geoip package
const pkgPath = require.resolve("geoip-lite").replace(/\/lib\/geoip.js$/, "");

// Run the update script with the license key specified

process.env.LICENSE_KEY = process.env.GEOIP_LICENSE_KEY;
require(`${pkgPath}/scripts/updatedb.js`);
