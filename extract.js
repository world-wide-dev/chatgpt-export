// Extract functions

// Conversation info extractor
async function extractConversation() {
  const conversation = await getConversationById(conversationId);

  const thread = requireComponent(document.getElementById("thread"), "Thread container not found");
  
  const wrappers = thread.querySelectorAll('[data-turn-id-container]');
  if (wrappers.length === 0) {
    throw new Error("No message wrappers found");
  }
  
  await hydrateElement(wrappers[0]);

  function getConversationTitle() {
    try {

      const activeConversation =
        document.querySelector(
          'a[data-active][data-sidebar-item]'
        );

      const title =
        activeConversation
          ?.querySelector('[title]')
          ?.getAttribute('title')
          ?.trim();

      return title || null;

    } catch (error) {

      console.warn(
        "[TITLE] sidebar lookup failed",
        error
      );

      return null;
    }
  }

  const title = conversation?.title ?? getConversationTitle() ?? document.title ?? null;

  /*
  console.log(conversation?.title, getConversationTitle(), document.title);
  console.log({ id: conversationId, title });
  */

  return {
    id: conversationId,
    title
  };
}


// Message section extractor
async function extractMessage(content, index = 0) {
  const contentId = requireComponent(
    content?.dataset?.messageId,
    "Message ID missing in passed in content"
  );

  let conversation = await getConversationById(conversationId);

  const role = content.dataset.messageAuthorRole;
  
  const model = content?.dataset.messageModelSlug ?? content
    ?.querySelector("[data-message-model-slug]")
    ?.dataset?.messageModelSlug ?? null;


  //console.log(content);


  const { images, image_ids } = await handleImages(content);

  handlePreCodeTags(content);
  
  cleanupMessageHTML(content);


  const content_html = content.innerHTML.trim();


  /*
  requireComponent(contentId, "FATAL ERROR: Message inconsistency: Message failed to provide ID at border control");
  */


  const id = content.dataset.messageType === 'imagegen' ? content.dataset.messageId : contentId;


  return {
    message: {
      id,
      conversation_id: conversationId,

      index,
      saved_at: Date.now(),

      role,
      model,

      content_html,
      image_ids
    },
    images
  }
}


function handlePreCodeTags(content) {
  // pre>code -> language
  const preTags = content.querySelectorAll("pre");

  for (const pre of preTags) {

    pre.querySelectorAll("br")
      .forEach(br =>
        br.replaceWith("\n")
      );

    const code = pre.querySelector("code");

    const language =
      [...pre.querySelectorAll("div")]
        .find(el =>
          !el.contains(code) &&
          el.textContent?.trim()
        )
        ?.textContent
        ?.trim()
        ?.toLowerCase();

    const canonicalPre = document.createElement("pre");
    const canonicalCode = document.createElement("code");

    if (language) {
      canonicalCode.className = `language-${language}`;
    }

    canonicalCode.textContent = code?.textContent ?? "";

    canonicalPre.appendChild(canonicalCode);

    pre.replaceWith(canonicalPre);
  }
}


function cleanupMessageHTML(content) {
  // Remove obvious UI junk
  content.querySelectorAll("script, style")
    .forEach(el => el.remove());

  content.querySelectorAll('[data-testid="collapsible-user-message-toggle"]').forEach(btn => btn.remove());


  for (const node of content.querySelectorAll('[style]')) {
    node.removeAttribute('style');
  }
}


