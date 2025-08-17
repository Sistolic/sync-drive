const filesSection = document.querySelector(".files-section");
const loading = document.querySelector(".loading");

async function addFolder(parent, folderId, folderName) {
  try {
    const cardElement = parent.parentElement;

    // don't request the files
    if (cardElement.classList.contains("active")) {
      return;
    }
    showLoading();

    cardElement.classList.add("active");
    const childsOn = cardElement.parentElement.children;

    // hide childs except active
    for (let i = 0; i < childsOn.length; i++) {
      if (!childsOn[i].classList.contains("active")) {
        childsOn[i].style.display = "none";
      }
    }

    // request the data
    const response = await fetch(`/api/drive/get-files?folderId=${folderId}`);
    if (!response.ok) {
      showMessage(await response.text());
      return;
    }

    const data = await response.json();

    // Create the grid for the files
    const childGrid = document.createElement("div");
    childGrid.classList.add("files-grid");

    var last = document.querySelectorAll("h2");
    const header = document.createElement("div");

    // Header div
    header.classList.add("files-header");
    header.innerHTML = `
      <h2>${last[last.length - 1].innerText}${folderName}/</h2>
      <span class="remove" onclick="removeFolder(this.parentNode)">
        &times;
      </span>
    `;

    filesSection.appendChild(header);

    if (data.length === 0) {
      const noData = document.createElement("p");
      noData.classList.add("no-data");
      noData.innerHTML = "There are not files in this folder";

      filesSection.appendChild(noData);
    } else {
      data.forEach((file, idx) => {
        if (file.isPreviewable) {
          childGrid.innerHTML += createFileCard(file);
        } else {
          childGrid.innerHTML += createFolderCard(file);
        }

        // show only the first 10 items
        if (idx >= 10) childGrid.children[idx].classList.add("hidden");
      });
    }

    if (data.length > 10) {
      childGrid.innerHTML += `
        <button class="view-all-btn" onclick="showAll(this.parentNode)">
          View all files
        </button>
      `;
    }

    filesSection.appendChild(childGrid);
  } catch (error) {
    console.error(error.message);
  } finally {
    showLoading(false);
  }
}
function removeFolder(parent) {
  // Remove the active class to the card and display the others
  const gridChilds = parent.previousElementSibling.children;

  for (let i = 0; i < gridChilds.length; i++) {
    if (gridChilds[i].classList.contains("active")) {
      gridChilds[i].classList.remove("active");
      continue;
    }

    gridChilds[i].style.display = "flex";
  }

  filesSection.removeChild(parent.nextElementSibling);
  filesSection.removeChild(parent);
}
function showAll(filesGrid) {
  const childrens = Array.from(filesGrid.children);

  const idx = childrens.findIndex((item) => item.classList.contains("hidden"));
  for (let i = idx; i < childrens.length; i++) {
    if (childrens[i].classList.contains("view-all-btn")) {
      childrens[i].style.display = "none";
      continue;
    }
    childrens[i].classList.remove("hidden");
  }
}

function createFolderCard(file) {
  const token = checkItem(file.id);
  const params = `style="display: block" onclick="syncFolder('${token}', '${file.id}', this)"`;

  return `
    <div class="file-card">
      <h3 class="file-name">
        <span class="file-icon">📁</span> ${file.name}
      </h3>
      
      <div class="actions-buttons">
        <button class="btn" onclick="download('${file.name}',
          '${file.id}', this.parentNode)">
          ⬇️ Download
        </button>
        <button class="btn" onclick="addFolder(this.parentNode, '${file.id}',
          '${file.name}')">
          📄 Check files
        </button>
        <button class="btn sync" ${token ? params : ""}>
          ⤵️ Sync 
        </button>
      </div>
    </div>
    `;
}
function createFileCard(file) {
  return `
    <div class="file-card">
      <p class="file-name"><span class="file-icon">📄</span> ${file.name}</p>

      <div class="actions-buttons">
        <button class="btn" onclick="download('${file.name}', '${file.id}')">
          ⬇️ Download
        </button>
      </div>
    </div>
    `;
}

function checkItem(folderId) {
  var syncData = localStorage.getItem("sync-folders") || "[]";
  syncData = JSON.parse(syncData);

  const found = syncData.find((item) => item.id === folderId);
  return found ? found.token : null;
}
