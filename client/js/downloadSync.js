async function download(filename, fileId, parentDiv) {
  try {
    showLoading();

    const response = await fetch(`/api/drive/download?fileId=${fileId}`);
    if (!response.ok) {
      showMessage(await response.text());
      return;
    }

    // Create the blob URL
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const changeToken = response.headers.get("Change-Token");

    // Create a clickable element and download the data
    const a = document.createElement("a");
    a.href = url;
    a.download = !changeToken ? filename : `${filename}.zip`;
    document.body.appendChild(a);

    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    // sync the downloaded folders
    if (!changeToken) return;

    const syncBtn = parentDiv.querySelector(".btn.sync");
    syncBtn.style.display = "block";

    setSyncItem(fileId, changeToken, syncBtn);
  } catch (error) {
    console.error("Download function:", error);
  } finally {
    showLoading(false);
  }
}

async function syncFolder(token, folderId, btn) {
  try {
    showLoading();

    const params = `changeToken=${token}&folderId=${folderId}`;
    const changes = await fetch(`/api/drive/search-changes?${params}`);

    const data = await changes.json();
    if (data.changes === 0) {
      showMessage(data.message);
      return;
    }

    if (confirm(`${data.message} \nSync to file system?`)) {
      const response = await fetch(`/api/drive/sync?${params}`);

      if (response.ok) {
        // new token for the next change review
        const changeToken = response.headers.get("Change-Token");
        if (!changeToken) return;

        setSyncItem(folderId, changeToken, btn);
      }

      showMessage(await response.text());
    }
  } catch (error) {
    console.error("Sync function:", error.message);
  } finally {
    showLoading(false);
  }
}

function setSyncItem(folderId, token, btn) {
  var syncData = localStorage.getItem("sync-folders") || "[]";
  syncData = JSON.parse(syncData);

  // update if data in localstorage
  var idxDup = syncData.findIndex((item) => item.id === folderId);
  if (idxDup !== -1) {
    syncData[idxDup].token = token;
  } else {
    syncData.push({
      id: folderId,
      token: token,
    });
  }

  localStorage.setItem("sync-folders", JSON.stringify(syncData));
  btn.setAttribute("onclick", `syncFolder('${token}', '${folderId}', this)`);
}
