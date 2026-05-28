// ChatGPT Conversation Exporter (Extension)
// Version 1.0.3

function onMessagesReady(callback) {
  let lastCount = 0;
  let stableCount = 0;
  let timeout;

  const isGenerating = () => {
    return [...document.querySelectorAll("button")]
      .some(btn =>
        btn.innerText.toLowerCase().includes("stop")
      );
  };

  const finalize = (readyMessages) => {
    observer.disconnect();
    clearInterval(interval);

    callback(readyMessages);
  };

  const check = () => {
    const messages =
      document.querySelectorAll(
        '[data-turn-id-container]'
      );

    const readyMessages = [...messages];

    const count = readyMessages.length;

    if (count === 0) {
      return;
    }

    if (isGenerating()) {
      return;
    }

    if (count === lastCount) {
      stableCount++;
    } else {
      stableCount = 0;
      lastCount = count;
    }

    if (stableCount === 3) {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        finalize(readyMessages);
      }, 300);
    }
  };

  const observer =
    new MutationObserver(check);

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // periodic fallback check
  const interval =
    setInterval(check, 250);

  check();
}


function isLastMessageReady() {
  const messages = document.querySelectorAll('[data-turn-id-container]');
  if (!messages.length) return false;

  const last = messages[messages.length - 1];

  if (!last) return false;

  return (
    last.querySelectorAll("p, pre, ul, ol, img").length > 0 ||
    last.innerText.trim().length > 0
  );
}


async function updateConversationProgress(conversationId, extracting = false) {
  const now = Date.now();

  let conversation = await getConversationById(conversationId);

  if (!conversation) {
    conversation = await extractConversation();
  }
  
  await saveConversation({
    id: conversationId,
    title: conversation.title,
    model: conversation.model ?? null,
    first_seen_at: conversation?.first_seen_at ?? now,
    updated_at: conversation?.updated_at ?? null,
    last_message_id: conversation?.last_message_id ?? null,
    extracting
  });
}


async function extractAndSave() {
  const now = Date.now();

  const dbConversation = await getConversationById(conversationId);

  const extractedConversation = await extractConversation();

  const conversation = {
    id: conversationId,
    title: dbConversation?.title ?? extractedConversation?.title,
    model: dbConversation?.model ?? null,
    first_seen_at: dbConversation?.first_seen_at ?? now,
    updated_at: dbConversation?.updated_at ?? null,
    last_message_id: dbConversation?.last_message_id ?? null,
    extracting: false
  };
  await saveConversation(conversation);

  await updateConversationProgress(conversationId, true);

  const thread = requireComponent(document.getElementById("thread"), "Thread container not found");
  
  const wrappers = thread.querySelectorAll('div[data-turn-id-container]');
  if (wrappers.length === 0) {
    throw new Error("No message sections found");
  }

  let messageIndex = 0;
  let messageIdHit = conversation.last_message_id == null;

  const shouldHaveLastMessageId = conversation.last_message_id ?? null;


  async function resolveMessageNode(wrapper) {
    await hydrateElement(wrapper);

    let messageNode = wrapper.querySelector(
      '[data-message-id], .group\\/imagegen-image'
    );
    //console.log(messageNode);

    for (let i = 0; i < 5 && !messageNode; i++) {
      await sleep(50);

      messageNode = wrapper.querySelector(
        '[data-message-id], .group\\/imagegen-image'
      );
      //console.log(messageNode);
    }

    if (!messageNode) {
      return null;
    }

    if (messageNode.matches('.group\\/imagegen-image')) {
      const div = document.createElement('div');

      div.dataset.messageId = uuidv7();
      div.dataset.messageAuthorRole = 'assistant';
      div.dataset.messageType = 'imagegen';

      const markdown = document.createElement('div');
      markdown.className = 'markdown';

      const image = messageNode.querySelector(
        'img:not([aria-hidden="true"])'
      );

      if (image) {
        markdown.appendChild(
          image.cloneNode(true)
        );
      }

      div.appendChild(markdown);

      return div;
    }

    return messageNode.cloneNode(true);
  }


  for (const wrapper of wrappers) {
    const messageNode = await resolveMessageNode(wrapper);

    if (!messageNode) {
      continue;
      //throw new Error("Message ID missing after hydration retries");
    }


    //const role = section.dataset.turn;
    const role = messageNode.dataset.messageAuthorRole;

    if (role !== "user" && role !== "assistant") {
      continue;
    }

    const messageId = requireComponent(messageNode.dataset.messageId, "Message ID unhallucinatedly broken again");

    if (!messageIdHit) {
      if (messageNode.dataset.messageType === 'imagegen') {
        const result = await extractMessage(messageNode, messageIndex);
        
        if (result.message.id === shouldHaveLastMessageId) {
          messageIdHit = true;
        }

        messageIndex++;
        continue;
      }

      if (messageId === shouldHaveLastMessageId) {
        messageIdHit = true;

        messageIndex++;
        continue;
      }

      messageIndex++;
      continue;
    }

    const result = await extractMessage(messageNode, messageIndex);

    for (const image of result.images) {
      await saveImage(image);
    }
    await saveMessage(result.message);

    conversation.updated_at = Date.now();
    conversation.last_message_id = result.message.id;

    await saveConversation(conversation);

    messageIndex++;
  }

  if (shouldHaveLastMessageId && !messageIdHit) {
    throw new Error(
      "Last message id not found during traversal"
    );
  }
  
  await updateConversationProgress(conversationId, false);
}


