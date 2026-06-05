import("./App").then(({ default: App }) => {
  import("react-dom/client").then(({ createRoot }) => {
    const root = createRoot(document.getElementById("root"));
    root.render(<App />);
  });
});
