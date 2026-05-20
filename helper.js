// Helper functions

const EXPORTER_VERSION = "1.0.1";
  

let conversationId = null;

function setConversationId(id) {
  conversationId = id;
}


let isPageLoaded = false;

function setPageLoaded(loaded = false) {
  isPageLoaded = loaded;
}


async function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );
}


async function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "instant"
  });

  await sleep(50);
}


async function hydrateElement(element) {
  element.scrollIntoView({
    block: "start",
    behavior: "auto"
  });

  await sleep(50);

  element.scrollIntoView({
    block: "end",
    behavior: "smooth"
  });

  await sleep(250);
}


function stopObserver() {
  /*
  if (observer) {
  observer.disconnect();
  observer = null;
  }

  if (debounceTimer != null) {
  clearTimeout(debounceTimer);
  debounceTimer = null;
  }

  extractionRunning = false;
  */
}


function startObserver() {

}


function restartObserver() {

}


// Get conversation ID from URL
function extractConversationId() {
  const id =
    location.pathname.split("/c/")[1];

  return id
    ? id.split("?")[0]
    : null;
}


// UI change detection
function requireComponent(component, msg) {
  if (component == null) throw new Error(msg);
  return component;
}


// Download (any) file (anywhere)
function downloadFile(
  filename,
  content,
  mimeType = "application/octet-stream"
) {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);

  a.click();
  a.remove();

  // Delay revoke slightly so browser finishes reading blob
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


function formatTimestamp(timestamp = Date.now()) {
  const d = new Date(timestamp);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-") + "-" + [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0")
  ].join("-");
}


function normalizeConversationTitle(conversationTitle = document.title) {
  const normalized = conversationTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "conversation";
}


// UUIDv7 generation
let lastTs = 0n;
let seq = 0n;

function uuidv7() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let now = BigInt(Date.now());

  if (now === lastTs) {
    seq++;
  } else {
    lastTs = now;
    seq = 0n;
  }

  // 48-bit timestamp
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);

  // inject sequence into randomness (low bits)
  bytes[15] = Number((bytes[15] + Number(seq & 0xffn)) & 0xff);

  // version + variant
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0'));

  return (
    hex.slice(0, 4).join('') + '-' +
    hex.slice(4, 6).join('') + '-' +
    hex.slice(6, 8).join('') + '-' +
    hex.slice(8, 10).join('') + '-' +
    hex.slice(10, 16).join('')
  );
}


