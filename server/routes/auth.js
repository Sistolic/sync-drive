const drive = require("../config/drive");
const { existsSync } = require("fs");

const express = require("express");
const router = express.Router();

const middle = express.urlencoded({
  extended: false,
  limit: 10000,
  parameterLimit: 3,
});

router.post("/save", middle, drive.saveCredentials);
router.get("/check", (req, res) => {
  return res.send(existsSync("credentials.json"));
});

module.exports = router;
