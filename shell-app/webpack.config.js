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
    extensions: [".js", ".jsx", ".mjs"],
    fullySpecified: false,
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
      // We rely on runtime remote loading (shell reads window.__RUNTIME_REMOTE_CONFIG__)
      // but sharedDesignSystem is imported statically at build-time.
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
      // Relax strict version checks at build time so remotes with minor patch versions
      // can still initialize during development. For production, pin exact versions
      // or enable strictVersion after coordinating releases.
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
  devServer: {
    port: 3000,
    historyApiFallback: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    proxy: {
      '/new-content-api': {
        target: 'https://bd524zjmrldzimglbmmgzkkenq0oxobj.lambda-url.eu-central-1.on.aws',
        changeOrigin: true,
        pathRewrite: { '^/new-content-api': '' },
        secure: false,
        onProxyRes: function (proxyRes, req, res) {
          delete proxyRes.headers['access-control-allow-origin'];
          delete proxyRes.headers['Access-Control-Allow-Origin'];
        }
      },
      '/content-category-api': {
        target: 'https://pnb45plzoveg6irps5rk24elhu0vvagj.lambda-url.eu-central-1.on.aws',
        changeOrigin: true,
        pathRewrite: { '^/content-category-api': '' },
        secure: false,
        onProxyRes: function (proxyRes, req, res) {
          delete proxyRes.headers['access-control-allow-origin'];
          delete proxyRes.headers['Access-Control-Allow-Origin'];
        }
      }
    },
  },
};