async function waitForConversationId(errorMessage = "Conversation ID missing after hydration retries") {
  let previousId = null;

  for (let i = 0; i < 20; i++) {
    await sleep(50);

    const currentId = extractConversationId();

    if (!currentId) {
      continue;
    }

    if (previousId && previousId === currentId) {
      setConversationId(currentId);
      return currentId;
    }

    previousId = currentId;
  }

  throw new Error(errorMessage);
}


async function triggerDownload(exportFunction) {
  //while (!isPageLoaded) { await sleep(50); }
  await exportFunction();
}


async function exportHandler(msg, sender, sendResponse) {
  //console.log("[CONTENT] got message:", msg);
  
  switch (msg.action) {
    case "IS_PAGE_LOADED":
      console.log("IS_PAGE_LOADED query received");
      sendResponse(isPageLoaded);
      break;

    case "EXTRACT":
      console.log("EXTRACT message received");
      await main();
      break;

    case "EXPORT_MD":
      console.log("EXPORT_MD message received");
      triggerDownload(downloadMarkdown).catch(console.error);
      break;

    case "EXPORT_HTML":
      console.log("EXPORT_HTML message received");
      triggerDownload(downloadHTML).catch(console.error);
      break;

    case "EXPORT_JSON":
      console.log("EXPORT_JSON message received");
      triggerDownload(downloadJSON).catch(console.error);
      break;

    case "EXPORT_DB":
      console.log("EXPORT_DB message received");
      await downloadDBDump();
      break;
  }
}


async function resetAllConversations() {  
  const convoIds = [];
  const conversations = getStore("conversations")
  for (const conversation in conversations) {
    convoIds.push(conversation.id);
  }
  for (const convoId of convoIds) {  
    await updateConversationProgress(convoId, false);  
  }  
}


async function main() {
  // Wait until
  //   - page is loaded
  //   - conversationId set
  //   - all conversation reset (extracting: false)
  while (!isPageLoaded) {
    await sleep(50);
  }

  await new Promise(r => setTimeout(r, 50));

  try {
    await extractAndSave();
  } 
  catch (err) {
    stopObserver();
    await updateConversationProgress(conversationId, false);
    console.error(err);
  }

  console.log("[DB Saver] Saved messages for this conversation in DB:", (await getConversationMessages(conversationId)).length);
    
}


// Extension init
console.log("[ChatGPT Exporter] content script loaded");

// Main logic
onMessagesReady(async (readyMessages) => {
  // wait until last message is actually ready
  while (!isLastMessageReady()) {
    await new Promise(r => setTimeout(r, 100));
  }

  await waitForConversationId("Conversation ID missing after hydration retries");
  console.log(await getConversationById(conversationId));
    
  await resetAllConversations();
  console.log("All conversation.extracting resset to false");

  setPageLoaded(true);

  /*
  const convoId = "69f79886-ac48-8328-9d3a-98fa285bce9f";
  await removeConversationMessages(convoId);
  const resetConversationLastMessageId = await getConversationById(convoId);
  resetConversationLastMessageId.last_message_id = null;
  await saveConversation(resetConversationLastMessageId);
  */

  console.log("[ChatGPT Exporter] page content loaded");

  chrome.runtime.onMessage.addListener(exportHandler);
});


