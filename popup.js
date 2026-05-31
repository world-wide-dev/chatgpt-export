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


document.addEventListener("DOMContentLoaded", async () => {
  console.log("[POPUP] loaded");

  document.getElementById("extract").onclick = () => {
    console.log("[POPUP] Clicked Extract Conversation");
    send("EXTRACT");
  };

  document.getElementById("export-md").onclick = () => {
    console.log("[POPUP] Clicked Export MD");
    send("EXPORT_MD");
  };

  document.getElementById("export-html").onclick = () => {
    console.log("[POPUP] Clicked Export HTML");
    send("EXPORT_HTML");
  };

  document.getElementById("export-json").onclick = () => {
    console.log("[POPUP] Clicked Export JSON");
    send("EXPORT_JSON");
  };

  document.getElementById("export-all").onclick = () => {
    console.log("[POPUP] Clicked Export DataBase");
    send("EXPORT_DB");
  };

  // Page loaded - Unlock action buttons
  const block = document.getElementById('page-load-block');


  let attempts = 0;

  async function refreshReadyState() {
    attempts++;

    try {
      const ready = await sendAwaitResponse("IS_PAGE_LOADED");

      if (ready) {
        clearInterval(interval);

        block.style.display = "none";

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
});


