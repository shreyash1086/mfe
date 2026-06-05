const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  entry: "./src/index.js",
  mode: "development",
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
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "sharedDesignSystem",
      filename: "remoteEntry.js",
      exposes: {
        "./tokens": "./src/tokens/index.js",
        "./styles": "./src/styles/global.css",
        "./ThemeContext": "./src/contexts/ThemeContext.jsx",
        "./Button": "./src/components/Button.jsx",
        "./Card": "./src/components/Card.jsx",
        "./Badge": "./src/components/Badge.jsx",
        "./Loader": "./src/components/Loader.jsx",
        "./PageHeader": "./src/components/PageHeader.jsx",
        "./EmptyState": "./src/components/EmptyState.jsx",
        "./Toast": "./src/components/Toast.jsx",
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
    port: 3010,
    historyApiFallback: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
};
