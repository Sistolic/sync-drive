# Google Drive API

Node.js project to interact with the Google Drive API.
Integrate download of files and folders.
If you download a folder the server send a Drive change key for reviewing change later, you can then sync the changes made in Google Drive to the computer you download the folder.
  - NOTE: The server sync a downloaded folder in the Desktop of the computer

---
# Notes

1. The project encrypt and save your Google credentials in a JSON file. You have to generate a 32 bytes key with the node package crypto.
2. There are setup instructions for getting the credentials.
3. The project runs in localhost.

## How to use it?
- Clone this repository: `git clone https://github.com/Sistolic/sync-drive.git`
- Install required packages: `npm install`
- Generate a encryption key and save into the .env file: `crypto.randomBytes(32).toString("hex")`
- Execute the `npm run dev` command
- Go to a browser and search `localhost:3000`
- Type your Google credentials and your in