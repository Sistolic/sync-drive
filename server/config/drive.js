const dotenv = require("dotenv").config();
const { google } = require("googleapis");

const db = require("./database");

exports.testConnection = async (credentials) => {
  if (!credentials) return false;

  try {
    const auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      process.env.REDIRECT_URL
    );
    auth.setCredentials({ refresh_token: credentials.refreshToken });

    const drive = google.drive({
      version: "v3",
      auth: auth,
    });

    const requestParams = {
      q: `mimeType='application/vnd.google-apps.folder' and 'me' in owners`,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      orderBy: "name",
    };

    var response = await drive.files.list(requestParams);
    return response.data.files ? true : false;
  } catch (error) {
    return false;
  }
};

const activeConnections = new Map();

exports.getDrive = async (sessionId) => {
  if (activeConnections.has(sessionId)) {
    return activeConnections.get(sessionId);
  }

  const credentials = await db.getCredentials(sessionId);
  if (!credentials) {
    return;
  }

  // TODO refresh token with custom scopes
  const auth = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    process.env.REDIRECT_URL || credentials.redirectUrl
  );
  auth.setCredentials({ refresh_token: credentials.refreshToken });

  const drive = google.drive({
    version: "v3",
    auth: auth,
  });

  const connection = { auth, drive };
  activeConnections.set(sessionId, connection);

  return connection;
};
