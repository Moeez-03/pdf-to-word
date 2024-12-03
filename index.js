const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Serve static files (for the frontend)
app.use(express.static(path.join(__dirname, "public")));

// Root endpoint: Serve HTML page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// File upload and conversion endpoint
app.post("/convert", upload.single("pdf"), (req, res) => {
    const inputFilePath = req.file.path; // Path to uploaded file
    const outputFilePath = path.join(__dirname, "converted", `${path.basename(req.file.originalname, ".pdf")}.docx`);

    // Ensure the 'converted' directory exists
    if (!fs.existsSync(path.dirname(outputFilePath))) {
        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    }

    // Use the pdf2docx library to convert PDF to Word
    const command = `python -c "from pdf2docx import Converter; Converter('${inputFilePath.replace(/\\/g, "\\\\")}').convert('${outputFilePath.replace(/\\/g, "\\\\")}')"`; // Properly formatted paths for Windows

    console.log("Executing command:", command);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send("Conversion failed");
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }

        console.log("Conversion successful!");

        // Send the converted file as a download
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(outputFilePath)}"`);
        res.download(outputFilePath, (err) => {
            if (err) {
                console.error(`Download Error: ${err.message}`);
            }

            // Cleanup: Delete uploaded and converted files
            fs.unlinkSync(inputFilePath);
            fs.unlinkSync(outputFilePath);
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
