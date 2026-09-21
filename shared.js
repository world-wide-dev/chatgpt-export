const fullPageBlocker = document.getElementById('full-page-blocker');

const blockerInnerWrapper = document.getElementById('blocker-inner-wrapper');

function showBlocker(blockerContent) {
  fullPageBlocker.style.zIndex = 9999;
  blockerInnerWrapper.replaceChildren(blockerContent);
}

function hideBlocker() {
  fullPageBlocker.style.zIndex = -9999;
  blockerInnerWrapper.replaceChildren();
}


async function parseAndValidate(file) {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!Array.isArray(data.conversations)) {
      throw new Error("Invalid database format");
    }
    if (!Array.isArray(data.messages)) {
      throw new Error("Invalid database format");
    }
    if (!Array.isArray(data.images)) {
      throw new Error("Invalid database format");
    }

    return data;
}


async function clearDatabase() {
  const userReadyToNukeDB = confirm('Current database will be erased. Make sure to export all data first.');

  if (!userReadyToNukeDB) {
    return false;
  }

  await clearStore("images");
  await clearStore("messages");
  await clearStore("conversations");

  return true;
}

async function saveImportedData(data, options) {
  if (options.overwrite) {
    await floodStorePut("conversations", data.conversations);
    await floodStorePut("messages", data.messages);
    await floodStorePut("images", data.images);
  }

  else {
    await floodStoreAdd("conversations", data.conversations);
    await floodStoreAdd("messages", data.messages);
    await floodStoreAdd("images", data.images);
  }

  return true;
}


async function importData(file) {
  if (!file) return;

  // create blocker UI
  const blockerUI = document.createElement('div');

  const status = document.createElement('p');
  status.textContent = 'Importing database...';

  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = 0;

  blockerUI.append(status, progress);

  showBlocker(blockerUI);

  try {
    const data = await parseAndValidate(file);

    const selectedMode = document.querySelector('input[name="import-mode"]:checked')?.value;

    if (!selectedMode) return;

    switch (selectedMode) {
      case 'add':
        await saveImportedData(data, {
          overwrite: false
        });
        break;

      case 'overwrite':
        await saveImportedData(data, {
          overwrite: true
        });
        break;

      case 'replace':
        if(await clearDatabase()) {

          // If cancelled, don't continue.
          // Otherwise import with whatever overwrite value.
          await saveImportedData(data, {
            overwrite: true
          });
        }
        break;
    }
  }
  catch (error) {
    alert("Invalid database file.");
    return;
  }
  finally {
    hideBlocker();
  }
}


function initImporter() {
  const importDrop = document.getElementById('import-drop');
  const importFile = document.getElementById('import-file');

  importDrop.addEventListener('drop', async (event) => {
    event.preventDefault();

    const file = event.dataTransfer.files[0];

    await importData(file);
  });

  importDrop.addEventListener('click', () => {
      importFile.click();
  });

  importFile.addEventListener('change', async () => {
      const file = importFile.files[0];

      importFile.value = '';

      await importData(file);
  });
}


function createExtractBlockerUI() {
  // create extract blocker UI
  const blockerUI = document.createElement('div');

  const status = document.createElement('p');
  status.textContent = 'Extracting page contents...';

  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = 0;

  blockerUI.append(status, progress);
    
  return blockerUI;
}

function createImportBlockerUI() {
  // create import blocker UI
  const blockerUI = document.createElement('div');

  const status = document.createElement('p');
  status.textContent = 'Importing database...';

  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = 0;

  blockerUI.append(status, progress);
    
  return blockerUI;
}


