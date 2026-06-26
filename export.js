// Export functions

const turndownService = new TurndownService({
  codeBlockStyle: "fenced"
});

turndownService.addRule(
  "fencedCodeBlock",
  {
    filter(node) {
      return (
        node.nodeName === "PRE" &&
        node.firstElementChild?.nodeName === "CODE"
      );
    },

    replacement(content, node) {
      const code =
        node.firstElementChild;

      const language =
        code.className
          ?.match(/language-(\w+)/)
          ?.[1] ?? "";

      return (
        "\n\n```" +
        language +
        "\n" +
        code.textContent.trimEnd() +
        "\n```\n\n"
      );
    }
  }
);


function base64ToBlob(base64, mime = "image/png") {
  if (!base64) {  
    console.warn("Empty base64");  
    return null;  
  }  
  
  const binary = atob(base64);  
  const len = binary.length;  
  const bytes = new Uint8Array(len);  
  
  for (let i = 0; i < len; i++) {  
    bytes[i] = binary.charCodeAt(i);  
  }

  return new Blob([bytes], { type: mime });
}
  
  
async function downloadDBDump() {
  const dump = await dumpDB();
  const content = JSON.stringify(dump, null, 2);

  const filenameTime = formatTimestamp(Date.now());

  downloadFile(
    `chatgpt-export_${filenameTime}.json`, 
    content, 
    "application/json"
  );
}


async function downloadJSON() {
  const conversation =
    await getConversationById(conversationId);

  const messages =
    await getConversationMessages(conversationId);

  messages.sort((a, b) => a.index - b.index);

  const imagesMap = new Map();

  for (const message of messages) {
    const messageImages =
      await getImagesById(message.image_ids);

    for (const image of messageImages) {
      imagesMap.set(image.id, image);
    }
  }

  const images = [...imagesMap.values()];

  const conversationDump = JSON.stringify({
    conversation,
    messages,
    images
  }, null, 2);

  const filename =
  normalizeConversationTitle(conversation.title);

  downloadFile(
    filename + ".json",
    conversationDump,
    "application/json"
  );
}


async function handleImagesInClonedDOM(div) {
  const imgs = div.querySelectorAll("img");

  for (const img of imgs) {
    if (img.dataset.imageFailed === "true") {
      continue;
    }
    
    const imageId = img.dataset.imageId;

    if (!imageId) {
      continue;
    }

    const image = await getImageById(imageId);

    if (!image) {
      continue;
    }

    img.src = `data:${image.mime};base64,${image.data_base64}`;

  img.removeAttribute("data-image-id");
  img.removeAttribute("data-image-hash");
  }
}


const exportCSS = `<style>
* {
  box-sizing: border-box;
}

body {
  background: #171717;
  color: #e5e5e5;
  line-height: 1.5;
  font-family: system-ui, sans-serif;
}

#thread {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.message {
  margin-bottom: 2rem;
}

.message.assistant {
  width: 100%;
}

.message.user {
  width: 75%;
  margin-left: auto;

  background: #212121;
  border-radius: 1rem;

  padding: 1rem;
}

.content {
  overflow-wrap: break-word;
}

pre {
  overflow-x: auto;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #111;
}

pre,
code {
  line-height: 1.2;
}

img {
  display: block;
  max-width: 100%;
  max-height: 400px;
  border-radius: 12px;
  width: auto;
  height: auto;
}
  
.gallery img,
.non-gallery img {
  height: auto;
}
  
.gallery, .shopping-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  margin: 1rem 0;
}

.shopping-gallery {
  gap: 2rem;
}

.shopping-gallery .shopping-card {
  max-width: 240px;
}

.gallery img {
  max-width: 240px;
  border-radius: 0.75rem;

  display: block;
}

.non-gallery {
  margin: 1rem 0;
}

.non-gallery img {
  max-width: 100%;
  border-radius: 0.75rem;

  display: block;
}

@media screen and (max-width: 768px) {
  #thread {
    padding: 1rem;
  }

  img {
    max-width: 100%;
    height: auto;
  }
}

@media print {
  body {
    background-color: #fff;
    color: #000;
  }

  .message.user {
    width: 100%;
  }

  pre,
  code {
    white-space: pre-wrap;
    word-break: break-word;
    overflow: visible;
  }

  .conversation-meta ul {
    list-style: none;
    padding: 0;
    margin: 0;
    opacity: 0.8;
    font-size: 0.95rem;
  }

  .conversation-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
}
</style>`;


