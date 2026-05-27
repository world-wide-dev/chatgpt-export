// Database functions

const DB_NAME = "chatgpt-export";
const DB_VERSION = 1;

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


const dbPromise = initDB();


async function saveConversation(conversation) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("conversations", "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore("conversations");

    const request = store.put(conversation);

    console.log("[SAVE] conversation saved", conversation.id);

    //request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}


async function saveMessage(message) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore("messages");

    const request = store.put(message);

    console.log("[SAVE] message saved", message.id);

    //request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}


async function saveImage(image) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("images", "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore("images");

    const req = store.put(image);

    console.log("[SAVE] image saved", image.id);

    //req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}


async function getConversationById(id) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("conversations", "readonly");
    const store = tx.objectStore("conversations");

    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


async function getStore(storeName) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


async function dumpDB() {
  const db = await dbPromise;

  const conversations = await getStore("conversations");
  const messages = await getStore("messages");

  let images = [];
  if (db.objectStoreNames.contains("images")) {
    images = await getStore("images");
  }

  return {
    conversations,
    messages,
    images
  };
}


async function getImageByHash(hash) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("images", "readonly");
    const store = tx.objectStore("images");
    const index = store.index("hash");

    const req = index.get(hash);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}


async function getConversationMessages(convoId) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readonly");

    const store = tx.objectStore("messages");
    const index = store.index("conversation_id");

    const req = index.getAll(convoId);

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}


async function getImagesById(imageIds = []) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("images", "readonly");
    const store = tx.objectStore("images");

    const promises = imageIds.map(imageId => {
      return new Promise((res, rej) => {
        const req = store.get(imageId);

        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
      });
    });

    Promise.all(promises)
      .then(images => resolve(images.filter(Boolean)))
      .catch(reject);
  });
}


async function getImageById(id) {
  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("images", "readonly");
    const store = tx.objectStore("images");

    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


async function removeConversationMessages(convoId /* = conversationId */) {
  requireComponent(convoId, '[Database] removeConversationMessages(): missing conversation ID');

  const db = await dbPromise;

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


