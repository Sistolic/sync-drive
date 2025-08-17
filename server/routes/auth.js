const express = require("express");
const db = require("../config/database");
const session = require("../controllers/session");

const router = express.Router();

const middle = express.urlencoded({
  extended: false,
  limit: 10000,
  parameterLimit: 3,
});

router.get("/session", session.check);
router.post("/save", middle, db.saveCredentials);

router.post("/log-out", db.deleteCredentials);
router.put("/update", db.updateCredentials);

module.exports = router;
