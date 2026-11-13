const path = require("node:path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "..", "public");

app.disable("x-powered-by");
app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`ROOTINE is growing at http://localhost:${port}`);
  });
}

module.exports = app;
