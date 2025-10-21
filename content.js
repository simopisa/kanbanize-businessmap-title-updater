// Content script for Kanbanize card management
let API_BASE = '';
let currentCardVersionId = null;

// Load API credentials from storage
function loadConfig(callback) {
  chrome.storage.local.get(["kanbanizeApiKey", "kanbanizeApiUrl"], function (items) {
    if (chrome.runtime.lastError) {
      console.error('Error loading config:', chrome.runtime.lastError);
      callback(null, null);
    } else {
      callback(items.kanbanizeApiKey || null, items.kanbanizeApiUrl || null);
    }
  });
}

// Extract board and card IDs from URL
function extractIdsFromUrl() {
  const urlMatch = window.location.href.match(/\/ctrl_board\/(\d+)\/cards\/(\d+)/);
  if (urlMatch) {
    return {
      boardId: urlMatch[1],
      cardId: urlMatch[2]
    };
  }
  return null;
}

// API call function
function apiCall(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    loadConfig((apiKey, apiUrl) => {
      if (!apiKey || !apiUrl) {
        reject(new Error('API credentials not configured. Please set them in the extension popup.'));
        return;
      }

      chrome.runtime.sendMessage({
        type: "apiCall",
        url: `${apiUrl}${endpoint}`,
        apiKey: apiKey,
        method: options.method || "GET",
        headers: options.headers || {},
        body: options.body ? JSON.parse(options.body) : undefined
      }, response => {
        if (response.status === "error" || response.status >= 400) {
          reject(new Error(response.message || `API Error: ${response.status}`));
        } else {
          resolve(response.data);
        }
      });
    });
  });
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `kanb-ext-notification kanb-ext-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('kanb-ext-show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('kanb-ext-show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Extract version number from title
function extractVersionNumber(title) {
  const match = title.match(/^(\d+(?:\.\d+)*)/);
  return match ? match[1] : null;
}

// Replace version in title
function replaceVersionInTitle(title, oldVersion, newVersion) {
  return title.replace(new RegExp(`^${oldVersion.replace(/\./g, '\\.')}\\b`), newVersion);
}

// Get card details
async function getCardDetails(cardId) {
  const result = await apiCall(`/cards/${cardId}`);
  return result.data;
}

// Get card parents
async function getParents(cardId) {
  const result = await apiCall(`/cards/${cardId}/parents`);
  return result.data || [];
}

// Get card children
async function getChildren(cardId) {
  const result = await apiCall(`/cards/${cardId}/children`);
  return result.data || [];
}

// Update card title
async function updateCardTitle(cardId, newTitle) {
  const cardDetails = await getCardDetails(cardId);
  await apiCall(`/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: newTitle,
      version_id: cardDetails.version_id
    })
  });
}

// Update children recursively
async function updateChildrenRecursively(cardId, oldVersion, newVersion, depth = 0) {
  const children = await getChildren(cardId);

  for (const child of children) {
    const childDetails = await getCardDetails(child.card_id);
    const childTitle = childDetails.title;
    const childVersion = extractVersionNumber(childTitle);

    if (childVersion && childVersion.startsWith(oldVersion + '.')) {
      const childNewVersion = childVersion.replace(
        new RegExp(`^${oldVersion.replace(/\./g, '\\.')}\\.`),
        `${newVersion}.`
      );
      const newChildTitle = replaceVersionInTitle(childTitle, childVersion, childNewVersion);

      await updateCardTitle(child.card_id, newChildTitle);
      await updateChildrenRecursively(child.card_id, childVersion, childNewVersion, depth + 1);
    }
  }
}

