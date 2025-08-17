const express = require("express");
const driveManager = require("../controllers/driveManager");
const syncManager = require("../controllers/syncManager");

const router = express.Router();

router.get("/get-folders", driveManager.getFolders);
router.get("/get-files", driveManager.getFilesFrom);

router.get("/download", driveManager.download);

router.get("/search-changes", syncManager.checkChanges);
router.get("/sync", syncManager.syncToFileSystem);

module.exports = router;
