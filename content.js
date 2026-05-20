// ChatGPT Conversation Exporter (Extension)
// Version 1.0.1

function onMessagesReady(callback) {
  let lastCount = 0;
  let stableCount = 0;
  let timeout;

  const isGenerating = () => {
    return [...document.querySelectorAll("button")]
      .some(btn => btn.innerText.toLowerCase().includes("stop"));
  };

  const check = () => {
    const messages = document.querySelectorAll('[data-turn-id-container]');

    const readyMessages = [...messages];

    const count = readyMessages.length;

    if (count === 0) return;

    // If generating → don't proceed
    if (isGenerating()) return;

    if (count === lastCount) {
      stableCount++;
    } else {
      stableCount = 0;
      lastCount = count;
    }

    if (stableCount >= 3) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        observer.disconnect();
        //setPageLoaded(true);
        callback(readyMessages);
      }, 300);
    }
  };

  const observer = new MutationObserver(check);

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  check();
}


function isLastMessageReady() {
  const messages = document.querySelectorAll('[data-turn-id-container]');
  if (!messages.length) return false;

  const last = messages[messages.length - 1];

  const markdown = last.querySelector(".markdown");

  return (
    markdown &&
    (
      markdown.querySelectorAll("p, pre, ul, ol, img").length > 0 ||
      markdown.innerText.trim().length > 0
    )
  );

  //return markdown && markdown.innerText.trim().length > 0;
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
    model: conversation.model,
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
    model: dbConversation?.model ?? extractedConversation?.model,
    first_seen_at: dbConversation?.first_seen_at ?? now,
    updated_at: dbConversation?.updated_at ?? null,
    last_message_id: dbConversation?.last_message_id ?? null,
    extracting: false
  };
  await saveConversation(conversation);

  await updateConversationProgress(conversationId, true);

  const thread = requireComponent(document.getElementById("thread"), "Thread container not found");
  
  const wrappers = thread.querySelectorAll('[data-turn-id-container]');
  if (wrappers.length === 0) {
    throw new Error("No message sections found");
  }

  let messageIndex = 0;
  let messageIdHit = conversation.last_message_id == null;

  for (const wrapper of wrappers) {
    await hydrateElement(wrapper);

    let messageNode = wrapper.querySelector("[data-message-id]");

    for (let i = 0; i < 5 && !messageNode; i++) {
      await sleep(50);

      messageNode = wrapper.querySelector("[data-message-id]");
    }

    if (!messageNode) {
      continue;
      //throw new Error("Message ID missing after hydration retries");
    }

    if (messageNode.parentElement?.closest("[data-message-id]")) { 
      continue; 
    }


    //const role = section.dataset.turn;
    const role = messageNode.dataset.messageAuthorRole;

    if (role !== "user" && role !== "assistant") {
      continue;
    }

    const messageId = requireComponent(messageNode.dataset.messageId, "Message ID unhallucinatedly broken again");

    if (!messageIdHit) {
      if (messageId === conversation.last_message_id) {
        messageIdHit = true;
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

  if (conversation.last_message_id && !messageIdHit) {
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


// Main logic
onMessagesReady(async (readyMessages) => {
  // Extension init
  console.log("[ChatGPT Exporter] content script loaded");

  // wait until last message is actually ready
  while (!isLastMessageReady()) {
    await new Promise(r => setTimeout(r, 100));
  }

  await waitForConversationId("Conversation ID missing after hydration retries");
    
  await resetAllConversations();

  setPageLoaded(true);

  console.log("[ChatGPT Exporter] page content loaded");

  chrome.runtime.onMessage.addListener(exportHandler);
});


