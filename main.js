const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const musicMetadata = require("music-metadata");
const Store = require("electron-store");

const store = new Store();
let mainWindow;

function createWindow() {
    const windowBounds = store.get("windowBounds", { width: 400, height: 650 });

    mainWindow = new BrowserWindow({
        ...windowBounds,
        minWidth: 380,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
        titleBarStyle: "hidden",
        trafficLightPosition: { x: 15, y: 15 },
    });

    // mainWindow.webContents.openDevTools();

    // Save window state on resize and move
    mainWindow.on("resize", () => {
        const { width, height } = mainWindow.getBounds();
        store.set("windowBounds", { width, height });
    });

    mainWindow.on("move", () => {
        const { x, y } = mainWindow.getBounds();
        store.set("windowBounds", { ...store.get("windowBounds"), x, y });
    });

    mainWindow.loadFile("index.html");

    mainWindow.on("closed", function () {
        mainWindow = null;
    });
}

const createMenu = () => {
    const template = [
        {
            label: app.getName(),
            submenu: [
                { role: "about" },
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
        { role: "viewMenu" },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
    createWindow();
    createMenu();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// --- IPC HANDLERS ---

ipcMain.handle("get-metadata", async (event, filePath) => {
    try {
        const metadata = await musicMetadata.parseFile(filePath);
        return {
            title: metadata.common.title,
            artist: metadata.common.artist,
            album: metadata.common.album,
        };
    } catch (error) {
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

ipcMain.handle("get-initial-state", () => {
    return store.get("playerState", {
        playlist: [],
        currentTrackIndex: -1,
        volume: 0.5,
        playbackPosition: 0,
        playbackRate: 1.0,
    });
});

ipcMain.on("update-state", (event, state) => {
    store.set("playerState", state);
});
