chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "apiCall") {
    fetch(request.url, {
      method: request.method || "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "apikey": request.apiKey,
        ...request.headers
      },
      body: request.body ? JSON.stringify(request.body) : undefined
    })
      .then(async response => {
        const data = await response.json();
        sendResponse({ status: response.status, data });
      })
      .catch(error => {
        sendResponse({ status: "error", message: error.message });
      });
    return true; // Keeps the message channel open for async response
  }
});