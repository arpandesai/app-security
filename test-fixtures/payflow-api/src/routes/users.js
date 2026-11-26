const router = require("express").Router();
const db = require("../db");
const auth = require("../auth");

router.post("/login", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM users WHERE email = '" + req.body.email + "'");
  res.json(rows[0]);
});

router.get("/:id", auth, async (req, res) => {
  const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
  res.json(rows[0]);
});

router.patch("/:id", auth, async (req, res) => {
  const user = await db.users.update(req.params.id, req.body);
  res.json(user);
});

module.exports = router;
