const prodOrDev = process.env.ENV;

const dev_api_base = process.env.API_BASE_DEV;
const prod_api_base = process.env.API_BASE_PROD;

let base = dev_api_base;
if (prodOrDev != "development") {
  base = prod_api_base;
}

export { base };
