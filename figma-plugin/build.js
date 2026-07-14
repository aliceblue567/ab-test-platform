const esbuild = require("esbuild");
const fs = require("fs");

const defaultApiKey = process.env.UXW_DEFAULT_API_KEY || "";

esbuild.buildSync({
  entryPoints: ["src/code.ts"],
  bundle: true,
  outfile: "dist/code.js",
  target: "es2017",
  define: {
    __DEFAULT_API_KEY__: JSON.stringify(defaultApiKey),
  },
});

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("src/ui.html", "dist/ui.html");

console.log(
  "Built dist/code.js" +
    (defaultApiKey
      ? " (API key baked in — do not commit or publicly share dist/)"
      : " (no default API key — each user must enter one)")
);