function buildHTMLDocument(title, meta, bodyHTML) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<div class="conversation-meta">
  <ul>
    <li class="conversation-title">${title}</li>
    <li>Exported: ${meta.exported_at}</li>
    <li>Messages: ${meta.messageCount}</li>
    <li>Conversation ID: ${meta.conversationId}</li>
    <li>Exporter: ${meta.exporterString}</li>
  </ul>
</div>

${exportCSS}

</head>
<body>

<div id="thread">
${bodyHTML}
</div>

</body>
</html>
`;
}


async function downloadHTML() { 
  const conversation = await getConversationById(conversationId); 

  const messages = await getConversationMessages(conversationId); 

  messages.sort((a, b) => a.index - b.index); 

  let html = "";

  for (const message of messages) {

    const div = document.createElement("div");

    div.innerHTML = message.content_html;

    await handleImagesInClonedDOM(div);

    html += `
  <article class="message ${message.role}"><div class="content">
    ${div.innerHTML}
  </div></article>
`;
  }

  const exported_at = formatTimestamp(Date.now());
  const messageCount = messages.length;  
  const exporterString = `ChatGPT Export v${EXPORTER_VERSION}`;

  const meta = {
    exported_at,
    messageCount,
    conversationId,
    exporterString
  }

  const finalHTML =
  buildHTMLDocument(conversation.title, meta, html);

  const filename =
  normalizeConversationTitle(conversation.title);

  downloadFile( 
    filename + ".html",
    finalHTML, 
    "text/html" ); 
} 


function handleImageForMarkdown(img, image) {
  const ext =
    image.mime?.split("/")[1] || "png";

  const filename =
    `${image.hash}.${ext}`;

  const path = `images/${filename}`;

  img.src = path;

  return {
    zipFile: path,

    zipBlob: 
      base64ToBlob(
        image.data_base64,
        image.mime
      )
  };
}


async function downloadMarkdown() { 
  const conversation = await getConversationById(conversationId); 

  const messages = await getConversationMessages(conversationId); 

  messages.sort((a, b) => a.index - b.index); 

  const exported_at = formatTimestamp(Date.now());
  const messageCount = messages.length;  
  const exporterString = `ChatGPT Export v${EXPORTER_VERSION}`;

  let markdown = `
# ${conversation.title}

- Exported: ${exported_at}
- Messages: ${messageCount}
- Conversation ID: ${conversationId}
- Exporter: ${exporterString}

`;

  const zip = new JSZip();

  for (const message of messages) {

    const div = document.createElement("div");

    div.innerHTML = message.content_html;

    for (const img of div.querySelectorAll('img')) {
      if (img.dataset.imageFailed === "true") {
        continue;
      }
    
      const image =
      await getImageById(
        img.dataset.imageId
      );

      const {
        zipFile,
        zipBlob
      } = handleImageForMarkdown(
        img,
        image
      );

      zip.file(zipFile, zipBlob);
    }

    markdown += 
      `**${message.role}**\n\n` + 
      turndownService.turndown(div) 
      + "\n\n";
  }

  const finalMD = markdown;

  const filename =
  normalizeConversationTitle(conversation.title);

  zip.file(
    filename + ".md",
    new Blob([finalMD], { type: "text/markdown"})
  );

  const exportBlob = await zip.generateAsync({ type: "blob" });

  downloadFile( 
    filename + ".zip",
    exportBlob, 
    "application/zip" ); 
}


