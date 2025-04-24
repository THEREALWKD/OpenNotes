let currentVideoId = null;
let isNoteBoxHidden = false;

function getVideoId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("v");
}

function getVideoPlayerHeight() {
  const videoElement = document.querySelector(".html5-video-player video");
  if (videoElement) {
    return videoElement.clientHeight;
  }
  return null;
}

function createOrUpdatePanel() {
  console.log("createOrUpdatePanel called");
  const secondarySection = document.querySelector("ytd-watch-flexy #secondary") || document.querySelector("#secondary");
  if (!secondarySection) {
    console.log("secondarySection not found");
    return;
  }
  console.log("secondarySection found, proceeding to create container");

  let container = document.getElementById("yt-note-container");
  const videoId = getVideoId();

  if (currentVideoId === videoId && container) {
    console.log("Container exists, updating height");
    const videoHeight = getVideoPlayerHeight();
    if (videoHeight && !isNoteBoxHidden) {
      container.style.height = `${videoHeight}px`;
    }
    container.style.visibility = "visible";
    return;
  }

  currentVideoId = videoId;

  let previousNoteBox = container ? container.querySelector("#yt-note-box") : null;
  if (previousNoteBox) {
    isNoteBoxHidden = previousNoteBox.style.display === "none";
  }

  if (container) container.remove();

  container = document.createElement("div");
  container.id = "yt-note-container";
  if (isNoteBoxHidden) container.classList.add("collapsed");
  container.style.visibility = "hidden";
  console.log("Container created");

  const header = document.createElement("div");
  header.id = "yt-note-header";

  const leftButtons = document.createElement("div");
  leftButtons.className = "note-buttons";

  const myNotesBtn = document.createElement("button");
  myNotesBtn.id = "open-notes-btn";
  myNotesBtn.textContent = "✸ My Notes";
  leftButtons.appendChild(myNotesBtn);

  const toggleBtn = document.createElement("span");
  toggleBtn.id = "toggle-note";
  toggleBtn.textContent = isNoteBoxHidden ? "[+]" : "[–]";
  leftButtons.appendChild(toggleBtn);

  header.innerHTML = `<span>📌 Make a Note</span>`;
  header.appendChild(leftButtons);

  container.appendChild(header);

  const noteBox = document.createElement("textarea");
  noteBox.id = "yt-note-box";
  noteBox.placeholder = "Write your thoughts...";
  noteBox.style.display = isNoteBoxHidden ? "none" : "block";
  container.appendChild(noteBox);

  secondarySection.insertBefore(container, secondarySection.firstChild);
  console.log("Container inserted into DOM");

  const videoHeight = getVideoPlayerHeight();
  if (isNoteBoxHidden) {
    const headerHeight = header.offsetHeight;
    container.style.height = `${headerHeight + 32}px`;
  } else if (videoHeight) {
    container.style.height = `${videoHeight}px`;
  }

  container.style.visibility = "visible";
  console.log("Container set to visible");

  chrome.storage.local.get([videoId], (res) => {
    const note = res[videoId];
    if (!note || note.trim() === "") return;
    noteBox.value = note;
  });

  noteBox.addEventListener("input", () => {
    const val = noteBox.value.trim();
    if (val === "") {
      chrome.storage.local.remove(videoId);
    } else {
      chrome.storage.local.set({ [videoId]: noteBox.value });
    }
  });

  toggleBtn.addEventListener("click", () => {
    console.log("Toggle button clicked, isHidden:", noteBox.style.display === "none");
    const isHidden = noteBox.style.display === "none";
    noteBox.style.display = isHidden ? "block" : "none";
    toggleBtn.textContent = isHidden ? "[–]" : "[+]";
    isNoteBoxHidden = !isHidden;

    container.classList.toggle("collapsed", !isHidden);
    if (!isHidden) {
      const headerHeight = header.offsetHeight;
      container.style.height = `${headerHeight + 32}px`;
    } else {
      const videoHeight = getVideoPlayerHeight();
      if (videoHeight) {
        container.style.height = `${videoHeight}px`;
      }
    }
  });

  myNotesBtn.addEventListener("click", () => {
    const existing = document.getElementById("notes-panel");
    if (existing) existing.remove();
    else showNotesPanel();
  });

  const videoPlayer = document.querySelector(".html5-video-player");
  if (videoPlayer) {
    const resizeObserver = new ResizeObserver(() => {
      const newHeight = getVideoPlayerHeight();
      if (newHeight && !isNoteBoxHidden) {
        console.log("ResizeObserver updating height to:", newHeight);
        container.style.height = `${newHeight}px`;
      }
    });
    resizeObserver.observe(videoPlayer);
  }
}

function createGlobalNotesButton() {
  if (document.getElementById("global-notes-btn")) return;

  const btn = document.createElement("button");
  btn.id = "global-notes-btn";
  btn.textContent = "✸ My Notes";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.padding = "10px 16px";
  btn.style.background = "#333";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "8px";
  btn.style.zIndex = "9999";
  btn.style.boxShadow = "0 2px 10px rgba(0,0,0,0.4)";
  btn.style.cursor = "pointer";

  btn.addEventListener("click", () => {
    const existing = document.getElementById("notes-panel");
    if (existing) existing.remove();
    else showNotesPanel();
  });

  document.body.appendChild(btn);
}

function showNotesPanel() {
  const panel = document.createElement("div");
  panel.id = "notes-panel";
  panel.innerHTML = `
    <div id="notes-panel-header">
      ✸ My Notes <span id="close-notes-panel">✖</span>
    </div>
    <div id="notes-list">Loading...</div>
  `;
  document.body.appendChild(panel);

  document.getElementById("close-notes-panel").addEventListener("click", () => {
    panel.remove();
  });

  const listContainer = document.getElementById("notes-list");

  chrome.storage.local.get(null, (data) => {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      listContainer.innerHTML = `<p>No notes yet.</p>`;
      return;
    }

    listContainer.innerHTML = "";
    entries.forEach(([videoId, note]) => {
      if (!note || note.trim() === "") return;
      const item = document.createElement("div");
      item.className = "note-entry";

      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then(res => res.json())
        .then(data => {
          item.innerHTML = `
          <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="note-link">
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" class="thumb" />
            <div class="note-text">
              <strong>${data.title}</strong>
              <em>${data.author_name}</em>
              <span class="note-snippet">${note.substring(0, 100)}...</span>
            </div>
          </a>
        `;
        })
        .catch(() => {
          item.innerHTML = `
            <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="note-link">
              <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" class="thumb" />
              <div class="note-text">
                <strong>Video unavailable</strong><br/>
                ${note.substring(0, 100)}...
              </div>
            </a>
          `;
        });

      listContainer.appendChild(item);
    });
  });
}

function observePageLoad() {
  const observer = new MutationObserver((mutations, observer) => {
    const secondarySection = document.querySelector("#secondary");
    const videoPlayer = document.querySelector(".html5-video-player");
    if (secondarySection && videoPlayer) {
      createOrUpdatePanel();
      createGlobalNotesButton();
      observer.disconnect(); // Stop observing once we've initialized
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", observePageLoad);

  console.log("DOMContentLoaded, starting observer");
  observePageLoad();

  setInterval(() => {
    const isWatchPage = window.location.href.includes("watch?v=");
  
    if (isWatchPage) {
      createOrUpdatePanel();  // Only show notes UI on videos
    } else {
      const existing = document.getElementById("yt-note-container");
      if (existing) existing.remove(); // Clean up stray UI
    }
  
    createGlobalNotesButton(); // Always show this
  }, 2000);
  