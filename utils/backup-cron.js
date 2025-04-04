const fs = require('fs');
const path = require('path');

const dirs = {
  docs: path.join(__dirname, 'public', 'docs'),
  media: path.join(__dirname, 'public', 'media')
};

const backupDirs = {
  docs: path.join(__dirname, 'backup', 'docs'),
  media: path.join(__dirname, 'backup', 'media')
};

function performBackup() {
  Object.keys(dirs).forEach(dir => {
    const srcDir = dirs[dir];
    console.log('srcDir', srcDir)
    const destDir = backupDirs[dir];
    console.log('destDir', destDir)

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Read files in the source directory
    fs.readdir(srcDir, (err, files) => {
      if (err) {
        console.error(`Error reading ${srcDir}:`, err);
        return;
      }

      files.forEach(file => {
        const srcFile = path.join(srcDir, file);
        const destFile = path.join(destDir, file);

        // Check if the file exists in the backup; if not, copy it
        if (!fs.existsSync(destFile)) {
          fs.copyFile(srcFile, destFile, err => {
            if (err) {
              console.error(`Error copying ${srcFile} to ${destFile}:`, err);
            } else {
              console.log(`Backed up ${srcFile} to ${destFile}`);
            }
          });
        }
      });
    });
  });
}

module.exports = performBackup;
