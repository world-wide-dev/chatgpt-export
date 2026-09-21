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


// Remove conversation by id
// NOT DOUBLE CHECKED & NOT TESTED!!
(async () => {
  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("conversations")) {
          db.createObjectStore("conversations", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("messages")) {
          const store = db.createObjectStore("messages", { keyPath: "id" });
          store.createIndex("conversation_id", "conversation_id", { unique: false });
        }

        if (!db.objectStoreNames.contains("images")) {
          const store = db.createObjectStore("images", { keyPath: "id" });
          store.createIndex("hash", "hash", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  const dbPromiseDirect = initDB();

  async function removeConversationMessages(convoId /* = conversationId */) {
    requireComponent(convoId, '[Database] removeConversationMessages(): missing conversation ID');

    const db = await dbPromiseDirect;

    console.log(convoId);

    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');

    const index = store.index('conversation_id');
    const range = IDBKeyRange.only(convoId);

    return new Promise((resolve, reject) => {
      let deleted = 0;

      const request = index.openCursor(range);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (!cursor) {
          resolve(deleted);
          return;
        }

        cursor.delete();
        deleted += 1;

        cursor.continue();
      };

      tx.oncomplete = () => {
        console.log(`Deleted from ${convoId}:`, deleted);
        resolve(deleted);
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  }

  await removeConversationMessages(convoId);
})();


