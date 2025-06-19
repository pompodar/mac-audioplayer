const audioPlayer = document.getElementById("audio-player");
const playPauseBtn = document.getElementById("play-pause-btn");
const stopBtn = document.getElementById("stop-btn");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const seekBar = document.getElementById("seek-bar");
const volumeSlider = document.getElementById("volume-slider");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const playlistEl = document.getElementById("playlist");
const addFilesBtn = document.getElementById("add-files-btn"); // Get the new button

let playlist = [];
let currentTrackIndex = -1;

// Load files selected via the main process menu
window.api.onFilesSelected((filePaths) => {
    playlist = [...playlist, ...filePaths];
    renderPlaylist();
    if (currentTrackIndex === -1 && playlist.length > 0) {
        currentTrackIndex = 0;
        loadTrack(currentTrackIndex);
    }
});

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    const filePath = playlist[index];
    audioPlayer.src = filePath;

    // Fetch and display metadata
    window.api.getMetadata(filePath).then((metadata) => {
        titleEl.textContent = metadata.title || "Unknown Title";
        artistEl.textContent = metadata.artist || "Unknown Artist";
    });

    updatePlaylistUI();
}

function renderPlaylist() {
    playlistEl.innerHTML = "";
    playlist.forEach((filePath, index) => {
        const li = document.createElement("li");
        const fileName = filePath.split("/").pop().split("\\").pop();
        li.textContent = fileName;
        li.dataset.index = index;
        li.addEventListener("click", () => {
            loadTrack(index);
            audioPlayer.play();
        });
        playlistEl.appendChild(li);
    });
    updatePlaylistUI();
}

function updatePlaylistUI() {
    const items = playlistEl.querySelectorAll("li");
    items.forEach((item, index) => {
        item.classList.toggle("active", index === currentTrackIndex);
    });
}

addFilesBtn.addEventListener("click", async () => {
    const filePaths = await window.api.openFileDialog();
    if (filePaths && filePaths.length > 0) {
        playlist = [...playlist, ...filePaths];
        renderPlaylist();
        // If nothing was playing, load and play the first new track
        if (currentTrackIndex === -1) {
            currentTrackIndex = playlist.length - filePaths.length;
            loadTrack(currentTrackIndex);
        }
    }
});

playPauseBtn.addEventListener("click", () => {
    if (audioPlayer.paused && currentTrackIndex !== -1) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
});

stopBtn.addEventListener("click", () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
});

nextBtn.addEventListener("click", () => {
    if (playlist.length > 0) {
        const nextIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(nextIndex);
        audioPlayer.play();
    }
});

prevBtn.addEventListener("click", () => {
    if (playlist.length > 0) {
        const prevIndex =
            (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(prevIndex);
        audioPlayer.play();
    }
});

// --- Audio Player Events ---

audioPlayer.addEventListener("play", () => {
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
});

audioPlayer.addEventListener("pause", () => {
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
});

audioPlayer.addEventListener("ended", () => {
    // Autoplay next song
    nextBtn.click();
});

audioPlayer.addEventListener("timeupdate", () => {
    if (isNaN(audioPlayer.duration)) return;
    seekBar.value = audioPlayer.currentTime;
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("loadedmetadata", () => {
    seekBar.max = audioPlayer.duration;
    durationEl.textContent = formatTime(audioPlayer.duration);
});

// --- UI Element Events ---

seekBar.addEventListener("input", () => {
    audioPlayer.currentTime = seekBar.value;
});

volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = volumeSlider.value;
});

// --- Utility Functions ---

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
