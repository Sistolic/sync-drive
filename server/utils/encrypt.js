const dotenv = require("dotenv").config();
const crypto = require("crypto");

const algorithm = process.env.ALGORITHM;

var key = process.env.KEY;
key = key.toString("hex");

const IV_LENGTH = parseInt(process.env.IV_LENGTH);

function encrypt(text, iv) {
  console.log("Encryption key:", key);
  try {
    const cipher = crypto.createCipheriv(
      algorithm,
      Buffer.from(key, "hex"),
      iv
    );

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return encrypted;
  } catch (error) {
    console.log("Encryption error:", error);
  }
}
function decrypt(encryptedData, ivHex) {
  try {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(key, "hex"),
      iv
    );

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.log("Encryption error:", error);
  }
}

exports.encryptCredentials = (credentials) => {
  const iv = crypto.randomBytes(IV_LENGTH);

  return {
    clientId: encrypt(credentials.clientId, iv),
    clientSecret: encrypt(credentials.clientSecret, iv),
    refreshToken: encrypt(credentials.refreshToken, iv),
    iv: iv.toString("hex"),
  };
};
exports.decryptCredentials = (data) => {
  return {
    clientId: decrypt(data.client_id, data.iv),
    clientSecret: decrypt(data.client_secret, data.iv),
    refreshToken: decrypt(data.refresh_token, data.iv),
  };
};
