// Check IndexedDB message entry count
(async () => {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open("chatgpt-export");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  const tx = db.transaction("messages", "readonly");
  const store = tx.objectStore("messages");

  const count = await new Promise((res, rej) => {
    const req = store.count();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  console.log("messages:", count);
})();


// Check IndexedDB message entry count - ALT: per conversation
(async () => {
  const convoId = location.pathname.split("/c/")[1];

  const db = await new Promise((res, rej) => {
    const req = indexedDB.open("chatgpt-export");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  const tx = db.transaction("messages", "readonly");
  const store = tx.objectStore("messages");

  const all = await new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  console.log(
    "messages for convo:",
    all.filter(m => m.conversation_id === convoId).length
  );
})();


