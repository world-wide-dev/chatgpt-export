/*
import {
  getConversations,
  getConversationById,
  getMessageCount,
  removeConversationMessages,
  removeConversation
} from './database.js';
*/


async function getNormalizeConversationData(conversation) {

    const messageCount = await getMessageCount(conversation.id);

    conversation.messageCount = messageCount;

    return conversation;
}


function createConversationCard(conversation) {
  // create card

  const card = document.createElement('div');
  card.className = "conversations card";
  // no need for id, everything is handled internally by the browser itself

  /*
  const info = document.createElement ('div');
  info.className = "conversation-info";
  info.innerHTML = `
  <p><b>${conversation.title}</b> (${conversation.messageCount})</p>
  <p>ID: ${conversation.id}</p>
  <p>First model used: ${conversation.model}</p>
  <p>First saved: ${conversation.first_seen_at}</p>
  <p>Last updated: ${conversation.updated_at}</p>
  <hr/>
`.trim();
  */

  // Conversation card meta section
  const info = document.createElement ('div');
  info.className = "conversation-info";

  const metaTitleP = document.createElement('p');
  const metaTitleSpan = document.createElement('span');
  metaTitleSpan.className = "meta-value meta-title";
  metaTitleSpan.textContent = conversation.title;
  const metaMsgCountSpan = document.createElement('span');
  metaMsgCountSpan.className = "meta-value meta-msg-count";
  metaMsgCountSpan.textContent = `(${conversation.messageCount})`
  metaTitleP.append(metaTitleSpan, ' ', metaMsgCountSpan);

  const metaIdP = document.createElement('p');
  const metaIdKey = document.createElement('span');
  metaIdKey.className = "meta-key meta-id";
  metaIdKey.textContent = "ID:";
  const metaIdValue = document.createElement('span');
  metaIdValue.className = "meta-value meta-id";
  metaIdValue.textContent = conversation.id;
  metaIdP.append(metaIdKey, ' ', metaIdValue);

  const metaModelP = document.createElement('p');
  const metaModelKey = document.createElement('span');
  metaModelKey.className = "meta-key meta-model";
  metaModelKey.textContent = "First model used:";
  const metaModelValue = document.createElement('span');
  metaModelValue.className = "meta-value meta-model";
  metaModelValue.textContent = conversation.model;
  metaModelP.append(metaModelKey, ' ', metaModelValue);

  const metaFirstSavedP = document.createElement('p');
  const metaFirstSavedKey = document.createElement('span');
  metaFirstSavedKey.className = "meta-key meta-model";
  metaFirstSavedKey.textContent = "First saved:";
  const metaFirstSavedValue = document.createElement('span');
  metaFirstSavedValue.className = "meta-value meta-model";
  metaFirstSavedValue.textContent = formatTimestamp(conversation.first_seen_at);
  metaFirstSavedP.append(metaFirstSavedKey, ' ', metaFirstSavedValue);

  const metaLastUpdatedP = document.createElement('p');
  const metaLastUpdatedKey = document.createElement('span');
  metaLastUpdatedKey.className = "meta-key meta-model";
  metaLastUpdatedKey.textContent = "Last updated:";
  const metaLastUpdatedValue = document.createElement('span');
  metaLastUpdatedValue.className = "meta-value meta-model";
  metaLastUpdatedValue.textContent = formatTimestamp(conversation.updated_at);
  metaLastUpdatedP.append(metaLastUpdatedKey, ' ', metaLastUpdatedValue);

  const hr = document.createElement('hr');

  info.append(
    metaTitleP,
    metaIdP,
    metaModelP,
    metaFirstSavedP,
    metaLastUpdatedP, 
    hr
  );

  const conversationData = { ...conversation };
  delete conversationData.messageCount;

  metaTitleSpan.addEventListener('click', () => { 
    editCardTitle(conversationData, metaTitleSpan); 
  });  
  

  const interactive = document.createElement('div');
  interactive.className = "conversation-interactive";

  const exportBlock = document.createElement('div');
  exportBlock.className = "conversation-export";

  const removeBlock = document.createElement('div');
  removeBlock.className = "conversation-remove";

  const exportHTML = document.createElement('span');
  exportHTML.className = "interactive-button";
  exportHTML.textContent = "[ Export HTML ]";
  exportHTML.addEventListener('click', async () => {
    await downloadHTML(conversation.id);
  });

  const exportMarkdown = document.createElement('span');
  exportMarkdown.className = "interactive-button";
  exportMarkdown.textContent = "[ Export Markdown ]";
  exportMarkdown.addEventListener('click', async () => {
    await downloadMarkdown(conversation.id);
  });

  const exportJSON = document.createElement('span');
  exportJSON.className = "interactive-button";
  exportJSON.textContent = "[ Export JSON ]";
  exportJSON.addEventListener('click', async () => {
    await downloadJSON(conversation.id);
  });

  exportBlock.append(
    exportHTML,
    exportMarkdown,
    exportJSON
  );

  const removeConversationButton = document.createElement('span');
  removeConversationButton.className = "interactive-button";
  removeConversationButton.textContent = "[ Remove Conversation ]";
  removeConversationButton.addEventListener('click', async () => {
    try {
      await removeConversation(conversation.id);
      card.remove();
    }
    catch (err) {
      console.log(err);
    }
  });

  const removeMessages = document.createElement('span');
  removeMessages.className = "interactive-button";
  removeMessages.textContent = "[ Delete Messages ]";
  removeMessages.addEventListener('click', async () => {
    try {
      await removeConversationMessages(conversation.id);
      metaMsgCountSpan.textContent = '(0)';
    }
    catch (err) {
      console.log(err);
    }
  });

  removeBlock.append(
    removeConversationButton,
    removeMessages
  );

  interactive.append(
    exportBlock,
    removeBlock
  );

  card.append(
    info,
    interactive
  );

  return card;
}


