/**
 * webpack.prod.config.js
      {
        test: \/\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
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
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        sharedDesignSystem: `promise new Promise((resolve) => {
          const name = "sharedDesignSystem";
          if (window[name]) return resolve(window[name]);
          const url = (window.__RUNTIME_REMOTE_CONFIG__ && window.__RUNTIME_REMOTE_CONFIG__.design_system) 
                      || "http://localhost:3010/remoteEntry.js";
          const script = document.createElement("script");
          script.src = url;
          script.async = true;
          script.onload = () => resolve(window[name]);
          script.onerror = () => resolve();
          document.head.appendChild(script);
        })`,
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
        "react-router": { singleton: true },
        "react-router-dom": { singleton: true },
        "styled-components": { singleton: true },
        "shared-design-system": { singleton: true },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
};
