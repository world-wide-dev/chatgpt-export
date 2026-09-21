function send(action) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, { action });
  });
}


function sendAwaitResponse(action) {
  return new Promise((resolve) => {

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {

        chrome.tabs.sendMessage(
          tab.id,
          { action },
          (response) => {
            resolve(response);
          }
        );

      }
    );

  });
}


function renderTitleEditor(conversation) {
  const root = document.querySelector("#title-edit-block");

  const overlay = document.createElement('div');

  overlay.id = 'editor-overlay';

  const hr = document.createElement('hr');

  const label = document.createElement('label');
  const textbox = document.createElement('input');

  label.textContent = "Title:";
  label.htmlFor = 'title-editor';
  label.className = 'meta-title-edit';

  textbox.id = 'title-editor';
  textbox.name = 'title-editor';
  textbox.value = conversation.title ?? "";
  textbox.maxLength = 255;

  const TITLE_FORBIDDEN_CHARS = /[\0\r\n\t\\]/;

  textbox.addEventListener(
      "beforeinput",
      event => {

          const text =
              event.data ?? "";

          if (
              TITLE_FORBIDDEN_CHARS.test(text)
          ) {
              event.preventDefault();
          }
      }
  );

  textbox.addEventListener(
      "paste",
      event => {

          const text =
              event.clipboardData.getData(
                  "text"
              );

          if (
              TITLE_FORBIDDEN_CHARS.test(text)
          ) {
              event.preventDefault();
          }
      }
  );

  textbox.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            saveButton.click();
        }
    }
  );

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.onclick = async () => {
    const newTitle = textbox.value.trim();
    
    if (newTitle === "") {
      root.replaceChildren();
      return;
    }

    if (newTitle === conversation.title) {
      root.replaceChildren();
      return;
    }
    
    saveButton.disabled = true;
    cancelButton.disabled = true;
    textbox.disabled = true;

    try {

      console.log({
          ...conversation,
          title: newTitle
        });

      const updatedConversation = await sendAwaitResponse({
        message: "UPDATE_CONVERSATION_META",
        payload: {
          ...conversation,
          title: newTitle
        }
      });

      root.replaceChildren();

      renderConversationMeta(updatedConversation);

    }
    catch (error) {

        console.error(error);

        saveButton.disabled = false;
        cancelButton.disabled = false;
        textbox.disabled = false;
    }
  };

  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.onclick = () => root.replaceChildren();

  const editorButtonsDiv = document.createElement('div');
  editorButtonsDiv.className = 'editor-buttons';

  editorButtonsDiv.append(saveButton, cancelButton);

  overlay.append(
    label,
    textbox,
    editorButtonsDiv,
    hr
  );

  root.replaceChildren(overlay);
  
  textbox.focus();
  textbox.select();
}


function renderConversationMeta(conversation) {

    const root = document.querySelector("#popup-conversation-meta");

    const container = document.createElement("div");

    container.innerHTML = `
<div>
  <p class="meta-title">Conversation Metadata</p>
  <p class="meta-key">Title</p>
  <p class="meta-value meta-value-title">${conversation.title}</p>
  <p class="meta-key">Model</p>
  <p class="meta-value meta-value-model">${conversation.model}</p>
  <p class="meta-key">Conversation ID</p>
  <p class="meta-value meta-value-conversation-id">${conversation.id}</p>
  <p class="meta-key">Last Message ID</p>
  <p class="meta-value meta-value-last-message-id">${conversation.last_message_id}</p>
</div>
<hr/>
`;

    const titleNode = container.querySelector('.meta-value-title');
    titleNode.onclick = () => renderTitleEditor(conversation);

    root.replaceChildren(container);
}


async function popupImportData(file) {
  if (!file) return;

  importingRightNow = true;

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
    importingRightNow = false;
  }
}


function popupInitImporter() {
  const importDrop = document.getElementById('import-drop');
  const importFile = document.getElementById('import-file');

  importDrop.addEventListener('drop', async (event) => {
    event.preventDefault();

    const file = event.dataTransfer.files[0];

    await popupImportData(file); // call respective importData() function 
  });

  importDrop.addEventListener('click', () => {
      importFile.click();
  });

  importFile.addEventListener('change', async () => {
      const file = importFile.files[0];

      importFile.value = '';

      await popupImportData(file); // call respective importData() function
  });
}


