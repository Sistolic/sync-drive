const { google } = require("googleapis");
const encryption = require("../utils/encrypt");

const fs = require("fs");

class Drive {
  constructor() {
    this.drive = null;

    this.pathCredentials = "credentials.json";
    this.activeConnections = new Map();
  }

  async init(credentials) {
    // generate the redirect url
    const auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUrl
    );
    // TODO generate refresh token with custom scopes
    auth.setCredentials({ refresh_token: credentials.refreshToken });

    this.drive = google.drive({
      version: "v3",
      auth: auth,
    });
  }

  async testConnection(credentials) {
    if (!credentials) return false;
    if (!this.drive) this.init(credentials);

    try {
      const requestParams = {
        q: `mimeType='application/vnd.google-apps.folder' and 'me' in owners`,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        orderBy: "name",
      };

      var response = await this.drive.files.list(requestParams);
      return response.data.files ? true : false;
    } catch (error) {
      return false;
    }
  }

  saveCredentials = async (req, res) => {
    try {
      const { clientId, clientSecret, refreshToken } = req.body;
      const credentials = {
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        redirectUrl: "https://developers.google.com/oauthplayground",
      };

      if (!(await this.testConnection(credentials)))
        return res.status(404).send("Invalid credentials");

      const encryptedData = encryption.encryptCredentials(credentials);

      if (!encryptedData) {
        return res.status(404).send("Failed to encrypt credentials");
      }

      // save encrypted credentials
      fs.writeFileSync(
        this.pathCredentials,
        JSON.stringify(encryptedData, null, 2),
        "utf8"
      );

      res.status(200).send("Credentials saved in file");
    } catch (error) {
      res.status(501).json({ error: error.message });
    }
  };
  async getCredentials() {
    if (!fs.existsSync(this.pathCredentials)) return undefined;
    const credentials = JSON.parse(fs.readFileSync(this.pathCredentials));

    return credentials.length !== 0
      ? encryption.decryptCredentials(credentials)
      : undefined;
  }

  getDrive = async () => {
    const credentials = await this.getCredentials();
    if (!credentials) return credentials;
    if (!this.drive) this.init(credentials);

    return this.drive;
  };
}

module.exports = new Drive();
