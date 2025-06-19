const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    // Main -> Renderer
    onFilesSelected: (callback) =>
        ipcRenderer.on("files-selected", (_event, filePaths) => {
            callback(filePaths);
        }),

    // Renderer -> Main (and back)
    getMetadata: (filePath) => ipcRenderer.invoke("get-metadata", filePath),
    openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
    getInitialState: () => ipcRenderer.invoke("get-initial-state"),

    // Renderer -> Main (one-way)
    updateState: (state) => ipcRenderer.send("update-state", state),
});