let importingRightNow = false;


document.addEventListener("DOMContentLoaded", async () => {
  console.log("[POPUP] loaded");

  document.getElementById("extract").onclick = () => {
    console.log("[POPUP] Clicked Extract Conversation");
    send({ message: "EXTRACT", payload: null });
  };

  document.getElementById("export-md").onclick = () => {
    console.log("[POPUP] Clicked Export MD");
    send({ message: "EXPORT_MD", payload: null });
  };

  document.getElementById("export-html").onclick = () => {
    console.log("[POPUP] Clicked Export HTML");
    send({ message: "EXPORT_HTML", payload: null });
  };

  document.getElementById("export-json").onclick = () => {
    console.log("[POPUP] Clicked Export JSON");
    send({ message: "EXPORT_JSON", payload: null });
  };

  document.getElementById("export-all").onclick = () => {
    console.log("[POPUP] Clicked Export DataBase");
    send({ message: "EXPORT_DB", payload: null });
  };

  document.getElementById("open-full-page").onclick = () => {
    console.log("[POPUP] Clicked Open Full Page");
    chrome.tabs.create({
      url: chrome.runtime.getURL("archive.html")
    });
  };

  // Page loaded - Unlock action buttons
  const block = document.getElementById('page-load-block');


  let attempts = 0;

  async function refreshReadyState() {
    attempts++;

    try {
      const ready = await sendAwaitResponse({
        message: "IS_PAGE_LOADED",
        payload: null
      });

      if (ready) {
        clearInterval(interval);

        block.style.display = "none";

        const conversation = await sendAwaitResponse({
          message: "GET_CURRENT_CONVERSATION",
          payload: null
        });

        renderConversationMeta(conversation);

        return;
      }

    } catch {}

    if (attempts === 100 && !block.dataset.warningShown) {

      block.dataset.warningShown = 'true';

      //clearInterval(interval);

      block.innerHTML = '';

      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        const isConversationPage = /\/c\/|\/g\/.*\/c\//.test(tab?.url ?? '');

        function restoreLoading(wrapperBlock) {
          const div = document.createElement('div');
          div.id = 'page-loading';

          const span = document.createElement('span');
          span.id = 'page-loading-label';
          span.innerText = "Awaiting page load...";

          wrapperBlock.innerHTML = '';
          wrapperBlock.appendChild(div);
          wrapperBlock.appendChild(span);
          delete wrapperBlock.dataset.warningShown;
        }

        if (isConversationPage) {

          const div = document.createElement('div');
          div.className = 'popup-warning';

          const span = document.createElement('span');
          span.innerText = "Page appears stalled or extension was reloaded.\n\nRefresh page?";

          const refreshBtn = document.createElement('button');
          refreshBtn.innerText = "Refresh page";
          refreshBtn.onclick = () => {
            refreshBtn.remove();
            restoreLoading(block);
            chrome.tabs.reload(tab.id);
          };

          div.appendChild(span);
          div.appendChild(refreshBtn);

          block.appendChild(div);

        } else {

          const div = document.createElement('div');
          div.className = 'popup-warning';

          const span = document.createElement('span');
          span.innerText = "Open a ChatGPT conversation page first.";
          span.style.color = "red";

          div.appendChild(span);    
          
          block.appendChild(div);
        }
      });

    }

  }
  
  const interval = setInterval(refreshReadyState, 100);

  popupInitImporter();

  let blockerVisible = false;

  setInterval(async () => {
    const extracting = await sendAwaitResponse({
      message: "GET_EXTRACTION_STATE"
    });

    const importing = importingRightNow;

    if (!blockerVisible && extracting) {
      showBlocker(createExtractBlockerUI());
      blockerVisible = true;
      return;
    }

    if (!blockerVisible && importing) {
      showBlocker(createImportBlockerUI());
      blockerVisible = true;
      return;
    }

    if (blockerVisible && !extracting && !importing) {
      hideBlocker();
      blockerVisible = false;
    }
  }, 250);
});


