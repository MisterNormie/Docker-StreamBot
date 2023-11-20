"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const config_json_1 = tslib_1.__importDefault(require("./config.json"));
const express_1 = tslib_1.__importDefault(require("express"));
const multer_1 = tslib_1.__importDefault(require("multer"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const axios_1 = tslib_1.__importDefault(require("axios"));
const https_1 = tslib_1.__importDefault(require("https"));
const app = (0, express_1.default)();
const agent = new https_1.default.Agent({ rejectUnauthorized: false });
const user = config_json_1.default.server.username || 'admin';
const pass = config_json_1.default.server.password || 'admin';
const port = config_json_1.default.server.port || '8080';
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config_json_1.default.movieFolder);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});
const upload = (0, multer_1.default)({ storage: storage });
app.use((req, res, next) => {
    const auth = { name: user, password: pass };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [username, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (username === auth.name && password === auth.password) {
        next();
    }
    else {
        res.set('WWW-Authenticate', 'Basic realm="My Realm"');
        res.status(401).send('Invalid credentials');
    }
});
app.post("/api/upload", upload.single("file"), (req, res) => {
    const template = `
        ${template_style}
        <div class="container">
            <h1>File Uploaded</h1>
            <a href="/" class="btn btn-primary">Return</a>
        </div>
    `;
    res.send(template);
});
app.post("/api/remote_upload", upload.single("link"), async (req, res) => {
    const link = req.body.link;
    const filename = link.substring(link.lastIndexOf('/') + 1);
    const filepath = path_1.default.join(config_json_1.default.movieFolder, filename);
    try {
        const response = await axios_1.default.get(link, { responseType: 'stream', httpsAgent: agent });
        const writer = fs_1.default.createWriteStream(filepath);
        response.data.pipe(writer);
        writer.on('finish', () => {
            const template = `
          ${template_style}
          <div class="container">
            <h1>File Uploaded successfully: ${filename}</h1>
            <a href="/" class="btn btn-primary">Return</a>
          </div>
        `;
            res.send(template);
        });
        writer.on('error', (err) => {
            console.error(err);
            const template = `
          ${template_style}
          <div class="container">
            <h1>Error uploading file</h1>
            <a href="/" class="btn btn-primary">Return</a>
          </div>
        `;
            res.send(template);
        });
    }
    catch (err) {
        console.error(err);
        const template = `
        ${template_style}
        <div class="container">
          <h1>Error uploading file</h1>
          <a href="/" class="btn btn-primary">Return</a>
        </div>
      `;
        res.send(template);
    }
});
const template_style = `
    <!-- provide a bootstrap style by using CDN -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.1/css/bootstrap.min.css" integrity="sha512-Z/def5z5u2aR89OuzYcxmDJ0Bnd5V1cKqBEbvLOiUNWdg9PQeXVvXLI90SE4QOHGlfLqUnDNVAYyZi8UwUTmWQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <style>
        body {
        background-color: #f8f8f8;
        color: #333;
        font-family: "Arial", sans-serif;
        }
    
        h1 {
        color: #555;
        margin-bottom: 20px;
        }
    
        .container {
        margin: 20px auto;
        max-width: 800px;
        }
    
        .table {
        background-color: #fff;
        border: 1px solid #ddd;
        border-collapse: collapse;
        width: 100%;
        }
    
        .table th,
        .table td {
        padding: 10px;
        }
    
        .table th {
        font-weight: bold;
        background-color: #f5f5f5;
        border-top: 1px solid #ddd;
        border-bottom: 1px solid #ddd;
        }
    
        .table tr:hover {
        background-color: #f9f9f9;
        }
    
        .form-group {
        margin-bottom: 20px;
        }
    
        .form-control {
        width: 100%;
        padding: 8px;
        font-size: 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
        }
    
        .btn-primary {
        background-color: #007bff;
        color: #fff;
        border: none;
        }
    
        .btn-primary:hover {
        background-color: #0069d9;
        }
    
        .btn-success {
        background-color: #28a745;
        color: #fff;
        border: none;
        }
    
        .btn-success:hover {
        background-color: #218838;
        }
    </style>
    `;
const prettySize = (size) => {
    if (size < 1024) {
        return `${size} B`;
    }
    else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    }
    else if (size < 1024 * 1024 * 1024) {
        return `${(size / 1024 / 1024).toFixed(2)} MB`;
    }
    else {
        return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }
};
app.get("/", (req, res) => {
    fs_1.default.readdir(config_json_1.default.movieFolder, (err, files) => {
        if (err) {
            console.log(err);
        }
        else {
            const template = `
            ${template_style}
            <div class="container">
              <h1>File List</h1>
              <div class="table-responsive">
                <table class="table table-striped table-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Preview</th>
                      <th>Copy</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${files.map(file => {
                const stats = fs_1.default.statSync(path_1.default.join(config_json_1.default.movieFolder, file));
                return `
                        <tr>
                          <td>${file}</td>
                          <td>${prettySize(stats.size)}</td>
                          <td><a href="/preview/${file}">Preview</a></td>
                          <td>
                            <button class="btn btn-sm btn-primary copy-button" data-clipboard-text="${path_1.default.parse(file).name.replace(/\s/g, '')}">
                              Copy
                            </button>
                          </td>
                          <td><a href="/delete/${file}">Delete</a></td>
                        </tr>
                      `;
            }).join("")}
                  </tbody>
                </table>
              </div>
              
              <h1>Upload File</h1>
              <form action="/api/upload" method="post" enctype="multipart/form-data">
                <div class="form-group">
                  <label for="fileInput">Select File:</label>
                  <input type="file" id="fileInput" name="file" required />
                </div>
                <div class="form-group">
                  <button type="submit" class="btn btn-primary">Upload</button>
                </div>
              </form>
              
              <form action="/api/remote_upload" method="post" enctype="multipart/form-data">
                <div class="form-group">
                  <label for="linkInput">Remote Upload:</label>
                  <input type="text" class="form-control" id="linkInput" name="link" placeholder="Link" required />
                </div>
                <div class="form-group">
                  <button type="submit" class="btn btn-primary">Upload</button>
                </div>
              </form>
            </div>
            
            <script>
            const copyButtons = document.querySelectorAll('.copy-button');
            copyButtons.forEach(button => {
              button.addEventListener('click', () => {
                const clipboardText = button.getAttribute('data-clipboard-text');
                navigator.clipboard.writeText(clipboardText)
                  .then(() => {
                    button.textContent = 'Copied';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-success');
                  })
                  .catch(error => {
                    console.error('Unable to copy text:', error);
                  });
              });
            });
            </script>            
            `;
            res.send(template);
        }
    });
});
let ffmpegRunning = {};
async function ffmpegScreenshot(video) {
    return new Promise((resolve, reject) => {
        if (ffmpegRunning[video]) {
            let wait = () => {
                if (ffmpegRunning[video] == false) {
                    resolve();
                }
                setTimeout(wait, 100);
            };
            wait();
            return;
        }
        ffmpegRunning[video] = true;
        const ffmpeg = require("fluent-ffmpeg");
        const ts = ['10%', '30%', '50%', '70%', '90%'];
        const takeOne = (i) => {
            if (i >= ts.length) {
                ffmpegRunning[video] = false;
                resolve();
                return;
            }
            console.log(`Taking screenshot ${i + 1} of ${video} at ${ts[i]}`);
            ffmpeg(`${config_json_1.default.movieFolder}/${video}`).on("end", () => {
                takeOne(i + 1);
            }).on("error", (err) => {
                ffmpegRunning[video] = false;
                reject(err);
            })
                .screenshots({
                count: 1,
                filename: `${video}-${i + 1}.jpg`,
                timestamps: [ts[i]],
                folder: config_json_1.default.previewCache,
                size: "640x480"
            });
        };
        takeOne(0);
    });
}
app.get("/api/preview/:file/:id", async (req, res) => {
    const file = req.params.file;
    const id = req.params.id;
    if (id < 1 || id > 5) {
        res.status(404).send("Not Found");
        return;
    }
    const previewFile = path_1.default.join(config_json_1.default.previewCache, `${file}-${id}.jpg`);
    if (fs_1.default.existsSync(previewFile)) {
        res.sendFile(previewFile);
    }
    else {
        try {
            await ffmpegScreenshot(file);
        }
        catch (err) {
            console.log(err);
            res.status(500).send("Internal Server Error");
            return;
        }
        res.sendFile(previewFile);
    }
});
const stringify = (obj) => {
    if (typeof obj == "string") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return `<ul>${obj.map(item => {
            return `<li>${stringify(item)}</li>`;
        }).join("")}</ul>`;
    }
    else {
        if (typeof obj == "object") {
            return `<ul>${Object.keys(obj).map(key => {
                return `<li>${key}: ${stringify(obj[key])}</li>`;
            }).join("")}</ul>`;
        }
        else {
            return obj;
        }
    }
};
app.get("/preview/:file", (req, res) => {
    const file = req.params.file;
    if (!fs_1.default.existsSync(path_1.default.join(config_json_1.default.movieFolder, file))) {
        res.status(404).send("Not Found");
        return;
    }
    const ffmpeg = require("fluent-ffmpeg");
    ffmpeg.ffprobe(`${config_json_1.default.movieFolder}/${file}`, (err, metadata) => {
        if (err) {
            console.log(err);
            res.status(500).send("Internal Server Error");
            return;
        }
        const template = `
            ${template_style}
            <div class="container">
                <h1>Metadata</h1>
                <div class="table-responsive">
                    <table class="table table-striped table-sm">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(metadata.format).map(key => {
            return `
                                    <tr>
                                        <td>${key}</td>
                                        <td>${stringify(metadata.format[key])}</td>
                                    </tr>
                                `;
        }).join("")}
                        </tbody>
                    </table>
                </div>
                <h1>Preview</h1>
                <!-- waterfall layout the preview images -->
                <div class="row">
                    <div class="col-6 col-md-4 col-lg-3">
                        <a href="/api/preview/${file}/1"><img src="/api/preview/${file}/1" class="img-fluid" /></a>
                        <a href="/api/preview/${file}/2"><img src="/api/preview/${file}/2" class="img-fluid" /></a>
                        <a href="/api/preview/${file}/3"><img src="/api/preview/${file}/3" class="img-fluid" /></a>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3">
                        <a href="/api/preview/${file}/4"><img src="/api/preview/${file}/4" class="img-fluid" /></a>
                        <a href="/api/preview/${file}/5"><img src="/api/preview/${file}/5" class="img-fluid" /></a>
                    </div>
                </div>
                <a href="/" class="btn btn-primary">Return</a>
            </div>
        `;
        res.send(template);
    });
});
app.get("/delete/:file", (req, res) => {
    const file = req.params.file;
    if (!fs_1.default.existsSync(path_1.default.join(config_json_1.default.movieFolder, file))) {
        res.status(404).send("Not Found");
        return;
    }
    fs_1.default.unlink(path_1.default.join(config_json_1.default.movieFolder, file), function (err) {
        if (err)
            return console.log(err);
        console.log('file ( ' + file + ' ) deleted successfully');
        const template = `
            ${template_style}
            <div class="container">
                <h1>file deleted successfully</h1>
                <a href="/" class="btn btn-primary">Return</a>
            </div>
        `;
        res.send(template);
    });
});
if (!fs_1.default.existsSync(config_json_1.default.previewCache)) {
    fs_1.default.mkdirSync(config_json_1.default.previewCache);
}
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=server.js.map