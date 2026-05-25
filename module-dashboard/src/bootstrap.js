// bootstrap.js is needed for Module Federation
// Webpack needs this async boundary to share modules correctly
import("./App").then(({ default: App }) => {
  import("react-dom/client").then(({ createRoot }) => {
    const root = createRoot(document.getElementById("root"));
    root.render(<App />);
  });
});
