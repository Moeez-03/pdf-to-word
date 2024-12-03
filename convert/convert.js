const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');

// Use multer for handling file uploads
const upload = multer({ dest: '/tmp/uploads/' }); // Store files in /tmp for Vercel

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    // Handle file upload using multer
    upload.single('pdf')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: 'File upload failed' });
      }

      const inputFilePath = req.file.path;
      const outputFilePath = path.join('/tmp', `${path.basename(req.file.originalname, '.pdf')}.docx`);

      // Create the command to run Python script (assuming pdf2docx is available)
      const command = `python3 -c "from pdf2docx import Converter; Converter('${inputFilePath}').convert('${outputFilePath}')"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return res.status(500).send('Conversion failed');
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }

        // Send the converted file back as a download
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(outputFilePath)}"`);
        res.download(outputFilePath, (err) => {
          if (err) {
            console.error(`Download Error: ${err.message}`);
          }

          // Cleanup
          fs.unlinkSync(inputFilePath);
          fs.unlinkSync(outputFilePath);
        });
      });
    });
  } else {
    return res.status(405).send('Method Not Allowed');
  }
};
