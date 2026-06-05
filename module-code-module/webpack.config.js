const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const webpack = require("webpack");
const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: "auto",
  },
  resolve: {
    extensions: [".js", ".jsx"],
    fallback: {
      fs: false,
    },
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
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "code_module",
      filename: "remoteEntry.js",
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
      exposes: {
        "./CodeModuleApp": "./src/App",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: "^18.2.0",
        },
        "react-dom": {
          singleton: true,
          requiredVersion: "^18.2.0",
        },
        "react-router": {
          singleton: true,
        },
        "react-router-dom": {
          singleton: true,
        },
        "styled-components": {
          singleton: true,
        },
        "shared-design-system": {
          singleton: true,
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
  devServer: {
    port: 3007,
    historyApiFallback: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
};
