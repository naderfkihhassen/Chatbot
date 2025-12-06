const apiKeySetup = document.getElementById("api-key-setup");
const chatInterface = document.getElementById("chat-interface");
const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const changeKeyBtn = document.getElementById("change-key-btn");

const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");
const modelSelect = document.getElementById("model-select");
const status = document.getElementById("status");

let messages = [];

init();

function init() {
  const apiKey = getApiKey();

  if (apiKey) {
    showChatInterface();
  } else {
    showApiKeySetup();
  }
}

function getApiKey() {
  return localStorage.getItem("openrouter-api-key");
}

function saveApiKey(key) {
  localStorage.setItem("openrouter-api-key", key);
}

function removeApiKey() {
  localStorage.removeItem("openrouter-api-key");
}

function showApiKeySetup() {
  apiKeySetup.classList.remove("hidden");
  chatInterface.classList.add("hidden");
  apiKeyInput.focus();
}

function showChatInterface() {
  apiKeySetup.classList.add("hidden");
  chatInterface.classList.remove("hidden");
  userInput.focus();
}

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    alert("Please enter an API key");
    return;
  }

  if (!key.startsWith("sk-or-v1-")) {
    alert('Invalid API key format. OpenRouter keys start with "sk-or-v1-"');
    return;
  }

  saveApiKey(key);
  apiKeyInput.value = "";
  showChatInterface();
  status.textContent = "API key saved securely!";
  setTimeout(() => (status.textContent = ""), 3000);
});

changeKeyBtn.addEventListener("click", () => {
  if (confirm("Change API key? This will clear your chat history.")) {
    removeApiKey();
    messages = [];
    chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome!</h2>
                <p>Start chatting with AI. Choose a model above and type your message below.</p>
            </div>
        `;
    showApiKeySetup();
  }
});

apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    saveKeyBtn.click();
  }
});

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Clear chat
clearBtn.addEventListener("click", () => {
  if (confirm("Clear all messages?")) {
    messages = [];
    chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome!</h2>
                <p>Start chatting with AI. Choose a model above and type your message below.</p>
            </div>
        `;
    status.textContent = "";
  }
});

async function sendMessage() {
  const userMessage = userInput.value.trim();

  if (!userMessage) return;

  const apiKey = getApiKey();

  if (!apiKey) {
    alert("No API key found. Please set up your API key first.");
    showApiKeySetup();
    return;
  }

  userInput.value = "";

  const welcomeMsg = chatContainer.querySelector(".welcome-message");
  if (welcomeMsg) {
    welcomeMsg.remove();
  }

  addMessage("user", userMessage);
  messages.push({ role: "user", content: userMessage });

  const loadingId = addLoadingMessage();

  sendBtn.disabled = true;
  status.textContent = "AI is thinking...";

  try {
    const model = modelSelect.value;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Simple AI Chat",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API request failed");
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    removeLoadingMessage(loadingId);

    addMessage("assistant", aiMessage);
    messages.push({ role: "assistant", content: aiMessage });

    status.textContent = "Message sent!";
    setTimeout(() => (status.textContent = ""), 3000);
  } catch (error) {
    removeLoadingMessage(loadingId);
    status.textContent = `Error: ${error.message}`;
    console.error("Error:", error);

    addMessage(
      "assistant",
      `❌ Error: ${error.message}\n\nPlease check:\n- Your API key is correct\n- You have credits in your account\n- Your internet connection`
    );
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

function addMessage(role, content) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;

  const avatar = role === "user" ? "👤" : "🤖";
  const roleName = role === "user" ? "You" : "AI";

  messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-role">${roleName}</div>
            <div class="message-text">${escapeHtml(content)}</div>
        </div>
    `;

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addLoadingMessage() {
  const loadingId = Date.now();
  const messageDiv = document.createElement("div");
  messageDiv.className = "message assistant loading";
  messageDiv.id = `loading-${loadingId}`;

  messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-role">AI</div>
            <div class="message-text">
                <span>Thinking</span>
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return loadingId;
}

function removeLoadingMessage(loadingId) {
  const loadingMsg = document.getElementById(`loading-${loadingId}`);
  if (loadingMsg) {
    loadingMsg.remove();
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
