const router = require("express").Router();
const multer = require("multer");

const upload = multer({ dest: "public/uploads" });

router.post("/", upload.single("file"), (req, res) => res.json({ path: req.file.path }));

module.exports = router;
