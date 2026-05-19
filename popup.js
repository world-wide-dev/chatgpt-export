function send(action) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, { action });
  });
}


document.addEventListener("DOMContentLoaded", () => {
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
});


