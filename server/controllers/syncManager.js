const { getDrive } = require("../config/drive");
const os = require("os");

const path = require("path");
const fs = require("fs");

class SyncDrive {
  constructor() {
    this.drive = null;
    this.targetId = null;

    this.folderCache = {};
    this.fileStates = {};
    this.nextChangeToken = null;
  }

  async init(sessionId, data) {
    if (!sessionId) return false; // Authentication failed

    const { drive, auth } = await getDrive(sessionId);
    this.drive = drive;

    // start parameters
    this.targetId = data.folderId;
    this.nextChangeToken = data.changeToken;

    this.localPath = path.join(
      os.homedir(),
      "Desktop",
      (await this.fileMetadata(this.targetId)).name
    );
    this.loadStates();

    return true; // Authentication successfull
  }

  checkChanges = async (req, res) => {
    if (!(await this.init(req.cookies["session"], req.query)))
      return res.status(404).send("Authorization required");

    try {
      this.sync = false;

      const folderChanges = await this.getRangeChanges();

      res.status(200).send({
        message: `${folderChanges.length} changes found on the folder`,
        changes: folderChanges.length,
      });
    } catch (error) {
      res.status(501).json({ error: error.message });
    }
  };
  syncToFileSystem = async (req, res) => {
    if (!(await this.init(req.cookies["session"], req.query)))
      return res.status(404).send("Authorization required");

    this.sync = true;

    try {
      if (!fs.existsSync(this.localPath))
        fs.mkdirSync(this.localPath, { recursive: true });

      const folderChanges = await this.getRangeChanges();

      // download all files
      folderChanges.forEach(async (change) => {
        const dirname = path.join(this.localPath, change.path);
        if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

        const filePath = path.join(dirname, change.filename);

        // removed files
        if (change.trashed) {
          try {
            fs.rmSync(filePath, { recursive: true });
            return;
          } catch (error) {
            return;
          }
        }

        // renamed and moved files
        if (change.oldPath) {
          fs.renameSync(path.join(this.localPath, change.oldPath), filePath);
          return;
        }

        if (change.mimeType === "application/vnd.google-apps.folder") return;

        // create or replace the file
        const writeable = fs.createWriteStream(filePath);
        const fileStream = await this.singleFileStream(change.fileId);

        fileStream.data.pipe(writeable);
      });

      // send the next token
      if (this.nextChangeToken)
        res.setHeader("Change-Token", this.nextChangeToken);

      res.status(200).send("Files synced in Desktop");
    } catch (error) {
      console.log(error.message);
      res.status(501).json({ error: error.message });
    }
  };

  async getRangeChanges() {
    const folderChanges = [];

    var response = null;
    do {
      response = await this.drive.changes.list({
        pageToken: this.nextChangeToken,
        includeRemoved: true,
        pageSize: 100,
        fields:
          "nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,parents,mimeType,modifiedTime,trashed))",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        orderBy: "modifiedTime asc",
      });

      if (response.data.changes && response.data.changes.length !== 0) {
        const changes = await this.filterChanges(response.data.changes);
        folderChanges.push(...changes);
      }
      this.nextChangeToken = response.data.nextPageToken;
    } while (this.nextChangeToken);

    this.nextChangeToken = response.data.newStartPageToken;

    return folderChanges;
  }
  async filterChanges(changes) {
    const folderChanges = [];

    for (const change of changes) {
      if (!change.file) continue;
      if (!(await this.isFromFolder(change.file))) continue;

      const file = change.file;
      const currentFile = {
        fileId: file.id,
        filename: file.name,
        mimeType: file.mimeType,
        trashed: file.trashed,
        parents: file.parents,
        path: await this.builAbsolutePath(file.parents),
      };

      if (file.trashed) {
        folderChanges.push({ ...currentFile, type: "removed" });
        delete this.fileStates[file.id];
        continue;
      }

      const oldState = this.fileStates[file.id];
      if (!oldState) {
        folderChanges.push({ ...currentFile, type: "created" });
      } else {
        const operationType = this.processChanges(oldState, currentFile);

        if (operationType)
          folderChanges.push({ ...currentFile, ...operationType });
      }

      if (this.sync) this.fileStates[file.id] = currentFile;
    }

    // save current states
    if (this.sync) this.saveStates();

    return folderChanges;
  }

  async isFromFolder(file) {
    if (!file.parents) return false;

    for (const parentId of file.parents) {
      if (await this.isUnderTarget(parentId)) return true;
    }

    return false;
  }
  async isUnderTarget(folderId) {
    if (folderId === this.targetId) return true;

    if (this.folderCache[folderId] !== undefined)
      return this.folderCache[folderId];

    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: "parents",
      });

      if (!response.data.parents) {
        this.folderCache[folderId] = false;
        return false;
      }

      for (const parentId of response.data.parents) {
        if (await this.isUnderTarget(parentId)) {
          this.folderCache[folderId] = true;
          return true;
        }
      }

      this.folderCache[folderId] = false;
      return false;
    } catch (error) {
      console.error("Error checking parents:", error.message);
      return false;
    }
  }
  async builAbsolutePath(parents) {
    if (!parents) return "/";

    var parent = parents[0];
    var pathComponents = [];

    const visited = new Set();
    while (parent && !visited.has(parent)) {
      visited.add(parent);

      try {
        // the parent of the first file is the target folder
        if (parent === this.targetId) return pathComponents.join("/");

        var folder = await this.drive.files.get({
          fileId: parent,
          fields: "name, parents",
        });

        parent = folder.data.parents;
        if (!parent || parent.length === 0) break;

        // if the parent is found return the created path
        pathComponents.unshift(folder.data.name);
        if (parent[0] === this.targetId) return pathComponents.join("/");
      } catch (error) {
        console.log("Error building path for", parent, error.message);
        break;
      }
    }

    return pathComponents.join("/");
  }
  processChanges(oldState, newState) {
    if (oldState.filename !== newState.filename) {
      return {
        type: "renamed",
        oldPath: path.join(oldState.path, oldState.filename),
      };
    } else if (oldState.parents[0] !== newState.parents[0]) {
      return {
        type: "moved",
        oldPath: path.join(oldState.path, oldState.filename),
      };
    }
  }
  saveStates() {
    try {
      var statesPath = path.join(this.localPath, ".file-states.json");
      fs.writeFileSync(statesPath, JSON.stringify(this.fileStates, null, 2));

      if (process.platform === "win32") {
        const { execSync } = require("child_process");
        execSync(`attrib +h "${statesPath}"`);
      }
    } catch (error) {
      console.error("Error saving the states:", error.message);
    }
  }
  loadStates() {
    try {
      var statesPath = path.join(this.localPath, ".file-states.json");
      this.fileStates = JSON.parse(fs.readFileSync(statesPath, "utf8"));
    } catch (error) {
      console.error("Error loading states:", error.message);
      this.fileStates = {};
    }
  }

  async singleFileStream(fileId) {
    const response = await this.drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "stream" }
    );

    return response;
  }
  async fileMetadata(fileId) {
    const response = await this.drive.files.get({
      fileId: fileId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return response.data;
  }
}

module.exports = new SyncDrive();
