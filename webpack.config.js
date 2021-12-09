const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const pages = ["basic", "player", "embed", "embed-responsive", "audio-only", "custom-player", "cast-standalone"];

module.exports = {
  entry: pages.reduce(
    (acc, page) => ({
      ...acc,
      [page]: `./${page}/index.js`,
    }),
    {}
  ),
  output: {
    path: path.resolve(__dirname, "build"),
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
  ],
};
