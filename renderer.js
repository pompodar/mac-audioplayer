// --- DOM Element Selectors ---
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
const addFilesBtn = document.getElementById("add-files-btn");
const playerContainer = document.getElementById("player-container");
const speedBtn = document.getElementById("speed-btn");
const artworkContainer = document.getElementById("artwork-container"); // ADDED
const albumArt = document.getElementById("album-art"); // ADDED

// --- State Variables ---
let playlist = [];
let currentTrackIndex = -1;
const playbackSpeeds = [1.0, 1.25, 1.5, 1.75, 2.0, 0.75];
let currentSpeedIndex = 0;

// --- State Management ---
function saveCurrentState() {
    if (!audioPlayer) return;
    const state = {
        playlist,
        currentTrackIndex,
        volume: audioPlayer.volume,
        playbackPosition:
            audioPlayer.duration &&
            audioPlayer.currentTime !== audioPlayer.duration
                ? audioPlayer.currentTime
                : 0,
        playbackRate: audioPlayer.playbackRate,
    };
    window.api.updateState(state);
}

async function loadInitialState() {
    const state = await window.api.getInitialState();
    if (state) {
        playlist = state.playlist || [];
        currentTrackIndex =
            state.currentTrackIndex > -1 ? state.currentTrackIndex : -1;
        audioPlayer.volume = state.volume;
        volumeSlider.value = state.volume;

        const savedSpeed = state.playbackRate || 1.0;
        audioPlayer.playbackRate = savedSpeed;
        speedBtn.textContent = `${savedSpeed}x`;
        const speedIndex = playbackSpeeds.indexOf(savedSpeed);
        currentSpeedIndex = speedIndex > -1 ? speedIndex : 0;

        renderPlaylist();

        if (currentTrackIndex > -1 && playlist.length > 0) {
            loadTrack(currentTrackIndex, false);
            audioPlayer.addEventListener(
                "loadedmetadata",
                () => {
                    audioPlayer.currentTime = state.playbackPosition || 0;
                    seekBar.value = state.playbackPosition || 0;
                },
                { once: true }
            );
        }
    }
}
document.addEventListener("DOMContentLoaded", loadInitialState);
setInterval(saveCurrentState, 5000);
window.addEventListener("beforeunload", saveCurrentState);

// --- Core Functions ---
function loadTrack(index, autoplay = true) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    audioPlayer.src = playlist[index];

    resetArtwork(); // Reset art before loading new metadata

    window.api.getMetadata(playlist[index]).then((meta) => {
        titleEl.textContent = meta.title || "Unknown Title";
        artistEl.textContent = meta.artist || "Unknown Artist";

        // Set album art if it exists
        if (meta.picture) {
            const dataUrl = `data:${meta.picture.format};base64,${meta.picture.data}`;
            albumArt.src = dataUrl;
            artworkContainer.style.backgroundImage = `url(${dataUrl})`;
            artworkContainer.classList.add("has-art");
        }
    });

    updatePlaylistUI();
    saveCurrentState();
    if (autoplay) audioPlayer.play();
}

function renderPlaylist() {
    playlistEl.innerHTML = "";
    playlist.forEach((filePath, index) => {
        const li = document.createElement("li");
        li.dataset.index = index;

        const songName = document.createElement("span");
        songName.textContent = filePath.split("/").pop().split("\\").pop();
        li.appendChild(songName);

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.className = "delete-btn";
        deleteBtn.title = "Remove from playlist";
        deleteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            deleteTrack(index);
        });
        li.appendChild(deleteBtn);

        li.addEventListener("click", () => {
            loadTrack(index);
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

function addFilesToPlaylist(filePaths) {
    const wasEmpty = playlist.length === 0;
    const validPaths = filePaths.filter((path) => {
        const ext = path.split(".").pop().toLowerCase();
        return ["mp3", "wav", "ogg", "flac"].includes(ext);
    });

    if (validPaths.length > 0) {
        playlist = [...playlist, ...validPaths];
        renderPlaylist();
        saveCurrentState();
        if (wasEmpty && playlist.length > 0) {
            loadTrack(0);
        }
    }
}

function deleteTrack(indexToDelete) {
    if (indexToDelete < 0 || indexToDelete >= playlist.length) return;
    const wasPlaying = !audioPlayer.paused;

    if (indexToDelete < currentTrackIndex) {
        currentTrackIndex--;
    }

    playlist.splice(indexToDelete, 1);

    if (indexToDelete === currentTrackIndex) {
        if (playlist.length === 0) {
            audioPlayer.pause();
            audioPlayer.src = "";
            titleEl.textContent = "No track loaded";
            artistEl.textContent = "";
            currentTimeEl.textContent = "0:00";
            durationEl.textContent = "0:00";
            currentTrackIndex = -1;
            resetArtwork(); // Reset art when playlist is empty
        } else {
            if (currentTrackIndex >= playlist.length) {
                currentTrackIndex = 0;
            }
            loadTrack(currentTrackIndex, wasPlaying);
        }
    }

    renderPlaylist();
    saveCurrentState();
}

// --- Event Listeners ---
window.api.onFilesSelected(addFilesToPlaylist);
addFilesBtn.addEventListener("click", async () => {
    const filePaths = await window.api.openFileDialog();
    if (filePaths && filePaths.length > 0) addFilesToPlaylist(filePaths);
});

playerContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    playerContainer.classList.add("drag-over");
});
playerContainer.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    playerContainer.classList.remove("drag-over");
});
playerContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    playerContainer.classList.remove("drag-over");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFilesToPlaylist(Array.from(e.dataTransfer.files).map((f) => f.path));
    }
});

playPauseBtn.addEventListener("click", () =>
    audioPlayer.paused && currentTrackIndex !== -1
        ? audioPlayer.play()
        : audioPlayer.pause()
);
stopBtn.addEventListener("click", () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
});
nextBtn.addEventListener(
    "click",
    () =>
        playlist.length > 0 &&
        loadTrack((currentTrackIndex + 1) % playlist.length)
);
prevBtn.addEventListener(
    "click",
    () =>
        playlist.length > 0 &&
        loadTrack((currentTrackIndex - 1 + playlist.length) % playlist.length)
);

speedBtn.addEventListener("click", () => {
    currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
    const newSpeed = playbackSpeeds[currentSpeedIndex];
    audioPlayer.playbackRate = newSpeed;
    speedBtn.textContent = `${newSpeed}x`;
    saveCurrentState();
});

audioPlayer.addEventListener(
    "play",
    () => (playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>')
);
audioPlayer.addEventListener(
    "pause",
    () => (playPauseBtn.innerHTML = '<i class="fas fa-play"></i>')
);
audioPlayer.addEventListener("ended", () => nextBtn.click());
audioPlayer.addEventListener("timeupdate", () => {
    if (isNaN(audioPlayer.duration)) return;
    seekBar.value = audioPlayer.currentTime;
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
});
audioPlayer.addEventListener("loadedmetadata", () => {
    seekBar.max = audioPlayer.duration;
    durationEl.textContent = formatTime(audioPlayer.duration);
});

seekBar.addEventListener(
    "input",
    () => (audioPlayer.currentTime = seekBar.value)
);
volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = volumeSlider.value;
    saveCurrentState();
});

// --- Utility Functions ---
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ADDED: Helper to reset the album art UI
function resetArtwork() {
    albumArt.src = "";
    artworkContainer.classList.remove("has-art");
}
