const tokens = require("../shared-design-system/src/tokens");

module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../module-dashboard/src/**/*.{js,jsx,ts,tsx}",
    "../module-virtual-machine/src/**/*.{js,jsx,ts,tsx}",
    "../module-cloud-console/src/**/*.{js,jsx,ts,tsx}",
    "../module-cloud-labs/src/**/*.{js,jsx,ts,tsx}",
    "../module-assessment/src/**/*.{js,jsx,ts,tsx}",
    "../module-content-uploading/src/**/*.{js,jsx,ts,tsx}",
    "../module-code-environment/src/**/*.{js,jsx,ts,tsx}",
    "../module-code-module/src/**/*.{js,jsx,ts,tsx}",
    "../module-logging/src/**/*.{js,jsx,ts,tsx}",
    "../shared-design-system/src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...tokens.colors,
        shell: {
          bg: '#08080d',
          sidebar: '#0e0e16',
          border: 'rgba(255, 255, 255, 0.07)',
          accent: '#6c63ff',
          text: '#eeeef5',
          muted: 'rgba(255, 255, 255, 0.35)',
        },
      },
      fontFamily: tokens.fontFamily,
      borderRadius: tokens.borderRadius,
      spacing: tokens.spacing,
      animation: tokens.animation,
    }
  },
  plugins: [],
};

