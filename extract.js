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
async function extractMessage(origNode, content, index = 0) {
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


  const { images, image_ids } = await handleImages(content, { includeWidgetImages: false });

  handlePreCodeTags(content);

  handleWritingBlocksVersion2(content);
  
  cleanupMessageHTML(content);

  const { widgetImages, widgetImage_ids } = await handleWidgets(origNode, content);


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
      image_ids: [
        ...image_ids,
        ...widgetImage_ids
      ]
    },
    images: [
      ...images,
      ...widgetImages
    ]
  }
}


/*
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
*/


function handlePreCodeTags(content) {
  const preTags = content.querySelectorAll("pre");

  for (const pre of preTags) {

    pre.querySelectorAll("br")
      .forEach(br =>
        br.replaceWith("\n")
      );

    const code = pre.querySelector("code");

    const canonicalPre = document.createElement("pre");
    const canonicalCode = document.createElement("code");

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

  content.querySelectorAll('[data-remove-me="true"]').forEach(node => node.remove());

  for (const node of content.querySelectorAll('[style]')) {
    node.removeAttribute('style');
  }
}


function handleWritingBlocks(content) {

  function createWritingHeaderField(className, label, value) {
    const field = document.createElement("div");
    field.className = className;

    const canonicalLabel = document.createElement("span");
    canonicalLabel.className = "writing-label";
    canonicalLabel.textContent = label;

    const canonicalValue = document.createElement("span");
    canonicalValue.className = "writing-value";
    canonicalValue.textContent = value;

    field.append(canonicalLabel, canonicalValue);

    return field;
  }

  function removeInlineLabel(node) {
    const label = node?.previousElementSibling;

    if (
      label?.tagName === "SPAN" &&
      label.parentElement === node.parentElement
    ) {
      label.remove();
    }

    node?.remove();
  }
  
  const writingBlocks = content.querySelectorAll('[data-writing-block="true"]');

  if (writingBlocks.length === 0) { return; }

  for (const writingBlock of writingBlocks) {
    
    // Get writing block body
    const writingContent = writingBlock.querySelector('div.ProseMirror');

    requireComponent(writingContent, "OpenAI broke writing block this time");

    
    // Create canonical writing block
    const canonicalWritingBlock = document.createElement('div');
    const canonicalWritingHeader = document.createElement('div');
    const canonicalWritingBody = document.createElement('div');

    canonicalWritingBlock.className = "writing-block";
    canonicalWritingHeader.className = "writing-header";
    canonicalWritingBody.className = "writing-body";

    
    // Conditional blocks
    const writingTo = writingContent.querySelector('a[href^="mailto:"]:not([href^="mailto:cc"]):not([href^="mailto:bcc"])') ?? null;
    const writingToText = writingTo?.textContent ?? null;
    if (writingToText) {
      canonicalWritingHeader.appendChild(
        createWritingHeaderField("writing-to", "To:", writingToText)
      );
    }
    removeInlineLabel(writingTo);

    const writingCc = writingContent.querySelector('a[href^="mailto:cc"]') ?? null;
    const writingCcText = writingCc?.textContent ?? null;
    if (writingCcText) {
      canonicalWritingHeader.appendChild(
        createWritingHeaderField("writing-cc", "CC:", writingCcText)
      );
    }
    removeInlineLabel(writingCc);

    const writingBcc = writingContent.querySelector('a[href^="mailto:bcc"]') ?? null;
    const writingBccText = writingBcc?.textContent ?? null;
    if (writingBccText) {
      canonicalWritingHeader.appendChild(
        createWritingHeaderField("writing-bcc", "BCC:", writingBccText)
      );
    }
    removeInlineLabel(writingBcc);

    // TODO: Replace localized selector if OpenAI exposes a stable subject selector.
    const writingSubject = writingBlock.querySelector('textarea[aria-label="Objet"], textarea[aria-label="Subject"]') ?? null;
    const writingSubjectText = writingSubject?.value ?? null;
    if (writingSubjectText) {
      canonicalWritingHeader.appendChild(
        createWritingHeaderField("writing-subject", "Subject:", writingSubjectText)
      );
    }

    
    // Writing Content + Placeholders
    const canonicalWritingContent = document.createElement('div');

    canonicalWritingContent.className = "writing-content";

    const writingPlaceholders = writingContent.querySelectorAll("[data-placeholder-token]");

    for (const placeholder of writingPlaceholders) {

      const canonicalPlaceholder = document.createElement("span");

      canonicalPlaceholder.className = "writing-block-placeholder";

      canonicalPlaceholder.textContent = placeholder.textContent;

      placeholder.replaceWith(canonicalPlaceholder);
    }

    canonicalWritingContent.append(...writingContent.childNodes);

    canonicalWritingBody.appendChild(canonicalWritingContent);


    // Final merge
    canonicalWritingBlock.append(
      canonicalWritingHeader, 
      canonicalWritingBody
    );

    writingBlock.replaceWith(canonicalWritingBlock);
  }
}


function handleWritingBlocksVersion2(content) {

  function createWritingHeaderField(className, label, value) {
    const field = document.createElement("div");
    field.className = className;

    const canonicalLabel = document.createElement("span");
    canonicalLabel.className = "writing-label";
    canonicalLabel.textContent = label;

    const canonicalValue = document.createElement("span");
    canonicalValue.className = "writing-value";
    canonicalValue.textContent = value;

    field.append(canonicalLabel, canonicalValue);

    return field;
  }

  function removeInlineLabel(node) {
    const label = node?.previousElementSibling;
    const lineBreak = label?.previousElementSibling;

    if (
      label?.tagName === "SPAN" &&
      label.parentElement === node.parentElement
    ) {
      if (
        lineBreak?.tagName === "BR" &&
        lineBreak.parentElement === node.parentElement
      ) {
        lineBreak.remove();
      }

      label.remove();
    }

    node?.remove();
  }
  
  const writingBlocks = content.querySelectorAll('[data-writing-block="true"]');

  if (writingBlocks.length === 0) { return; }

  for (const writingBlock of writingBlocks) {
    
    // Get writing block body
    const writingContent = writingBlock.querySelector('div.ProseMirror');

    requireComponent(writingContent, "OpenAI broke writing block this time");

    
    // Create canonical writing block
    const canonicalWritingBlock = document.createElement('div');
    const canonicalWritingHeader = document.createElement('div');
    const canonicalWritingBody = document.createElement('div');

    canonicalWritingBlock.className = "writing-block";
    canonicalWritingHeader.className = "writing-header";
    canonicalWritingBody.className = "writing-body";

    canonicalWritingBlock.dataset.writingBlockVersion = '2';

    
    // Handle mailto 
    const recipients = [...writingContent.querySelectorAll('a[href^="mailto:"]')];

    // If any recipients...
    if (recipients.length > 0) {
      // Create To line (field & value) && Add it to canonicalWritingHeader
      canonicalWritingHeader.appendChild(createWritingHeaderField('writing-to', 'To:', recipients[0].textContent));
      // Create Recipients label && Add to canonicalWritingHeader
      canonicalWritingHeader.appendChild(createWritingHeaderField('writing-recipients', 'Recipients:', ''));

      // Create <ul> for recipients 
      const recipientList = document.createElement('ul');
      recipientList.className = 'recipient-list';
      canonicalWritingHeader.appendChild(recipientList);

      for (const recipient of recipients) {
        // Add recipient
        const recipientEntry = document.createElement('li');
        recipientEntry.className = 'recipient-entry';
        recipientEntry.textContent = recipient.textContent;
        recipientList.appendChild(recipientEntry);

        // Cleanup
        removeInlineLabel(recipient);
      }
    }

    
    // TODO: Replace localized selector if OpenAI exposes a stable subject selector.
    const writingSubject = writingBlock.querySelector('textarea[aria-label="Objet"], textarea[aria-label="Subject"]') ?? null;
    const writingSubjectText = writingSubject?.value ?? null;
    if (writingSubjectText) {
      canonicalWritingHeader.appendChild(createWritingHeaderField("writing-subject", "Subject:", writingSubjectText));
    }

    
    // Writing Content + Placeholders
    const canonicalWritingContent = document.createElement('div');

    canonicalWritingContent.className = "writing-content";

    const writingPlaceholders = writingContent.querySelectorAll("[data-placeholder-token]");

    for (const placeholder of writingPlaceholders) {

      const canonicalPlaceholder = document.createElement("span");

      canonicalPlaceholder.className = "writing-block-placeholder";

      canonicalPlaceholder.textContent = placeholder.textContent;

      placeholder.replaceWith(canonicalPlaceholder);
    }

    canonicalWritingContent.append(...writingContent.childNodes);

    canonicalWritingBody.appendChild(canonicalWritingContent);


    // Final merge
    canonicalWritingBlock.append(
      canonicalWritingHeader, 
      canonicalWritingBody
    );

    writingBlock.replaceWith(canonicalWritingBlock);
  }
}


// Widget handler 
async function handleWidgets(origNode, content) {

  async function completeWidgetImageObject(image, widget, source) {
    const hash = await hashString(image.base64);

    return {
      id: uuidv7(),
      hash,
      src: "DIL widget",
      mime: image.mime ?? "image/png",
      data_base64: image.base64,
      alt: widget.getAttribute("aria-label") ?? widget.getAttribute("title") ?? widget.getAttribute("alt") ?? widget.querySelector('[data-w-component="title"]')?.textContent.trim() ?? null,
      source,
      saved_at: Date.now()
    };
  }


  async function appendFallbackImages(node) {
    const fallback = await handleImages(node, { includeWidgetImages: true });
    images.push(...fallback.images);
    image_ids.push(...fallback.image_ids);
  }


  const images = [];
  const image_ids = [];

  const widgets = content.querySelectorAll('[data-test-id="dil-widget-shell"]');

  for (const widget of widgets) {

    const widgetIndex = widget.dataset.cgptExportWidget;
    const origWidget = origNode.querySelector(`[data-cgpt-export-widget="${widgetIndex}"]`);

    if (!origWidget) {
      await appendFallbackImages(widget);
      continue;
    }

    // Take screenshot of the widget
    // const imageResult = await takeNodeScreenshot(widget);
    let imageResult;
    try {
      imageResult = await takeNodeScreenshot(origWidget, { bannerOn: false });
    }
    catch (err) {
      console.warn("[Widget Extractor]", err);
      await appendFallbackImages(widget);
      continue;
    }

    // Null values -> skip
    if (!validateImageObject(imageResult)) {
      await appendFallbackImages(widget);
      continue;
    }

    // Success 
    // -> build image object 
    let canonicalImage = await completeWidgetImageObject(imageResult, origWidget, "screenshot");

    // Deduplication
    const existing = await getImageByHash(canonicalImage.hash);

    if (existing && existing.data_base64 === canonicalImage.data_base64) {
      canonicalImage = existing;
    }

    // -> create canonical DOM widget 
    const canonicalImg = document.createElement("img");
    canonicalImg.dataset.imageId = canonicalImage.id;
    canonicalImg.dataset.imageHash = canonicalImage.hash;
    canonicalImg.alt = canonicalImage.alt ?? "";
    canonicalImg.width = imageResult.width ?? 0;
    canonicalImg.height = imageResult.height ?? 0;

    // -> replace (cloned) DOM widget 
    widget.replaceWith(canonicalImg);

    // -> add image to images array
    images.push(canonicalImage);

    // -> add id to image_ids array
    image_ids.push(canonicalImage.id);

  }

  return {
    widgetImages: images,
    widgetImage_ids: image_ids
  }

}


