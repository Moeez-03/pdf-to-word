const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Ensure the necessary 'converted' directories exist
if (!fs.existsSync("converted/pdf-to-word")) {
    fs.mkdirSync("converted/pdf-to-word", { recursive: true });
}
if (!fs.existsSync("converted/word-to-pdf")) {
    fs.mkdirSync("converted/word-to-pdf", { recursive: true });
}

// Serve static files (for the frontend)
app.use(express.static(path.join(__dirname, "public")));

// Root endpoint: Serve HTML page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Helper function to execute shell commands with better error handling and logging
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command Error: ${error.message}`);
                console.error(`Stderr: ${stderr}`);
                return reject(error);
            }
            if (stderr) {
                console.error(`Command Stderr: ${stderr}`);
            }
            console.log(`Stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

// PDF to Word conversion endpoint (multiple files)
app.post("/convert/pdf-to-word", upload.array("pdfs", 10), async (req, res) => {
    try {
        const files = req.files;
        const convertedFiles = [];

        for (const file of files) {
            const inputFilePath = file.path;
            const outputFilePath = path.join(
                __dirname,
                "converted",
                "pdf-to-word",
                `${path.basename(file.originalname, ".pdf")}.docx`
            );

            const command = `python -c "from pdf2docx import Converter; Converter('${inputFilePath.replace(/\\/g, "\\\\")}').convert('${outputFilePath.replace(/\\/g, "\\\\")}')"`

            // Execute the conversion
            await executeCommand(command);
            console.log(`Converted: ${outputFilePath}`);

            // Check if the converted file is non-empty
            if (fs.existsSync(outputFilePath) && fs.statSync(outputFilePath).size > 0) {
                console.log(`File exists and is non-empty: ${outputFilePath}`);
                convertedFiles.push(outputFilePath);
            } else {
                console.error(`Conversion failed for ${file.originalname}. Output file is empty or not created.`);
            }
        }

        res.status(200).json({
            message: `${convertedFiles.length} file(s) converted and saved to pdf-to-word directory.`,
            files: convertedFiles,
        });

        // Cleanup uploaded files
        files.forEach((file) => fs.unlinkSync(file.path));
    } catch (error) {
        console.error(`Conversion failed: ${error.message}`);
        res.status(500).send("Conversion failed. Please check the server logs.");
    }
});

// Word to PDF conversion endpoint (multiple files)
// Word to PDF conversion endpoint (multiple files)
// Word to PDF conversion endpoint (multiple files)
app.post("/convert/word-to-pdf", upload.array("words", 10), async (req, res) => {
    try {
        const files = req.files;
        const convertedFiles = [];

        for (const file of files) {
            const inputFilePath = file.path;
            const originalFileName = file.originalname;

            // Ensure the file is a .docx file
            if (!originalFileName.toLowerCase().endsWith(".docx")) {
                console.error(`Invalid file type: ${originalFileName}. Expected .docx file.`);
                return res.status(400).json({
                    message: `Invalid file type: ${originalFileName}. Only .docx files are supported.`,
                });
            }

            console.log(`Processing file: ${originalFileName}`);
            console.log(`Input File Path: ${inputFilePath}`);
            console.log(`Original File Name: ${originalFileName}`);

            const outputFilePath = path.join(
                __dirname,
                "converted",
                "word-to-pdf",
                `${path.basename(originalFileName, ".docx")}.pdf`
            );

            // Check if the file exists and is a valid .docx file
            if (!fs.existsSync(inputFilePath)) {
                console.error(`File not found: ${inputFilePath}`);
                return res.status(400).json({
                    message: `File not found: ${originalFileName}.`,
                });
            }

            // Check file size
            const stats = fs.statSync(inputFilePath);
            console.log(`File size: ${stats.size} bytes`);
            if (stats.size === 0) {
                return res.status(400).json({
                    message: `The uploaded file is empty: ${originalFileName}.`,
                });
            }

            // Execute the conversion using the Python command
            const command = `python -c "from docx2pdf import convert; convert(r'${inputFilePath.replace(/\\/g, '\\\\')}', r'${outputFilePath.replace(/\\/g, '\\\\')}')"`
            await executeCommand(command);
            console.log(`Converted: ${outputFilePath}`);

            // Check if the converted file is non-empty
            if (fs.existsSync(outputFilePath) && fs.statSync(outputFilePath).size > 0) {
                console.log(`File exists and is non-empty: ${outputFilePath}`);
                convertedFiles.push(outputFilePath);
            } else {
                console.error(`Conversion failed for ${originalFileName}. Output file is empty or not created.`);
            }
        }

        // Respond with success message and converted file paths
        if (convertedFiles.length > 0) {
            res.status(200).json({
                message: `${convertedFiles.length} file(s) converted and saved to word-to-pdf directory.`,
                files: convertedFiles,
            });
        } else {
            res.status(400).json({
                message: "No valid files were converted.",
            });
        }

        // Cleanup uploaded files
        files.forEach((file) => fs.unlinkSync(file.path));
    } catch (error) {
        console.error(`Conversion failed: ${error.message}`);
        res.status(500).send("Conversion failed. Please check the server logs.");
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