// Rename card handler
async function handleRename() {
  const ids = extractIdsFromUrl();
  if (!ids) {
    showNotification('Could not extract card ID from URL', 'error');
    return;
  }

  try {
    const cardDetails = await getCardDetails(ids.cardId);
    const currentTitle = cardDetails.title;
    
    const newTitle = prompt('Enter new title:', currentTitle);
    if (!newTitle || newTitle === currentTitle) {
      return;
    }

    const oldVersion = extractVersionNumber(currentTitle);
    const newVersion = extractVersionNumber(newTitle);

    if (!oldVersion || !newVersion) {
      showNotification('Could not detect version number in format like 1, 2.1, or 2.1.3', 'error');
      return;
    }

    showNotification('Updating card title and children...', 'info');

    await updateCardTitle(ids.cardId, newTitle);
    await updateChildrenRecursively(ids.cardId, oldVersion, newVersion);

    showNotification('✓ Card and all children updated successfully!', 'success');
    
    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

// Transpose card handler
async function handleTranspose() {
  const ids = extractIdsFromUrl();
  if (!ids) {
    showNotification('Could not extract card ID from URL', 'error');
    return;
  }

  try {
    const cardDetails = await getCardDetails(ids.cardId);
    const title = cardDetails.title;
    const version = extractVersionNumber(title);

    if (!version) {
      showNotification('Could not detect version number for transposition', 'error');
      return;
    }

    if (!confirm(`Transpose card "${title}"?\n\nThis will increment the version numbers of all cards that come after it.`)) {
      return;
    }

    showNotification('Transposing cards...', 'info');

    // Get parents
    const parents = await getParents(ids.cardId);

    if (parents.length === 0) {
      showNotification('This card has no parent. Cannot transpose.', 'error');
      return;
    }

    const parentId = parents[0].card_id;

    // Get all siblings (children of parent)
    const siblings = await getChildren(parentId);

    // Sort siblings by position
    siblings.sort((a, b) => a.position - b.position);

    // Find current card position
    const currentIndex = siblings.findIndex(s => s.card_id.toString() === ids.cardId);

    if (currentIndex === -1) {
      showNotification('Could not find card in parent children', 'error');
      return;
    }

    // Extract version parts
    const versionParts = version.split('.');
    const lastPart = parseInt(versionParts[versionParts.length - 1]);

    // Update all siblings after this card
    for (let i = currentIndex + 1; i < siblings.length; i++) {
      const siblingDetails = await getCardDetails(siblings[i].card_id);
      const siblingTitle = siblingDetails.title;
      const siblingVersion = extractVersionNumber(siblingTitle);

      if (siblingVersion) {
        const siblingParts = siblingVersion.split('.');

        // Check if they share the same prefix
        const prefix = versionParts.slice(0, -1).join('.');
        const siblingPrefix = siblingParts.slice(0, -1).join('.');

        if (prefix === siblingPrefix && siblingParts.length === versionParts.length) {
          const siblingLastPart = parseInt(siblingParts[siblingParts.length - 1]);

          if (siblingLastPart >= lastPart) {
            // Increment the last part
            const newLastPart = siblingLastPart + 1;
            const newVersionParts = [...siblingParts.slice(0, -1), newLastPart];
            const newVersion = newVersionParts.join('.');
            const newTitle = replaceVersionInTitle(siblingTitle, siblingVersion, newVersion);

            await updateCardTitle(siblings[i].card_id, newTitle);

            // Update children recursively
            await updateChildrenRecursively(siblings[i].card_id, siblingVersion, newVersion);
          }
        }
      }
    }

    showNotification('✓ Cards transposed successfully!', 'success');

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

// Inject buttons into the card header
function injectButtons() {
  // Check if we're on a card details page
  const ids = extractIdsFromUrl();
  if (!ids) return;

  // Check if buttons already exist
  if (document.querySelector('.kanb-ext-rename-btn')) return;

  // Find the modal header icons container
  const headerIcons = document.querySelector('.modal-header-icons');
  if (!headerIcons) {
    // Retry after a short delay
    setTimeout(injectButtons, 500);
    return;
  }

  // Create rename button
  const renameBtn = document.createElement('button');
  renameBtn.className = 'js-icon kanb-ext-rename-btn';
  renameBtn.title = 'Rename Card (Version)';
  renameBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">edit</span>';
  renameBtn.addEventListener('click', handleRename);

  // Create transpose button
  const transposeBtn = document.createElement('button');
  transposeBtn.className = 'js-icon kanb-ext-transpose-btn';
  transposeBtn.title = 'Transpose Card';
  transposeBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">swap_vert</span>';
  transposeBtn.addEventListener('click', handleTranspose);

  // Insert buttons before the settings button
  const settingsBtn = headerIcons.querySelector('.card-details-context-menu');
  if (settingsBtn) {
    headerIcons.insertBefore(transposeBtn, settingsBtn);
    headerIcons.insertBefore(renameBtn, settingsBtn);
  } else {
    headerIcons.appendChild(renameBtn);
    headerIcons.appendChild(transposeBtn);
  }

  // Mark as injected to prevent duplicates
  headerIcons.setAttribute('data-kanb-ext-injected', 'true');
}

// Inject CSS styles
function injectStyles() {
  if (document.getElementById('kanb-ext-styles')) return;

  const style = document.createElement('style');
  style.id = 'kanb-ext-styles';
  style.textContent = `
    .kanb-ext-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      background: #333;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transform: translateX(400px);
      transition: transform 0.3s ease;
    }
    
    .kanb-ext-notification.kanb-ext-show {
      transform: translateX(0);
    }
    
    .kanb-ext-notification.kanb-ext-success {
      background: #4caf50;
    }
    
    .kanb-ext-notification.kanb-ext-error {
      background: #f44336;
    }
    
    .kanb-ext-notification.kanb-ext-info {
      background: #2196f3;
    }
    
    .kanb-ext-rename-btn,
    .kanb-ext-transpose-btn {
      margin-right: 4px;
    }
    
    .kanb-ext-rename-btn:hover,
    .kanb-ext-transpose-btn:hover {
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);
}

// Initialize
function init() {
  injectStyles();
  
  // Initial injection
  injectButtons();
  
  // Watch for URL changes (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(injectButtons, 500);
    }
  }).observe(document, {subtree: true, childList: true});
  
  // Watch for modal opening
  const observer = new MutationObserver(() => {
    injectButtons();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}