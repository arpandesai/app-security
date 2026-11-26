const express = require("express");
const cors = require("cors");
const users = require("./routes/users");
const files = require("./routes/files");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/users", users);
app.use("/files", files);

app.get("/preview", async (req, res) => {
  const page = await require("axios").get(req.query.url);
  res.send(page.data);
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(process.env.PORT || 4000);
