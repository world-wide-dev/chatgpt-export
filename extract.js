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
async function extractMessage(messageNode, index = 0) {
  const messageNodeId = requireComponent(
    messageNode?.dataset?.messageId,
    "Message ID missing in passed in messageNode"
  );

  const conversation = await getConversationById(conversationId);

  const role = messageNode.dataset.messageAuthorRole;
  
  const model = messageNode
    ?.querySelector("[data-message-model-slug]")
    ?.dataset?.messageModelSlug ?? null;

  
  if (conversation.model == null && model != null) {
    conversation.model = model;
    await saveConversation(conversation);
  }


    // content_html
  //console.log(messageNode);
  //const content = messageNode.cloneNode(true);
  const content = messageNode;
  //console.log(messageNode);


  // Image extraction + clone <img> tag src -> dataset.imageId & alt
  const images = [];
  const image_ids = [];

  const imageNodeImages = content.querySelectorAll("img");

  for (const imageNodeImage of imageNodeImages) {
    
    // Find common ancestor & proceed
    let currentNode = imageNodeImage.parentElement.closest(".group\\/search-image");;  
    let nextNode = null;
    let imageNode = null;    
    let isGalleryImage = false;

    for (let i = 0; i < 3 && currentNode !== messageNode; i++) {  
      if (!currentNode?.parentElement) {
        break;
      }      
      const nextNode = currentNode.parentElement;  
      if (nextNode.querySelectorAll('img').length > 1) {  
        imageNode = nextNode;
        isGalleryImage = true;  
        break;  
      }  
      currentNode = nextNode;  
    }  
      
    if (!imageNode) {  
      imageNode = imageNodeImage;  
    }

    if (isGalleryImage && imageNode.querySelector('img') !== imageNodeImage) {
      continue;
    }

    if (!isGalleryImage && !imageNode.src) {
      imageNode.remove();
      continue;
    }


    const imgWrapper = document.createElement("div");

    if (!isGalleryImage) {
      imgWrapper.className = "non-gallery";

      // Image handling comes here for single (non-gallery) images
      const image = await extractImage(imageNode);
      const existing = await getImageByHash(image.hash);

      let canonicalImage = image;

      if (existing) {
        // Check if base64 string matches too
        // - Yes -> skip saving image (still save in message content_html though), continue;
        // - No -> go on with full save
        if (existing.data_base64 === image.data_base64) {
          canonicalImage = existing;
        }
      }

      image_ids.push(canonicalImage.id);
      images.push(canonicalImage);

      const canonicalImg = document.createElement("img");

      canonicalImg.dataset.imageId = canonicalImage.id;
      canonicalImg.dataset.imageHash = canonicalImage.hash;
      canonicalImg.alt = canonicalImage.alt ?? "";

      imgWrapper.appendChild(canonicalImg);

      if (messageNode.dataset.messageType === 'imagegen') {
        messageNode.id = `imagegen-${canonicalImg.dataset.imageId}`;
        messageNode.dataset.messageId = `imagegen-${canonicalImg.dataset.imageId}`;
        messageNode.dataset.messageHash = canonicalImg.dataset.imageHash;
      }
      
      imageNode.replaceWith(imgWrapper);

      continue;
    }

    imgWrapper.className = "gallery";

    // Old logic for images in wrapper
    const imgs = imageNode.querySelectorAll("img");

    for (const img of imgs) {
      if (!img.src) {
        img.remove();
        continue;
      }

      const image = await extractImage(img);
      const existing = await getImageByHash(image.hash);

      let canonicalImage = image;

      if (existing) {
        // Check if base64 string matches too
        // - Yes -> skip saving image (still save in message content_html though), continue;
        // - No -> go on with full save
        if (existing.data_base64 === image.data_base64) {
          canonicalImage = existing;
        }
      }

      image_ids.push(canonicalImage.id);
      images.push(canonicalImage);

      const canonicalImg = document.createElement("img");

      canonicalImg.dataset.imageId = canonicalImage.id;
      canonicalImg.dataset.imageHash = canonicalImage.hash;
      canonicalImg.alt = canonicalImage.alt ?? "";

      imgWrapper.appendChild(canonicalImg);
    }
      
    imageNode.replaceWith(imgWrapper);
  }


  // pre>code -> language
  const preTags =
    content.querySelectorAll("pre");

  for (const pre of preTags) {

    pre.querySelectorAll("br")
      .forEach(br =>
        br.replaceWith("\n")
      );

    const code =
      pre.querySelector("code");

    const language =
      [...pre.querySelectorAll("div")]
        .find(el =>
          !el.contains(code) &&
          el.textContent?.trim()
        )
        ?.textContent
        ?.trim()
        ?.toLowerCase();

    const canonicalPre =
      document.createElement("pre");

    const canonicalCode =
      document.createElement("code");

    if (language) {
      canonicalCode.className =
        `language-${language}`;
    }

    canonicalCode.textContent =
      code?.textContent ?? "";

    canonicalPre.appendChild(
      canonicalCode
    );

    pre.replaceWith(canonicalPre);
  }


  // Remove obvious UI junk
  content.querySelectorAll("script, style")
    .forEach(el => el.remove());

  content.querySelectorAll('[data-testid="collapsible-user-message-toggle"]').forEach(btn => btn.remove());


  const content_html = content.innerHTML.trim();


  /*
  requireComponent(messageNodeId, "FATAL ERROR: Message inconsistency: Message failed to provide ID at border control");
  */


  const id = messageNode.dataset.messageType === 'imagegen' ? messageNode.dataset.messageId : messageNodeId;


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


// Image extractor
async function extractImage(img) {

  const src = requireComponent(
    img?.src,
    "Image source missing"
  );

  const { base64, mime } = await fetchImageViaBackground(src);
  requireComponent(base64, "Image fetch failed:" + src);

  const hash = await hashString(base64);

  return {
    id: uuidv7(),
    hash,
    src,
    mime: mime ?? "image/png", // e.g. "image/png"
    data_base64: base64,
    alt: img.alt || null,
    saved_at: Date.now()
  }
}


async function fetchImageViaBackground(src) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: "FETCH_IMAGE", src },
      response => {
        resolve({
          base64: response?.base64 || null,
          mime: response?.mime || null
        });
      }
    );
  });
}


async function hashString(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}


