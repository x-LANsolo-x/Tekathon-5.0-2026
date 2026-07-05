const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getAuthClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../credentials.json'),
      scopes: SCOPES,
    });
    return auth;
  } catch (error) {
    console.warn('Google Auth setup failed. Please ensure credentials.json is present.');
    return null;
  }
}

/**
 * Creates a new folder inside Google Drive.
 * @param {String} folderName - Name of the new folder
 * @param {String} parentFolderId - ID of the parent folder to create it in
 * @returns {String} The ID of the newly created folder
 */
async function createFolder(folderName, parentFolderId) {
  const auth = getAuthClient();
  if (!auth) throw new Error('Missing Google Drive credentials');

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentFolderId ? [parentFolderId] : []
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });

    // Make folder accessible
    try {
      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (permErr) {
      console.warn('Could not set public permissions on Drive folder:', permErr.message);
    }

    return file.data.id;
  } catch (error) {
    console.error('Error creating Google Drive folder:', error.message);
    throw new Error('Failed to create team folder in cloud storage.');
  }
}

/**
 * Uploads a file buffer to Google Drive.
 * @param {Buffer} fileBuffer - The file buffer in memory
 * @param {String} fileName - The name to save the file as
 * @param {String} mimeType - The mime type of the file
 * @param {String} parentFolderId - The ID of the folder to save the file in
 * @returns {String} The webViewLink of the uploaded file
 */
async function uploadToDrive(fileBuffer, fileName, mimeType, parentFolderId = null) {
  const auth = getAuthClient();
  if (!auth) return 'mock_drive_url_due_to_missing_credentials';

  const drive = google.drive({ version: 'v3', auth });

  // Convert buffer to a readable stream for Google Drive API
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  // Fallback to .env folder ID if no parent is provided
  const folderId = parentFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : [] // If no folder specified, saves to root of service account
  };

  const media = {
    mimeType: mimeType,
    body: bufferStream,
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    // We must make the file accessible if we want evaluators to view it without service account auth
    try {
      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.warn('Could not set public permissions on Drive file:', permErr.message);
    }

    return file.data.webViewLink;
  } catch (error) {
    console.error('Error uploading to Google Drive:', error.message);
    throw new Error('Failed to upload payload to cloud storage.');
  }
}

module.exports = {
  uploadToDrive,
  createFolder
};
