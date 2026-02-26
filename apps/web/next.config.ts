const path = require("path");

module.exports = {
  reactStrictMode: true,
  transpilePackages: ["@turbobun/eden"],
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  },
};
