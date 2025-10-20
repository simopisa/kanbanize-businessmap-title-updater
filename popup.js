let API_BASE = '';
let currentCardVersionId = null;
let showsettings = false;


function getApiKey() {
  return document.getElementById('apiKey').value.trim();
}
function getApiUrl() {
  API_BASE=document.getElementById('apiEP').value.trim();
  return document.getElementById('apiEP').value.trim();
}

function saveApiKey(apiKey) {
  chrome.storage.local.set({ "kanbanizeApiKey": apiKey }, function () {
    if (chrome.runtime.lastError) {
      console.error('Error saving API key:', chrome.runtime.lastError);
    }
  });
}

function saveApiUrl(apiUrl) {
  chrome.storage.local.set({ "kanbanizeApiUrl": apiUrl }, function () {
    if (chrome.runtime.lastError) {
      console.error('Error saving API Url:', chrome.runtime.lastError);
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  loadApiUrl(function(apiUrl){
    if(apiUrl){
      API_BASE=apiUrl;
      document.getElementById('apiEP').value = apiUrl;
    }
  });

  loadApiKey(function (apiKey) {
    if (apiKey) {
      document.getElementById('configSection').classList.add('hidden');

      document.getElementById('apiKey').value = apiKey;
      // Automatically load boards if API key exists
      loadBoards();
    }
  });

});


function loadApiKey(callback) {
  chrome.storage.local.get(["kanbanizeApiKey"], function (items) {
    if (chrome.runtime.lastError) {
      console.error('Error loading API key:', chrome.runtime.lastError);
      callback(null);
    } else {
      callback(items.kanbanizeApiKey || null);
    }
  });
}

function loadApiUrl(callback) {
  chrome.storage.local.get(["kanbanizeApiUrl"], function (items) {
    if (chrome.runtime.lastError) {
      console.error('Error loading API Url:', chrome.runtime.lastError);
      callback(null);
    } else {
      callback(items.kanbanizeApiUrl || null);
    }
  });
}
function showMessage(message, type = 'error') {
  const area = document.getElementById('messageArea');
  area.innerHTML = `<div class="${type}">${message}</div>`;
  setTimeout(() => area.innerHTML = '', 5000);
}

function showLoading(elementId) {
  document.getElementById(elementId).innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>Loading...</div>
    </div>
  `;
}

function apiCall(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: "apiCall",
      url: `${API_BASE}${endpoint}`,
      apiKey: getApiKey(),
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
}

async function loadBoards() {
  const apiKey = getApiKey();
  const apiUrl=getApiUrl();
  if (!apiUrl) {
    showMessage('Please enter an API Endpoint', 'error');
     document.getElementById('configSection').classList.remove('hidden');
    return;
  }
  
  if (!apiKey) {
    showMessage('Please enter an API key', 'error');
     document.getElementById('configSection').classList.remove('hidden');

    return;
  }
  

  // Save the API key for future use
  saveApiKey(apiKey);
  saveApiUrl(apiUrl);

  try {
    showLoading('boardList');
    document.getElementById('boardSection').classList.remove('hidden');
    document.getElementById('cardSection').classList.add('hidden');
    document.getElementById('configSection').classList.add('hidden');

    const result = await apiCall('/boards');
    const boards = result.data || [];

    if (boards.length === 0) {
      document.getElementById('boardList').innerHTML = '<p>No boards found</p>';
      return;
    }

    document.getElementById('boardList').innerHTML = `
      <div class="search-box">
        <input type="text" id="boardSearch" placeholder="🔍 Search boards..." />
      </div>
      <div id="boardListItems">
        ${renderBoards(boards)}
      </div>
    `;

    // Store boards for filtering
    window.allBoards = boards;

    // Add search listener
    document.getElementById('boardSearch').addEventListener('input', (e) => {
      filterBoards(e.target.value);
    });
  } catch (error) {
    showMessage(error.message, 'error');
    document.getElementById('boardList').innerHTML = '';
  }
}

function renderBoards(boards) {
  return boards.map(board => `
    <div class="board-item">
      <div class="board-info">
        <div class="board-name">${board.name}</div>
        <div class="board-meta">
          ID: ${board.board_id} | 
          ${board.is_archived ? 'Archived' : 'Active'}
        </div>
      </div>
      <button class="btn btn-small" data-boardid="${board.board_id}">
        View Cards
      </button>
    </div>
  `).join('');
}

function filterBoards(searchTerm) {
  const filtered = window.allBoards.filter(board =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    board.board_id.toString().includes(searchTerm)
  );
  document.getElementById('boardListItems').innerHTML = renderBoards(filtered);
}

async function loadCards(boardId) {
  try {
    showLoading('cardList');
    document.getElementById('boardSection').classList.add('hidden');
    document.getElementById('cardSection').classList.remove('hidden');

    const result = await apiCall(`/cards?board_ids=${boardId}`);
    const cards = result.data?.data || [];

    if (cards.length === 0) {
      document.getElementById('cardList').innerHTML = '<p>No cards found</p>';
      return;
    }

    // Store current board ID
    window.currentBoardId = boardId;

    document.getElementById('cardList').innerHTML = `
      <div class="card-header">
        <button class="btn btn-small btn-secondary" id="backToBoards">← Back to Boards</button>
      </div>
      <div class="search-box">
        <input type="text" id="cardSearch" placeholder="🔍 Search cards..." />
      </div>
      <div id="cardListItems">
        ${renderCards(cards)}
      </div>
    `;

    // Store cards for filtering
    window.allCards = cards;

    // Add search listener
    document.getElementById('cardSearch').addEventListener('input', (e) => {
      filterCards(e.target.value);
    });

    // Add back button listener
    document.getElementById('backToBoards').addEventListener('click', () => {
      document.getElementById('boardSection').classList.remove('hidden');
      document.getElementById('cardSection').classList.add('hidden');
    });
  } catch (error) {
    showMessage(error.message, 'error');
    document.getElementById('cardList').innerHTML = '';
  }
}

function renderCards(cards) {
  return cards.map(card => `
    <div class="card-item">
      <div class="card-info">
        <div class="card-title">${card.title}</div>
        <div class="card-meta">
          ID: ${card.card_id} | Custom ID: ${card.custom_id || 'N/A'}
        </div>
      </div>
      <div class="card-actions">
        <button class="btn btn-small" data-cardid="${card.card_id}" data-title="${escapeHtml(card.title)}" data-action="edit">
          ✏️ Edit
        </button>
        <button class="btn btn-small btn-transpose" data-cardid="${card.card_id}" data-title="${escapeHtml(card.title)}" data-action="transpose">
          ↕️ Transpose
        </button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function filterCards(searchTerm) {
  const filtered = window.allCards.filter(card =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.card_id.toString().includes(searchTerm) ||
    (card.custom_id && card.custom_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  document.getElementById('cardListItems').innerHTML = renderCards(filtered);
}

async function getCardDetails(cardId) {
  const result = await apiCall(`/cards/${cardId}`);
  return result.data;
}

async function getParents(cardId) {
  const result = await apiCall(`/cards/${cardId}/parents`);
  return result.data || [];
}

function openEditModal(cardId, title) {
  window.currentCardId = cardId;
  document.getElementById('currentTitle').value = title;
  document.getElementById('newTitle').value = title;
  document.getElementById('editModal').classList.add('active');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('active');
  window.currentCardId = null;
  currentCardVersionId = null;
}

function extractVersionNumber(title) {
  // Match version numbers like 1, 1.2, 1.2.3, etc.
  const match = title.match(/^(\d+(?:\.\d+)*)/);
  return match ? match[1] : null;
}

function replaceVersionInTitle(title, oldVersion, newVersion) {
  // Replace version at the start of title with word boundary
  return title.replace(new RegExp(`^${oldVersion.replace(/\./g, '\\.')}\\b`), newVersion);
}

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

async function getChildren(cardId) {
  const result = await apiCall(`/cards/${cardId}/children`);
  return result.data || [];
}

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

async function saveTitle() {
  const newTitle = document.getElementById('newTitle').value.trim();
  const oldTitle = document.getElementById('currentTitle').value;

  if (!newTitle) {
    showMessage('Please enter a new title', 'error');
    return;
  }

  const oldVersion = extractVersionNumber(oldTitle);
  const newVersion = extractVersionNumber(newTitle);

  if (!oldVersion || !newVersion) {
    showMessage('Could not detect version number in format like 1, 2.1, or 2.1.3', 'error');
    return;
  }

  try {
    showMessage('Updating card title and children...', 'progress-info');


    await updateCardTitle(window.currentCardId, newTitle);
    await updateChildrenRecursively(window.currentCardId, oldVersion, newVersion);

    showMessage('✓ Card and all children updated successfully!', 'success');

    setTimeout(() => {
      if (window.currentBoardId) {
        loadCards(window.currentBoardId);
      }
    }, 1500);
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  }
  closeModal();
}

async function transposeCard(cardId, title) {
  const version = extractVersionNumber(title);

  if (!version) {
    showMessage('Could not detect version number for transposition', 'error');
    return;
  }

  try {
    showMessage('Transposing cards...', 'progress-info');

    // Get parents
    const parents = await getParents(cardId);

    if (parents.length === 0) {
      showMessage('This card has no parent. Cannot transpose.', 'error');
      return;
    }

    const parentId = parents[0].card_id;

    // Get all siblings (children of parent)
    const siblings = await getChildren(parentId);

    // Sort siblings by position
    siblings.sort((a, b) => a.position - b.position);

    // Find current card position
    const currentIndex = siblings.findIndex(s => s.card_id.toString() === cardId);

    if (currentIndex === -1) {
      showMessage('Could not find card in parent children', 'error');
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

    showMessage('✓ Cards transposed successfully!', 'success');

    setTimeout(() => {
      if (window.currentBoardId) {
        loadCards(window.currentBoardId);
      }
    }, 1500);
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  }
}

// UI Event Bindings
document.getElementById('loadBoardsBtn').addEventListener('click', loadBoards);

document.getElementById('boardList').addEventListener('click', function (e) {
  if (e.target.matches('.btn-small[data-boardid]')) {
    loadCards(e.target.getAttribute('data-boardid'));
  }
});

document.getElementById('settingsBtn').addEventListener('click', function (e) {
  if (showsettings) {
    document.getElementById('configSection').classList.add('hidden');
    showsettings = false;
  } else {
    document.getElementById('configSection').classList.remove('hidden');
    showsettings = true;
  }
});

document.getElementById('cardList').addEventListener('click', function (e) {
  const target = e.target;

  if (target.matches('.btn-small[data-cardid]')) {
    const cardId = target.getAttribute('data-cardid');
    const title = target.getAttribute('data-title');
    const action = target.getAttribute('data-action');

    if (action === 'edit') {
      openEditModal(cardId, title);
    } else if (action === 'transpose') {
      if (confirm(`Transpose card "${title}"?\n\nThis will increment the version numbers of all cards that come after it.`)) {
        transposeCard(cardId, title);
      }
    }
  }
});

document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
document.getElementById('saveTitleBtn').addEventListener('click', saveTitle);