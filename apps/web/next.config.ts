const path = require("path");

module.exports = {
  reactStrictMode: true,
  transpilePackages: ["@turbobun/db"],
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  },
};
