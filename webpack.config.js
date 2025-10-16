const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const pages = [
  "basic",
  "player",
  "player-ima",
  "embed",
  "embed-responsive",
  "audio-only",
  "custom-player",
  "custom-player-core",
  "cast-standalone",
  "statistics-monitor",
  "webrtc-ingest-basic",
  "webrtc-ingest-sources",
  "webrtc-ingest-embed",
  "webrtc-ingest-screen-sharing",
];

const noBuildPages = [
  "vanilla-js-umd",
  "vanilla-js-player-esm",
];

module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  entry: pages.reduce(
    (acc, page) => ({
      ...acc,
      [page]: `./${page}/index.js`,
    }),
    {}
  ),
  output: {
    path: path.resolve(__dirname, "docs"),
    filename: "[name].[contenthash].bundle.js",
  },
  target: "web",
  plugins: [
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "index.html",
      chunks: [],
    }),
    ...pages.map(
      (page) =>
        new HtmlWebpackPlugin({
          filename: `${page}/index.html`,
          template: `${page}/index.html`,
          chunks: [page],
        })
    ),
    ...pages.map(
      (page) =>
        new CopyPlugin({
          patterns: [
            {
              from: `${page}/index.css`,
              to: `${page}/index.css`,
              noErrorOnMissing: true,
            },
          ],
        })
    ),
    ...noBuildPages.map(
      (page) =>
        new CopyPlugin({
          patterns: [
            {
              from: `${page}`,
              to: `${page}`,
              noErrorOnMissing: true,
            },
          ],
        })
    ),
  ],
};
