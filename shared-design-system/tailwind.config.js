const tokens = require("./src/tokens/index.js");

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: tokens.fontFamily,
      borderRadius: tokens.borderRadius,
      spacing: tokens.spacing,
      animation: tokens.animation,
    },
  },
  plugins: [],
};
