const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const musicMetadata = require("music-metadata");

// Keep a global reference to the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile("index.html");

    // Open the DevTools - useful for debugging
    // mainWindow.webContents.openDevTools();

    mainWindow.on("closed", function () {
        mainWindow = null;
    });
}

// Function to create the application menu (for Mac)
const createMenu = () => {
    const template = [
        {
            label: app.getName(),
            submenu: [
                { role: "about" },
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" },
            ],
        },
        {
            label: "File",
            submenu: [
                {
                    label: "Open Audio Files",
                    accelerator: "CmdOrCtrl+O",
                    click: async () => {
                        const { filePaths } = await dialog.showOpenDialog({
                            properties: ["openFile", "multiSelections"],
                            filters: [
                                {
                                    name: "Audio",
                                    extensions: [
                                        "mp3",
                                        "wav",
                                        "ogg",
                                        "flac",
                                        "m4b",
                                    ],
                                },
                            ],
                        });

                        if (filePaths && filePaths.length > 0) {
                            mainWindow.webContents.send(
                                "files-selected",
                                filePaths
                            );
                        }
                    },
                },
            ],
        },
        {
            label: "View",
            submenu: [
                { role: "reload" },
                { role: "forceReload" },
                { role: "toggleDevTools" },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
    createWindow();
    createMenu();

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// IPC handler to get audio metadata
ipcMain.handle("get-metadata", async (event, filePath) => {
    try {
        const metadata = await musicMetadata.parseFile(filePath);
        return {
            title: metadata.common.title,
            artist: metadata.common.artist,
            album: metadata.common.album,
        };
    } catch (error) {
        console.error("Error reading metadata:", error);
        return {};
    }
});

ipcMain.handle("open-file-dialog", async () => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [
            { name: "Audio", extensions: ["mp3", "wav", "ogg", "flac", "m4b"] },
        ],
    });
    return filePaths;
});
