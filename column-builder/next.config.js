/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { esmExternals: true },
};

const withTM = require("next-transpile-modules")([
  "@macrostrat/hyper",
  "@macrostrat/ui-components",
]); // pass the modules you would like to see transpiled

module.exports = withTM(nextConfig);
