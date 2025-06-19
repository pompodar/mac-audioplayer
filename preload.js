const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    // Expose a function to invoke the metadata handler in main.js
    getMetadata: (filePath) => ipcRenderer.invoke("get-metadata", filePath),

    // Expose a function to receive selected files from the main process
    onFilesSelected: (callback) =>
        ipcRenderer.on("files-selected", (_event, filePaths) => {
            callback(filePaths);
        }),
    
    openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
});
