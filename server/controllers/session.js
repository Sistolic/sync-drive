const db = require("../config/database");

exports.check = async (req, res) => {
  const sessionId = req.cookies["session"];

  if (!sessionId) return res.status(400).send();

  const validate = await db.validateSession(sessionId);
  return res.status(validate ? 200 : 400).send();
};
