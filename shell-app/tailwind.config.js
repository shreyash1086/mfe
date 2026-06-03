module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        shell: {
          bg: '#08080d',
          sidebar: '#0e0e16',
          border: 'rgba(255, 255, 255, 0.07)',
          accent: '#6c63ff',
          text: '#eeeef5',
          muted: 'rgba(255, 255, 255, 0.35)',
        }
      }
    }
  },
  plugins: [],
};
