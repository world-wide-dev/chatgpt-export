chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FETCH_IMAGE") {
    fetch(msg.src)
      .then(res => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result || "";
          sendResponse({
            base64: result.split('base64,')[1] ?? null,
            mime: blob.type
          });
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => {
        console.warn("[BG FETCH FAIL]", msg.src, err);
        sendResponse({ base64: null, mime: null });
      });

    return true; // REQUIRED (keeps channel open)
  }
});


