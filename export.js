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


async function downloadJSON(convoId = conversationId) {
  const conversation =
    await getConversationById(convoId);

  const messages =
    await getConversationMessages(convoId);

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
  position: relative;
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

.writing-block {
  margin: 1rem 0;

  background: #111;
  border-radius: 0.75rem;

  overflow: hidden;
}

.writing-header {
  padding: 1rem;

  border-bottom: 1px solid #333;
}

.writing-header > div:not(:last-child) {
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;

  border-bottom: 1px solid #2a2a2a;
}

.writing-to,
.writing-cc,
.writing-bcc,
.writing-subject {
  overflow: hidden;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.writing-body {
  padding: 1rem;
}

.writing-content {
  overflow-wrap: break-word;
}

.writing-block-placeholder {
  font-style: italic;
  opacity: 0.8;
}

.writing-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;

  padding: 0.75rem 1rem;

  border-top: 1px solid #333;
}

.writing-action-button {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 2.25rem;
  height: 2.25rem;

  padding: 0;
  margin: 0;

  background: transparent;
  border: none;
  border-radius: 0.5rem;

  color: inherit;
  text-decoration: none;

  opacity: .5;
  cursor: pointer;

  transition: opacity .15s ease;
}

.writing-action-button:hover {
  opacity: .8;
}

.writing-action-button svg {
  width: 1.2rem;
  height: 1.2rem;

  display: block;
}

.copy-code {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.copy-code-button {
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  margin: 0;

  background: transparent;
  border: none;

  color: inherit;

  opacity: .5;
  cursor: pointer;

  transition: opacity .15s ease;
}

.copy-code-button:hover {
  opacity: .8;
}

.copy-code-button svg {
  width: 1.2rem;
  height: 1.2rem;

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
    <li>Conversation ID: ${meta.convoId}</li>
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


function makePreCodeInteractive(messageContent, { copySvg }) {

  const blocks = messageContent.querySelectorAll('pre');

  for (const block of blocks) {

    const copyCodeWrapper = document.createElement('div');
    copyCodeWrapper.className = 'copy-code';

    const copyCodeButton = document.createElement('button');
    copyCodeButton.className = 'copy-code-button';
    copyCodeButton.title = 'Copy';
    copyCodeButton.innerHTML = copySvg;
    copyCodeButton.setAttribute("onclick", `navigator.clipboard.writeText(this.closest('pre').querySelector('code').textContent)`);

    copyCodeWrapper.appendChild(copyCodeButton);
    block.appendChild(copyCodeWrapper);

  }

}


/*
function buildMailto(writingBlock) {

  const to = writingBlock.querySelector('.writing-to')?.textContent?.trim();
  const cc = writingBlock.querySelector('.writing-cc')?.textContent?.trim();
  const bcc = writingBlock.querySelector('.writing-bcc')?.textContent?.trim();
  const subject = writingBlock.querySelector('.writing-subject')?.textContent?.trim();
  const body = writingBlock.querySelector('.writing-content')?.textContent?.trim();

  let mailto = 'mailto:';

  if (to) {
    mailto += encodeURIComponent(to);
  }

  const params = [];

  if (cc) {
    params.push(`cc=${encodeURIComponent(cc)}`);
  }

  if (bcc) {
    params.push(`bcc=${encodeURIComponent(bcc)}`);
  }

  if (subject) {
    params.push(`subject=${encodeURIComponent(subject)}`);
  }

  if (body) {
    params.push(`body=${encodeURIComponent(body)}`);
  }

  if (params.length) {
    mailto += `?${params.join("&")}`;
  }

  return mailto;

}


function makeWritingInteractive (messageContent, { copySvg, sendSvg }) {

  const blocks = messageContent.querySelectorAll('.writing-block');

  for (const block of blocks) {

    // copy writing block
    const writingActions = document.createElement('div');
    writingActions.className = 'writing-actions';

    const copyWritingButton = document.createElement('button');
    copyWritingButton.className = 'writing-action-button';
    copyWritingButton.title = 'Copy';
    copyWritingButton.innerHTML = copySvg;
    copyWritingButton.setAttribute("onclick", `navigator.clipboard.writeText(this.closest('.writing-block').querySelector('.writing-content').textContent)`);

    writingActions.appendChild(copyWritingButton);

    if (!block.querySelector('.writing-to, .writing-cc, .writing-bcc')) {
      block.appendChild(writingActions);
      continue;
    }

    // mailto if email
    const mailButton = document.createElement("a");

    mailButton.className = "writing-action-button";
    mailButton.title = "Open in mail client";

    mailButton.href = buildMailto(block);

    mailButton.innerHTML = sendSvg;

    writingActions.appendChild(mailButton);

    // attach writing actions wrapper
    block.appendChild(writingActions);

  }

}
*/


function makeWritingInteractiveVersionNone(writingBlock, { copySvg, sendSvg }) {

  function buildMailto() {

    const to = writingBlock.querySelector('.writing-to')?.textContent?.trim();
    const cc = writingBlock.querySelector('.writing-cc')?.textContent?.trim();
    const bcc = writingBlock.querySelector('.writing-bcc')?.textContent?.trim();
    const subject = writingBlock.querySelector('.writing-subject')?.textContent?.trim();
    const body = writingBlock.querySelector('.writing-content')?.textContent?.trim();

    let mailto = 'mailto:';

    if (to) {
      mailto += encodeURIComponent(to);
    }

    const params = [];

    if (cc) {
      params.push(`cc=${encodeURIComponent(cc)}`);
    }

    if (bcc) {
      params.push(`bcc=${encodeURIComponent(bcc)}`);
    }

    if (subject) {
      params.push(`subject=${encodeURIComponent(subject)}`);
    }

    if (body) {
      params.push(`body=${encodeURIComponent(body)}`);
    }

    if (params.length) {
      mailto += `?${params.join("&")}`;
    }

    return mailto;

  }

  // copy writing block
  const writingActions = document.createElement('div');
  writingActions.className = 'writing-actions';

  const copyWritingButton = document.createElement('button');
  copyWritingButton.className = 'writing-action-button';
  copyWritingButton.title = 'Copy';
  copyWritingButton.innerHTML = copySvg;
  copyWritingButton.setAttribute(
    "onclick",
    `navigator.clipboard.writeText(this.closest('.writing-block').querySelector('.writing-content').textContent)`
  );

  writingActions.appendChild(copyWritingButton);

  // mailto if email
  if (writingBlock.querySelector('.writing-to, .writing-cc, .writing-bcc')) {

    const mailButton = document.createElement('a');

    mailButton.className = 'writing-action-button';
    mailButton.title = 'Open in mail client';
    mailButton.href = buildMailto();
    mailButton.innerHTML = sendSvg;

    writingActions.appendChild(mailButton);

  }

  // attach writing actions wrapper
  writingBlock.appendChild(writingActions);

}


function makeWritingInteractiveVersion2(writingBlock, { copySvg, sendSvg }) {

  function buildMailto() {

    const to = writingBlock.querySelector('.writing-to')?.textContent?.trim();
    const cc = writingBlock.querySelector('.writing-cc')?.textContent?.trim();
    const bcc = writingBlock.querySelector('.writing-bcc')?.textContent?.trim();
    const subject = writingBlock.querySelector('.writing-subject')?.textContent?.trim();
    const body = writingBlock.querySelector('.writing-content')?.textContent?.trim();

    let mailto = 'mailto:';

    if (to) {
      mailto += encodeURIComponent(to);
    }

    const params = [];

    /*
    if (cc) {
      params.push(`cc=${encodeURIComponent(cc)}`);
    }

    if (bcc) {
      params.push(`bcc=${encodeURIComponent(bcc)}`);
    }
    */

    if (subject) {
      params.push(`subject=${encodeURIComponent(subject)}`);
    }

    if (body) {
      params.push(`body=${encodeURIComponent(body)}`);
    }

    if (params.length) {
      mailto += `?${params.join("&")}`;
    }

    return mailto;

  }

  // copy writing block
  const writingActions = document.createElement('div');
  writingActions.className = 'writing-actions';

  const copyWritingButton = document.createElement('button');
  copyWritingButton.className = 'writing-action-button';
  copyWritingButton.title = 'Copy';
  copyWritingButton.innerHTML = copySvg;
  copyWritingButton.setAttribute(
    "onclick",
    `navigator.clipboard.writeText(this.closest('.writing-block').querySelector('.writing-content').textContent)`
  );

  writingActions.appendChild(copyWritingButton);

  // mailto if email
  if (writingBlock.querySelector('.writing-to')) {

    const mailButton = document.createElement('a');

    mailButton.className = 'writing-action-button';
    mailButton.title = 'Open in mail client';
    mailButton.href = buildMailto();
    mailButton.innerHTML = sendSvg;

    writingActions.appendChild(mailButton);

  }

  // attach writing actions wrapper
  writingBlock.appendChild(writingActions);

}


function makeWritingInteractiveSwitch(messageContent, { copySvg, sendSvg }) {

  const writingBlocks = [...messageContent.querySelectorAll('.writing-block')];

  for (const writingBlock of writingBlocks) {
    const version = writingBlock.dataset.writingBlockVersion || '1';

    switch (version) {
      case '1':
        makeWritingInteractiveVersionNone(writingBlock, { copySvg, sendSvg });
        break;

      case '2':
        makeWritingInteractiveVersion2(writingBlock, { copySvg, sendSvg });
        break;

      default:
        throw new Error(`Unsupported writing block version: ${version}`);
    }
  }

}


async function downloadHTML(convoId = conversationId) { 

  const copySvg = `<svg viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.25005 8.5C8.25005 8.91421 8.58584 9.25 9.00005 9.25C9.41426 9.25 9.75005 8.91421 9.75005 8.5H8.25005ZM9.00005 8.267H9.75006L9.75004 8.26283L9.00005 8.267ZM9.93892 5.96432L10.4722 6.49171L9.93892 5.96432ZM12.2311 5V4.24999L12.2269 4.25001L12.2311 5ZM16.269 5L16.2732 4.25H16.269V5ZM18.5612 5.96432L18.0279 6.49171V6.49171L18.5612 5.96432ZM19.5 8.267L18.75 8.26283V8.267H19.5ZM19.5 12.233H18.75L18.7501 12.2372L19.5 12.233ZM18.5612 14.5357L18.0279 14.0083L18.5612 14.5357ZM16.269 15.5V16.25L16.2732 16.25L16.269 15.5ZM16 14.75C15.5858 14.75 15.25 15.0858 15.25 15.5C15.25 15.9142 15.5858 16.25 16 16.25V14.75ZM9.00005 9.25C9.41426 9.25 9.75005 8.91421 9.75005 8.5C9.75005 8.08579 9.41426 7.75 9.00005 7.75V9.25ZM8.73105 8.5V7.74999L8.72691 7.75001L8.73105 8.5ZM6.43892 9.46432L6.97218 9.99171L6.43892 9.46432ZM5.50005 11.767H6.25006L6.25004 11.7628L5.50005 11.767ZM5.50005 15.734L6.25005 15.7379V15.734H5.50005ZM8.73105 19L8.72691 19.75H8.73105V19ZM12.769 19V19.75L12.7732 19.75L12.769 19ZM15.0612 18.0357L14.5279 17.5083L15.0612 18.0357ZM16 15.733H15.25L15.2501 15.7372L16 15.733ZM16.75 15.5C16.75 15.0858 16.4143 14.75 16 14.75C15.5858 14.75 15.25 15.0858 15.25 15.5H16.75ZM9.00005 7.75C8.58584 7.75 8.25005 8.08579 8.25005 8.5C8.25005 8.91421 8.58584 9.25 9.00005 9.25V7.75ZM12.7691 8.5L12.7732 7.75H12.7691V8.5ZM15.0612 9.46432L15.5944 8.93694V8.93694L15.0612 9.46432ZM16.0001 11.767L15.2501 11.7628V11.767H16.0001ZM15.2501 15.5C15.2501 15.9142 15.5858 16.25 16.0001 16.25C16.4143 16.25 16.7501 15.9142 16.7501 15.5H15.2501ZM9.75005 8.5V8.267H8.25005V8.5H9.75005ZM9.75004 8.26283C9.74636 7.60005 10.0061 6.96296 10.4722 6.49171L9.40566 5.43694C8.65985 6.19106 8.24417 7.21056 8.25006 8.27117L9.75004 8.26283ZM10.4722 6.49171C10.9382 6.02046 11.5724 5.75365 12.2352 5.74999L12.2269 4.25001C11.1663 4.25587 10.1515 4.68282 9.40566 5.43694L10.4722 6.49171ZM12.2311 5.75H16.269V4.25H12.2311V5.75ZM16.2649 5.74999C16.9277 5.75365 17.5619 6.02046 18.0279 6.49171L19.0944 5.43694C18.3486 4.68282 17.3338 4.25587 16.2732 4.25001L16.2649 5.74999ZM18.0279 6.49171C18.494 6.96296 18.7537 7.60005 18.7501 8.26283L20.25 8.27117C20.2559 7.21056 19.8402 6.19106 19.0944 5.43694L18.0279 6.49171ZM18.75 8.267V12.233H20.25V8.267H18.75ZM18.7501 12.2372C18.7537 12.8999 18.494 13.537 18.0279 14.0083L19.0944 15.0631C19.8402 14.3089 20.2559 13.2894 20.25 12.2288L18.7501 12.2372ZM18.0279 14.0083C17.5619 14.4795 16.9277 14.7463 16.2649 14.75L16.2732 16.25C17.3338 16.2441 18.3486 15.8172 19.0944 15.0631L18.0279 14.0083ZM16.269 14.75H16V16.25H16.269V14.75ZM9.00005 7.75H8.73105V9.25H9.00005V7.75ZM8.72691 7.75001C7.6663 7.75587 6.65146 8.18282 5.90566 8.93694L6.97218 9.99171C7.43824 9.52046 8.07241 9.25365 8.73519 9.24999L8.72691 7.75001ZM5.90566 8.93694C5.15985 9.69106 4.74417 10.7106 4.75006 11.7712L6.25004 11.7628C6.24636 11.1001 6.50612 10.463 6.97218 9.99171L5.90566 8.93694ZM4.75005 11.767V15.734H6.25005V11.767H4.75005ZM4.75006 15.7301C4.73847 17.9382 6.51879 19.7378 8.72691 19.75L8.7352 18.25C7.35533 18.2424 6.2428 17.1178 6.25004 15.7379L4.75006 15.7301ZM8.73105 19.75H12.769V18.25H8.73105V19.75ZM12.7732 19.75C13.8338 19.7441 14.8486 19.3172 15.5944 18.5631L14.5279 17.5083C14.0619 17.9795 13.4277 18.2463 12.7649 18.25L12.7732 19.75ZM15.5944 18.5631C16.3402 17.8089 16.7559 16.7894 16.75 15.7288L15.2501 15.7372C15.2537 16.3999 14.994 17.037 14.5279 17.5083L15.5944 18.5631ZM16.75 15.733V15.5H15.25V15.733H16.75ZM9.00005 9.25H12.7691V7.75H9.00005V9.25ZM12.7649 9.24999C13.4277 9.25365 14.0619 9.52046 14.5279 9.99171L15.5944 8.93694C14.8486 8.18282 13.8338 7.75587 12.7732 7.75001L12.7649 9.24999ZM14.5279 9.99171C14.994 10.463 15.2537 11.1001 15.2501 11.7628L16.75 11.7712C16.7559 10.7106 16.3402 9.69106 15.5944 8.93694L14.5279 9.99171ZM15.2501 11.767V15.5H16.7501V11.767H15.2501Z" fill="currentColor"/></svg>`;
  const sendSvg = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.3009 13.6949L20.102 3.89742M10.5795 14.1355L12.8019 18.5804C13.339 19.6545 13.6075 20.1916 13.9458 20.3356C14.2394 20.4606 14.575 20.4379 14.8492 20.2747C15.1651 20.0866 15.3591 19.5183 15.7472 18.3818L19.9463 6.08434C20.2845 5.09409 20.4535 4.59896 20.3378 4.27142C20.2371 3.98648 20.013 3.76234 19.7281 3.66167C19.4005 3.54595 18.9054 3.71502 17.9151 4.05315L5.61763 8.2523C4.48114 8.64037 3.91289 8.83441 3.72478 9.15032C3.56153 9.42447 3.53891 9.76007 3.66389 10.0536C3.80791 10.3919 4.34498 10.6605 5.41912 11.1975L9.86397 13.42C10.041 13.5085 10.1295 13.5527 10.2061 13.6118C10.2742 13.6643 10.3352 13.7253 10.3876 13.7933C10.4468 13.87 10.491 13.9585 10.5795 14.1355Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const conversation = await getConversationById(convoId); 

  const messages = await getConversationMessages(convoId); 

  messages.sort((a, b) => a.index - b.index); 

  let html = "";

  for (const message of messages) {

    const div = document.createElement("div");

    div.innerHTML = message.content_html;

    makePreCodeInteractive(div, { copySvg });
    makeWritingInteractiveSwitch(div, { copySvg, sendSvg });

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
    convoId,
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


async function downloadMarkdown(convoId = conversationId) { 
  const conversation = await getConversationById(convoId); 

  const messages = await getConversationMessages(convoId); 

  messages.sort((a, b) => a.index - b.index); 

  const exported_at = formatTimestamp(Date.now());
  const messageCount = messages.length;  
  const exporterString = `ChatGPT Export v${EXPORTER_VERSION}`;

  let markdown = `
# ${conversation.title}

- Exported: ${exported_at}
- Messages: ${messageCount}
- Conversation ID: ${convoId}
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


