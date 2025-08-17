const statusDiv = document.querySelector(".status-message");
const setupSteps = document.querySelector(".setup-steps");

function showMessage(message) {
  statusDiv.querySelector("p").innerHTML = message;
  statusDiv.style.display = "flex";
}
function hideMessage() {
  statusDiv.style.display = "none";
}

function showSetup() {
  var currStyle = setupSteps.style.display;
  setupSteps.style.display = currStyle == "none" ? "block" : "none";
}

function showLoading(show = true) {
  document.querySelector(".loading").style.display = show ? "block" : "none";
}
async function showDefaultFiles() {
  var defaultFolders = localStorage.getItem("default-folders") || "[]";
  defaultFolders = JSON.parse(defaultFolders);
  if (defaultFolders.length === 0) return;

  try {
    showLoading();

    const encodedJson = encodeURIComponent(JSON.stringify(defaultFolders));

    const response = await fetch(
      `/api/drive/get-folders?folders=${encodedJson}`
    );
    const data = await response.json();

    const folderGrid = filesSection.querySelector(".files-grid");
    data.forEach((folder) => {
      folderGrid.innerHTML += createFolderCard(folder);
    });
  } catch (error) {
    console.error("Default folders:", error);
  } finally {
    showLoading(false);
  }
}

function setDefaultFolders() {
  const input = document.getElementById("defaultFolders");
  const inputValue = input.value;

  if (input.style.display === "block") {
    if (inputValue.length === 0 || inputValue === " ") {
      showMessage("Enter a valid folder");
      return;
    }

    var defaultFolders = localStorage.getItem("default-folders") || "[]";
    defaultFolders = JSON.parse(defaultFolders);

    if (defaultFolders.length >= 5) {
      showMessage("Maximum folders 5");
      return;
    }

    if (defaultFolders.findIndex((item) => item === inputValue) !== -1) return;

    defaultFolders.push(inputValue);
    localStorage.setItem("default-folders", JSON.stringify(defaultFolders));

    window.location.reload();
  } else {
    input.style.display = "block";
  }
}

function checkActivity() {
  // wait 15 minutes, if visibility changes to hidden logout
  setTimeout(async () => {
    if (document.visibilityState === "hidden") {
      var session = await fetch("/api/auth/log-out", { method: "POST" });

      window.location.reload();
      showMessage(await session.text());
    } else {
      var session = await fetch("/api/auth/update", { method: "PUT" });
    }
  }, 900 * 1000);
}
