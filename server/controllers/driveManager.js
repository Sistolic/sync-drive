const { getDrive } = require("../config/drive");
const archiver = require("archiver");

class DriveManager {
  constructor() {
    this.drive = null;

    this.downloadLimit = 15;
  }
  async init(data) {
    this.drive = await getDrive();
    if (!this.drive) return false; // invalid credentials

    this.targetId = data.folderId;
    this.initialChangeToken = data.changeToken;
    this.nextChangeToken = data.changeToken;

    return true;
  }

  getFolders = async (req, res) => {
    if (!(await this.init(req.query)))
      return res.status(404).send("Invalid credentials");

    var defaultFolders = JSON.parse(decodeURIComponent(req.query.folders));
    try {
      var info = [];
      for (const folder of defaultFolders) {
        var query = `mimeType='application/vnd.google-apps.folder' and 'me' in owners and name contains '${folder}' and trashed=false`;
        const requestParams = {
          q: query,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          orderBy: "name",
        };

        var response = await this.drive.files.list(requestParams);
        response.data.files = response.data.files.filter((f) =>
          f.name.includes(folder)
        );

        const data = response.data.files.map((folder) => ({
          id: folder.id,
          name: folder.name,
        }));

        info.push(...data);
      }

      res.status(200).json(info);
    } catch (error) {
      res.status(501).json({ error: error.message });
    }
  };
  getFilesFrom = async (req, res) => {
    if (!(await this.init(req.query)))
      return res.status(404).send("Authorization required");

    try {
      var { folderId } = req.query;

      const response = await this.getFiles(folderId);

      const files = response.data.files.map((file) => ({
        id: file.id,
        name: file.name,
        isPreviewable: file.mimeType !== "application/vnd.google-apps.folder",
      }));

      res.status(200).json(files);
    } catch (error) {
      res.status(501).json({ error: error.message });
    }
  };
  async getFiles(folderId) {
    return await this.drive.files.list({
      q: `trashed=false and '${folderId}' in parents`,
      fields: "files(id, name, mimeType)",
      orderBy: "folder",
    });
  }

  download = async (req, res) => {
    if (!(await this.init(req.query)))
      return res.status(404).send("Authorization required");

    try {
      var { fileId } = req.query;

      const fileMetadata = await this.drive.files.get({
        fileId: fileId,
        fields: "id, name, mimeType",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (fileMetadata.data.mimeType !== "application/vnd.google-apps.folder") {
        const fileStream = await this.singleFileStream(fileId);

        res.setHeader("Content-Type", "application/octet-stream");
        fileStream.data.pipe(res);

        return res.status(200);
      }

      // call the changes method (if folder) for sync later
      var pageToken = await this.drive.changes.getStartPageToken();
      pageToken = pageToken.data.startPageToken;

      res.setHeader("Change-Token", pageToken);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=folder.zip");

      // Intialize the .zip archive
      const archive = archiver("zip");
      archive.pipe(res);

      await this.downloadDir(fileId, archive);
      archive.finalize();

      res.status(200);
    } catch (error) {
      res.status(501).json({ error: error.message });
    }
  };
  async downloadDir(folderId, zipFile, path = "") {
    // TODO efficient downloads

    const response = await this.getFiles(folderId);
    var files = response.data.files;

    // download only 15 files
    if (files.length >= 50) files = files.splice(0, this.downloadLimit);

    for (const file of files) {
      // add single file
      if (file.mimeType !== "application/vnd.google-apps.folder") {
        const fileStream = await this.singleFileStream(file.id);
        zipFile.append(fileStream.data, { name: path + file.name });

        continue;
      }
      // append directory to archive
      zipFile.append(Buffer.alloc(0), { name: path + file.name + "/" });
      await this.downloadDir(file.id, zipFile, path + file.name + "/");
    }
  }
  async singleFileStream(fileId) {
    const response = await this.drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "stream" }
    );

    return response;
  }
}

module.exports = new DriveManager();
