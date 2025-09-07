const dotenv = require("dotenv").config();
const crypto = require("crypto");

const algorithm = "aes-256-cbc";

var key = process.env.ENCRYPTION_KEY;
key = key.toString("hex");

const IV_LENGTH = 16;

function encrypt(text, iv) {
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
      algorithm,
      Buffer.from(key, "hex"),
      iv
    );

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.log("Decryption error:", error);
  }
}

exports.encryptCredentials = (credentials) => {
  const iv = crypto.randomBytes(IV_LENGTH);

  return {
    clientId: encrypt(credentials.clientId, iv),
    clientSecret: encrypt(credentials.clientSecret, iv),
    refreshToken: encrypt(credentials.refreshToken, iv),
    iv: iv.toString("hex"),
    redirectUrl: credentials.redirectUrl,
  };
};
exports.decryptCredentials = (data) => {
  return {
    clientId: decrypt(data.clientId, data.iv),
    clientSecret: decrypt(data.clientSecret, data.iv),
    refreshToken: decrypt(data.refreshToken, data.iv),
    redirectUrl: data.redirectUrl,
  };
};
