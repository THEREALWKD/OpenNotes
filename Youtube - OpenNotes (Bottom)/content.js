let currentVideoId = null;

function getVideoId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("v");
}

function createOrUpdatePanel() {
  const commentSection = document.querySelector("#comments");
  if (!commentSection) return;

  let container = document.getElementById("yt-note-container");
  const videoId = getVideoId();

  if (currentVideoId === videoId && container) return;

  currentVideoId = videoId;

  if (container) container.remove();

  container = document.createElement("div");
  container.id = "yt-note-container";

  // === Header ===
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
  toggleBtn.textContent = "[–]";
  leftButtons.appendChild(toggleBtn);

  header.innerHTML = `<span>📌 Make a Note</span>`;
  header.appendChild(leftButtons);

  container.appendChild(header);

  // === Textarea ===
  const noteBox = document.createElement("textarea");
  noteBox.id = "yt-note-box";
  noteBox.placeholder = "Write your thoughts...";
  container.appendChild(noteBox);

  commentSection.parentNode.insertBefore(container, commentSection);

  // Load note
  chrome.storage.local.get([videoId], (res) => {
    const note = res[videoId];
    if (!note || note.trim() === "") return; // Skip Empty Note
    noteBox.value = note;
  });

  // Save note
  noteBox.addEventListener("input", () => {
    const val = noteBox.value.trim();
    if (val === "") {
      chrome.storage.local.remove(videoId);
    } else {
      chrome.storage.local.set({ [videoId]: noteBox.value });
    }
  });

  // Toggle textarea
  toggleBtn.addEventListener("click", () => {
    const isHidden = noteBox.style.display === "none";
    noteBox.style.display = isHidden ? "block" : "none";
    toggleBtn.textContent = isHidden ? "[–]" : "[+]";
  });

  // Open side panel
  myNotesBtn.addEventListener("click", () => {
    const existing = document.getElementById("notes-panel");
    if (existing) existing.remove();
    else showNotesPanel();
  });
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

      // Fetch title + channel name from oEmbed API
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
          // fallback if fetch fails
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

setInterval(() => {
  createOrUpdatePanel();
  createGlobalNotesButton();
}, 2000);

createOrUpdatePanel();


