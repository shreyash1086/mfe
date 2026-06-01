const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
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
      name: "dashboard", // Unique name for this module
      filename: "remoteEntry.js", // Entry file exposed to shell
      exposes: {
        "./DashboardApp": "./src/App", // What we expose to the outside world
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
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
  devServer: {
    host: "0.0.0.0",
    port: 3002,
    historyApiFallback: true,
    // headers: {
    //   "Access-Control-Allow-Origin": "*",
    // },
  },
};
