const mysql = require("mysql2/promise");
const dotenv = require("dotenv").config();

const drive = require("./drive");
const encryption = require("../utils/encrypt");
const uuidv4 = require("uuid").v4;

class Database {
  constructor() {
    this.config = {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
      port: process.env.MYSQL_PORT,
      ssl: { rejectUnauthorized: false },
    };

    this.pool = null;
  }

  async init() {
    this.pool = mysql.createPool(this.config);
  }

  async validateSession(sessionId) {
    if (!this.pool) await this.init();

    const [rows] = await this.pool.query(
      `
    SELECT * FROM user_credentials
      WHERE session_id=?
    `,
      [sessionId]
    );

    console.log("Session id found:", rows);
    return rows.length !== 0;
  }

  saveCredentials = async (req, res) => {
    if (!this.pool) await this.init();

    try {
      const { clientId, clientSecret, refreshToken } = req.body;
      const credentials = {
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
      };

      if (!(await drive.testConnection(credentials)))
        res.status(404).send("Invalid credentials");

      const sessionId = uuidv4();
      const encryptedData = encryption.encryptCredentials(credentials);

      if (!encryptedData) {
        return res.status(404).send("Failed to encrypt credentials");
      }

      const result = await this.pool.query(
        `
      INSERT INTO user_credentials (client_id, client_secret, refresh_token, iv, session_id)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          encryptedData.clientId,
          encryptedData.clientSecret,
          encryptedData.refreshToken,
          encryptedData.iv,
          sessionId,
        ]
      );

      // the cookie will expire and the store credentials will be removed
      res.cookie("session", sessionId, {
        expires: new Date(Date.now() + 21600 * 1000),
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });

      res.status(200).send("You can now see your Drive files");
    } catch (error) {
      res.status(501).json({ error: error.message });
    }
  };
  async getCredentials(sessionId) {
    if (!this.pool) await this.init();

    const [rows] = await this.pool.query(
      `
    SELECT client_id, client_secret, refresh_token, iv
      FROM user_credentials WHERE session_id=?
    `,
      [sessionId]
    );

    return rows[0].length !== 0
      ? encryption.decryptCredentials(rows[0])
      : undefined;
  }
  deleteCredentials = async (req, res) => {
    if (!this.pool) await this.init();
    const sessionId = req.cookies["sessionId"];

    const result = await this.pool.query(
      `
      DELETE FROM user_credentials
        WHERE session_id=?
      `,
      [sessionId]
    );

    res.status(200).send("Session removed");
  };
  // update the session if the user is still active
  updateCredentials = async (req, res) => {
    if (!this.pool) await this.init();

    const oldSession = req.cookies["sessionId"];
    const newSession = uuidv4();

    const result = await this.pool.query(
      `
      UPDATE user_credentials
        SET sessionId=?
        WHERE session_id=?
      `,
      [newSession, oldSession]
    );

    if (result[0].affectedRows.length === 0) return res.status(404).send();

    res.status(200).send("Session updated");
  };
}

module.exports = new Database();
