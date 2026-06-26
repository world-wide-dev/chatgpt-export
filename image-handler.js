// Extract Image(s) functions

function getImageUrl(img) {
  return (
    img.src ||
    img.currentSrc ||
    img.dataset?.src ||
    img.getAttribute("data-src") ||
    img.getAttribute("data-original") ||
    null
  );
}


function getFullSizeImageUrl(img) {
  const alt = img.alt?.trim();

  if (alt && alt.includes("purpose=fullsize")) {
    return alt;
  }

  return null;
}


async function extractShoppingGallery(shoppingGalleryNode) {
  const images = [];
  const image_ids = [];

  const canonicalShoppingGallery = document.createElement('div');

  canonicalShoppingGallery.className = 'shopping-gallery';

  const metadataNodes = shoppingGalleryNode.querySelectorAll('[data-shopping-browse-product-metadata]');

  for (const metadataNode of metadataNodes) {

    let card = metadataNode;
    let imageNode = null;

    for (let i = 0; i < 3 && !imageNode; i++) {
        imageNode = card.querySelector('img');

        if (imageNode) { break; }

        card = card.parentElement;

        if (!card) { break; }
    }

    if (!imageNode) {
        throw new Error("FATAL ERROR: OPENAI DID IT AGAIN");
    }    

    const imageNodeUrl = getImageUrl(imageNode) || null;

    if (!imageNodeUrl) {
      imageNode.dataset.extracted = "true";
      console.warn('[Extractor] Image URL unavailable after hydration, marked as done, skipping');
      continue;
    }

    imageNode.src = imageNodeUrl;
    
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
    canonicalImg.width = imageNode.naturalWidth;
    canonicalImg.height = imageNode.naturalHeight;


    const shoppingMeta = metadataNode.cloneNode(true);

    const shoppingCard = document.createElement('div');

    shoppingCard.className = 'shopping-card';

    shoppingCard.append(
        canonicalImg,
        shoppingMeta
    );

    canonicalShoppingGallery.appendChild(
        shoppingCard
    );

    imageNode.dataset.extracted = "true";
  }

  return {
    canonicalShoppingGallery,
    images,
    image_ids
  };
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


function validateImageObject(imageObject) {

    if (!imageObject) {
        return false;
    }

    if (!imageObject.base64) {
        return false;
    }

    if (!imageObject.mime) {
        return false;
    }

    return true;
}


function blobToBase64(blob) {

  return new Promise(resolve => {

    const reader = new FileReader();

    reader.onloadend = () => {

      resolve(
        reader.result
          ?.split("base64,")[1]
          ?? null
      );

    };

    reader.readAsDataURL(blob);

  });

}


async function fetchImageViaDirect(url) {

  try {

    const res = await fetch(url, { credentials: "include" });

    if (!res.ok) {
      return {
        base64: null,
        mime: null
      };
    }

    const imageBlob = await res.blob();

    const base64 = await blobToBase64(imageBlob);

    return {
      base64,
      mime: imageBlob.type
    };

  } catch {}

  return {
    base64: null,
    mime: null
  };
}


async function fetchImageViaCanvas(img) {

  const mime = "image/png";

  try {

    const canvas = document.createElement("canvas");

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return {
        base64: null,
        mime: null
      };
    }

    ctx.drawImage(img, 0, 0);

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, mime)
    );

    if (blob) {
      const base64 = await blobToBase64(blob);

      return {
          base64,
          mime
      };
    }

  } catch {}

  return {
    base64: null,
    mime: null
  };
}


async function extractImageWithFallbacks(img) {  
  
  async function completeImageObject(image, img, src, source) {  
    const hash = await hashString(image.base64);  
  
    return {  
      id: uuidv7(),  
      hash,  
      src,  
      mime: image.mime ?? "image/png",  
      data_base64: image.base64,  
      alt: img.alt || null,  
      source,
      saved_at: Date.now()  
    };  
  }  
  
  function createPlaceholderImageObject(img) {  
    return {  
      dataset: {
        imageFailed: "true",  
        imageFailedSrc: img.src,
        imageFailedAlt: img.alt,
        imageFailedSavedAt: Date.now()  
      }
    };  
  }  
  
  const candidateUrls = [  
    ...new Set([  
      getFullSizeImageUrl(img),  
      getImageUrl(img)  
    ].filter(Boolean))  
  ];  
  
  if (candidateUrls.length === 0) {  
    throw new Error('[Image Extractor] No candidate URLs found');  
  }  
  
  for (const url of candidateUrls) {  
  
    const image = await fetchImageViaBackground(url);  
  
    if (validateImageObject(image)) {  
      return {  
        placeholder: false,  
        canonicalImageObject: await completeImageObject(image, img, url, "bgfetch")  
      };  
    }  
  }  
      
  for (const url of candidateUrls) {  
  
    const image = await fetchImageViaDirect(url);  
  
    if (validateImageObject(image)) {  
      return {  
        placeholder: false,  
        canonicalImageObject: await completeImageObject(image, img, url, "fetch")  
      };  
    }  
  }  
      
  const image = await fetchImageViaCanvas(img);  
  
  if (validateImageObject(image)) {  
    return {  
      placeholder: false,  
      canonicalImageObject: await completeImageObject(image, img, img.src, "canvas")  
    };  
  }  
  
  // If none of the above works, return placeholder image object  
  return {  
    placeholder: true,  
    canonicalImageObject: createPlaceholderImageObject(img)  
  }  
}