async function editCardTitle(conversation, metaTitleSpan) {
  const blockContent = document.createElement('div');
  blockContent.className = 'editor-overlay';

  const label = document.createElement('label');
  label.textContent = "Title:";
  label.htmlFor = 'title-editor';
  label.className = 'meta-title-edit';

  const textbox = document.createElement('input');
  textbox.id = 'title-editor';
  textbox.name = 'title-editor';
  textbox.value = conversation.title ?? "";
  textbox.maxLength = 255;


  const TITLE_FORBIDDEN_CHARS = /[\0\r\n\t\\]/;

  textbox.addEventListener(
      "beforeinput",
      event => {

          const text =
              event.data ?? "";

          if (
              TITLE_FORBIDDEN_CHARS.test(text)
          ) {
              event.preventDefault();
          }
      }
  );

  textbox.addEventListener(
      "paste",
      event => {

          const text =
              event.clipboardData.getData(
                  "text"
              );

          if (
              TITLE_FORBIDDEN_CHARS.test(text)
          ) {
              event.preventDefault();
          }
      }
  );

  textbox.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            save.click();
        }
    }
  );


  const save = document.createElement('button');
  save.textContent = 'Save';  
  save.addEventListener('click', async () => {
    const newTitle = textbox.value.trim();

    if (newTitle === "" || newTitle === conversation.title) {
      hideBlocker();
      return;
    }

    try {
      conversation.title = newTitle;
      await saveConversation(conversation);
      metaTitleSpan.textContent = newTitle;
      hideBlocker();
    }
    catch(error) {
      console.log(error);
      alert('Something went wrong while updating conversation title!');
      return;
    }
  });

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    hideBlocker();
  });

  const editorButtonsDiv = document.createElement('div');
  editorButtonsDiv.className = 'editor-buttons';
  editorButtonsDiv.append(save, cancel);

  blockContent.append(
    label,
    textbox,
    editorButtonsDiv
  );

  textbox.focus();
  textbox.select();

  showBlocker(blockContent);
}


const globalDBExportButton = document.getElementById('export-db');
//const globalDBImportButton = document.getElementById('import-db');

globalDBExportButton.addEventListener('click', async () => {
  await downloadDBDump();
});


initImporter();


const conversationList = document.getElementById('conversation-list');

const conversations = await getConversations();

for (const conversation of conversations) {
  conversationList.appendChild(
    createConversationCard(
      await getNormalizeConversationData(conversation)
    )
  );
}


