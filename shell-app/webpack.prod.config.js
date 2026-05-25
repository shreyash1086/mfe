/**
 * webpack.prod.config.js
 *
 * Production build config for the Shell.
 * Key difference from webpack.config.js (dev):
 *   - Remotes use Docker service names (http://auth, http://dashboard, http://profile)
 *     instead of localhost ports — containers talk to each other by name on micro-net
 *
 * Usage:
 *   webpack --config webpack.prod.config.js --mode production
 */

const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.[contenthash].js",
    publicPath: "auto",
    clean: true,
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      // Use runtime remote resolution instead of build-time URLs
      remotes: {},
      // Relax strict version checks at build time so remotes with minor patch versions
      // can still initialize during development. For production, pin exact versions
      // or enable strictVersion after coordinating releases.
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
        "react-router-dom": { singleton: true },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
};