async function handleImages(content) {
  // Image extraction + clone <img> tag src -> dataset.imageId & alt
  const images = [];
  const image_ids = [];

  const imageNodeImages = content.querySelectorAll("img");

  for (const imageNodeImage of imageNodeImages) {
    

    // Find Shopping Galleries
    const shoppingGalleryNode = imageNodeImage.closest('[data-testid="products-widget"]');

    if (shoppingGalleryNode) {

        if (imageNodeImage.dataset.extracted) { continue; }

        const shoppingContext = await extractShoppingGallery(shoppingGalleryNode);

        const canonicalShoppingGallery = shoppingContext.canonicalShoppingGallery;
        images.push(...shoppingContext.images);
        image_ids.push(...shoppingContext.image_ids);

        shoppingGalleryNode.replaceWith(canonicalShoppingGallery);

        continue;
    }


    // Find common ancestor & proceed
    let currentNode = imageNodeImage.parentElement.closest(".group\\/search-image");
    //let nextNode = null;
    let imageNode = null;    
    let isGalleryImage = false;

    for (let i = 0; i < 3 && currentNode !== content; i++) {  
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


    const imgWrapper = document.createElement("div");

    if (!isGalleryImage && content.dataset.messageType === 'imagegen') {
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
      canonicalImg.width = imageNode.naturalWidth;
      canonicalImg.height = imageNode.naturalHeight;

      imgWrapper.appendChild(canonicalImg);

      content.id = `imagegen-${canonicalImg.dataset.imageId}`;
      content.dataset.messageId = `imagegen-${canonicalImg.dataset.imageId}`;
      content.dataset.messageHash = canonicalImg.dataset.imageHash;
      
      imageNode.replaceWith(imgWrapper);

      continue;
    }


    if (!isGalleryImage) {
      imgWrapper.className = "non-gallery";

      // Image handling comes here for single (non-gallery) images
      let imageResult;
      try {
        imageResult = await extractImageWithFallbacks(imageNode);
      }
      catch (err) {
        console.warn("[Image Extractor]", err);
        continue;
      }

      const canonicalImg = document.createElement("img");

      if (imageResult.placeholder) {

        Object.assign(
          canonicalImg.dataset,
          imageResult.canonicalImageObject.dataset
        );

        canonicalImg.width = imageNode.naturalWidth;
        canonicalImg.height = imageNode.naturalHeight;

      } else {

        const existing = await getImageByHash(imageResult.canonicalImageObject.hash);

        let canonicalImage = imageResult.canonicalImageObject;

        if (existing) {
          // Check if base64 string matches too
          // - Yes -> skip saving image (still save in message content_html though), continue;
          // - No -> go on with full save
          if (existing.data_base64 === canonicalImage.data_base64) {
            canonicalImage = existing;
          }
        }

        image_ids.push(canonicalImage.id);
        images.push(canonicalImage);

        canonicalImg.dataset.imageId = canonicalImage.id;
        canonicalImg.dataset.imageHash = canonicalImage.hash;
        canonicalImg.alt = canonicalImage.alt ?? "";
        canonicalImg.width = imageNode.naturalWidth;
        canonicalImg.height = imageNode.naturalHeight;

      }
    
      imgWrapper.appendChild(canonicalImg);

      imageNode.replaceWith(imgWrapper);
      continue;
    }


    imgWrapper.className = "gallery";

    // Old logic for images in wrapper
    const imgs = imageNode.querySelectorAll("img");

    for (const img of imgs) {
      let imageResult;
      try {
        imageResult = await extractImageWithFallbacks(img);
      }
      catch (err) {
        console.warn("[Image Extractor]", err);
        continue;
      }

      const canonicalImg = document.createElement("img");

      if (imageResult.placeholder) {

        Object.assign(
          canonicalImg.dataset,
          imageResult.canonicalImageObject.dataset
        );

        canonicalImg.width = img.naturalWidth;
        canonicalImg.height = img.naturalHeight;

      } else {
        const existing = await getImageByHash(imageResult.canonicalImageObject.hash);

        let canonicalImage = imageResult.canonicalImageObject;

        if (existing) {
          // Check if base64 string matches too
          // - Yes -> skip saving image (still save in message content_html though), continue;
          // - No -> go on with full save
          if (existing.data_base64 === canonicalImage.data_base64) {
            canonicalImage = existing;
          }
        }

        image_ids.push(canonicalImage.id);
        images.push(canonicalImage);

        canonicalImg.dataset.imageId = canonicalImage.id;
        canonicalImg.dataset.imageHash = canonicalImage.hash;
        canonicalImg.alt = canonicalImage.alt ?? "";
        canonicalImg.width = imageNode.naturalWidth;
        canonicalImg.height = imageNode.naturalHeight;

      }

      imgWrapper.appendChild(canonicalImg);
    }
      
    imageNode.replaceWith(imgWrapper);
  }

  
  // Clean up data-extracted attributes from <img>s
  for (const node of content.querySelectorAll('[data-extracted]')) {
    node.removeAttribute('data-extracted');
  }

  return {
    images,
    image_ids
  };
}


