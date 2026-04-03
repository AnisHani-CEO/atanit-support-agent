/**
 * Atanit Brain Care — Chat Widget de Support Client
 * À installer dans le thème Shopify via Settings > Custom Code
 *
 * INSTRUCTIONS:
 *   1. Remplacez SUPPORT_AGENT_URL par l'URL de votre backend déployé
 *   2. Collez ce script dans Shopify Admin > Online Store > Themes > Edit code
 *      → Fichier: layout/theme.liquid, avant </body>
 */

(function () {
  "use strict";

  // ─── Configuration ─────────────────────────────────────────────────────────
  const CONFIG = {
    agentUrl: "https://web-production-03396.up.railway.app/chat",
    primaryColor: "#2D5BE3",
    accentColor: "#5B8AF0",
    storeName: "Atanit Brain Care",
    welcomeMessageFR: "👋 Bonjour ! Je suis l'assistant support d'Atanit Brain Care. Comment puis-je vous aider ?",
    welcomeMessageEN: "👋 Hello! I'm the Atanit Brain Care support assistant. How can I help you?",
    placeholder: "Écrivez votre message... / Type your message...",
    position: "bottom-right", // "bottom-right" ou "bottom-left"
  };

  // ─── Génération d'un ID de session unique ────────────────────────────────────
  function getSessionId() {
    let id = sessionStorage.getItem("atanit_session_id");
    if (!id) {
      id = "session_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      sessionStorage.setItem("atanit_session_id", id);
    }
    return id;
  }

  // ─── Injection des styles CSS ────────────────────────────────────────────────
  function injectStyles() {
    const css = `
      #atanit-chat-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

      #atanit-chat-toggle {
        position: fixed;
        ${CONFIG.position === "bottom-right" ? "right: 24px;" : "left: 24px;"}
        bottom: 24px;
        width: 60px;
        height: 60px;
        background: ${CONFIG.primaryColor};
        border-radius: 50%;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(45,91,227,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      #atanit-chat-toggle:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(45,91,227,0.5); }
      #atanit-chat-toggle svg { width: 28px; height: 28px; fill: white; }
      #atanit-chat-toggle .atanit-badge {
        position: absolute;
        top: 0; right: 0;
        background: #EF4444;
        color: white;
        font-size: 11px;
        font-weight: 700;
        width: 18px; height: 18px;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
      }

      #atanit-chat-box {
        position: fixed;
        ${CONFIG.position === "bottom-right" ? "right: 24px;" : "left: 24px;"}
        bottom: 96px;
        width: 380px;
        max-width: calc(100vw - 32px);
        height: 560px;
        max-height: calc(100vh - 120px);
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.18);
        display: none;
        flex-direction: column;
        z-index: 9998;
        overflow: hidden;
        animation: atanit-slideUp 0.25s ease;
      }
      @keyframes atanit-slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #atanit-chat-box.atanit-open { display: flex; }

      .atanit-header {
        background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
      }
      .atanit-header-avatar {
        width: 40px; height: 40px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }
      .atanit-header-info { flex: 1; }
      .atanit-header-name { font-weight: 700; font-size: 15px; }
      .atanit-header-status { font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 4px; }
      .atanit-header-status::before {
        content: ''; display: inline-block;
        width: 7px; height: 7px;
        background: #4ADE80; border-radius: 50%;
      }
      .atanit-close-btn {
        background: none; border: none; cursor: pointer; color: white; opacity: 0.8; padding: 4px;
      }
      .atanit-close-btn:hover { opacity: 1; }
      .atanit-close-btn svg { width: 20px; height: 20px; fill: white; }

      .atanit-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #F8FAFF;
      }
      .atanit-messages::-webkit-scrollbar { width: 4px; }
      .atanit-messages::-webkit-scrollbar-track { background: transparent; }
      .atanit-messages::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }

      .atanit-msg {
        display: flex;
        gap: 8px;
        max-width: 88%;
        animation: atanit-fadeIn 0.2s ease;
      }
      @keyframes atanit-fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .atanit-msg.atanit-user { align-self: flex-end; flex-direction: row-reverse; }
      .atanit-msg.atanit-bot { align-self: flex-start; }

      .atanit-msg-avatar {
        width: 30px; height: 30px; border-radius: 50%;
        background: ${CONFIG.primaryColor};
        color: white; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; margin-top: 2px;
      }
      .atanit-msg.atanit-user .atanit-msg-avatar { background: #64748B; }

      .atanit-msg-bubble {
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        color: #1E293B;
        background: white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        word-break: break-word;
      }
      .atanit-msg.atanit-user .atanit-msg-bubble {
        background: ${CONFIG.primaryColor};
        color: white;
        border-bottom-right-radius: 4px;
      }
      .atanit-msg.atanit-bot .atanit-msg-bubble { border-bottom-left-radius: 4px; }

      /* Markdown rendering dans la bulle */
      .atanit-msg-bubble strong { font-weight: 700; }
      .atanit-msg-bubble em { font-style: italic; }
      .atanit-msg-bubble a { color: ${CONFIG.primaryColor}; text-decoration: underline; }
      .atanit-msg.atanit-user .atanit-msg-bubble a { color: #BAD0FF; }
      .atanit-msg-bubble ul, .atanit-msg-bubble ol { padding-left: 18px; margin: 4px 0; }
      .atanit-msg-bubble li { margin: 2px 0; }
      .atanit-msg-bubble p { margin: 0 0 6px; }
      .atanit-msg-bubble p:last-child { margin: 0; }

      .atanit-typing {
        display: none;
        align-self: flex-start;
        gap: 8px;
        align-items: center;
      }
      .atanit-typing.atanit-visible { display: flex; }
      .atanit-typing-dots {
        display: flex; gap: 4px;
        background: white;
        padding: 12px 16px;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      }
      .atanit-typing-dot {
        width: 7px; height: 7px;
        background: #94A3B8;
        border-radius: 50%;
        animation: atanit-bounce 1.2s infinite;
      }
      .atanit-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .atanit-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes atanit-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }

      .atanit-quick-replies {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 16px 0;
      }
      .atanit-qr-btn {
        background: white;
        border: 1.5px solid ${CONFIG.primaryColor};
        color: ${CONFIG.primaryColor};
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .atanit-qr-btn:hover { background: ${CONFIG.primaryColor}; color: white; }

      .atanit-input-area {
        padding: 12px 16px;
        border-top: 1px solid #E2E8F0;
        background: white;
        display: flex;
        gap: 10px;
        align-items: flex-end;
      }
      #atanit-input {
        flex: 1;
        border: 1.5px solid #E2E8F0;
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 14px;
        outline: none;
        resize: none;
        max-height: 80px;
        line-height: 1.4;
        color: #1E293B;
        transition: border-color 0.15s;
      }
      #atanit-input:focus { border-color: ${CONFIG.primaryColor}; }
      #atanit-input::placeholder { color: #94A3B8; }
      #atanit-send-btn {
        width: 40px; height: 40px;
        background: ${CONFIG.primaryColor};
        border: none;
        border-radius: 10px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, transform 0.1s;
        flex-shrink: 0;
      }
      #atanit-send-btn:hover { background: ${CONFIG.accentColor}; transform: scale(1.05); }
      #atanit-send-btn:disabled { background: #CBD5E1; cursor: not-allowed; transform: none; }
      #atanit-send-btn svg { width: 18px; height: 18px; fill: white; }

      .atanit-footer {
        text-align: center;
        font-size: 11px;
        color: #94A3B8;
        padding: 6px;
        background: white;
      }
      .atanit-footer a { color: #94A3B8; text-decoration: none; }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── Rendu simple Markdown → HTML ────────────────────────────────────────────
  function renderMarkdown(text) {
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/^•\s+(.+)$/gm, "<li>$1</li>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^(.+)$/, "<p>$1</p>");
  }

  // ─── Construction du widget ───────────────────────────────────────────────────
  function buildWidget() {
    const wrapper = document.createElement("div");
    wrapper.id = "atanit-chat-widget";

    wrapper.innerHTML = `
      <!-- Bouton toggle -->
      <button id="atanit-chat-toggle" aria-label="Ouvrir le support">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <span class="atanit-badge" id="atanit-badge">1</span>
      </button>

      <!-- Fenêtre de chat -->
      <div id="atanit-chat-box" role="dialog" aria-label="Support Chat">
        <div class="atanit-header">
          <div class="atanit-header-avatar">🧠</div>
          <div class="atanit-header-info">
            <div class="atanit-header-name">Atanit Support</div>
            <div class="atanit-header-status">En ligne / Online</div>
          </div>
          <button class="atanit-close-btn" id="atanit-close-btn" aria-label="Fermer">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <div class="atanit-messages" id="atanit-messages"></div>

        <!-- Indicateur de frappe -->
        <div class="atanit-typing" id="atanit-typing">
          <div class="atanit-msg-avatar">🧠</div>
          <div class="atanit-typing-dots">
            <span class="atanit-typing-dot"></span>
            <span class="atanit-typing-dot"></span>
            <span class="atanit-typing-dot"></span>
          </div>
        </div>

        <!-- Réponses rapides -->
        <div class="atanit-quick-replies" id="atanit-quick-replies">
          <button class="atanit-qr-btn" data-msg="Où est ma commande ?">📦 Ma commande</button>
          <button class="atanit-qr-btn" data-msg="Quels sont vos produits ?">🧠 Produits</button>
          <button class="atanit-qr-btn" data-msg="Quelle est votre politique de retour ?">↩️ Retours</button>
          <button class="atanit-qr-btn" data-msg="Parler à un agent humain">👤 Humain</button>
        </div>

        <div class="atanit-input-area">
          <textarea
            id="atanit-input"
            rows="1"
            placeholder="${CONFIG.placeholder}"
            aria-label="Message"
          ></textarea>
          <button id="atanit-send-btn" aria-label="Envoyer">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <div class="atanit-footer">Powered by <a href="https://www.anthropic.com" target="_blank">Claude AI</a></div>
      </div>
    `;

    document.body.appendChild(wrapper);
  }

  // ─── Logique du chat ──────────────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  const sessionId = getSessionId();

  function addMessage(text, sender) {
    const container = document.getElementById("atanit-messages");
    const msgDiv = document.createElement("div");
    msgDiv.className = `atanit-msg atanit-${sender}`;

    const avatar = document.createElement("div");
    avatar.className = "atanit-msg-avatar";
    avatar.textContent = sender === "bot" ? "🧠" : "👤";

    const bubble = document.createElement("div");
    bubble.className = "atanit-msg-bubble";
    bubble.innerHTML = renderMarkdown(text);

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    container.appendChild(msgDiv);

    // Scroll vers le bas
    container.scrollTop = container.scrollHeight;
  }

  function setTyping(visible) {
    const el = document.getElementById("atanit-typing");
    const container = document.getElementById("atanit-messages");
    el.classList.toggle("atanit-visible", visible);
    if (visible) container.scrollTop = container.scrollHeight;
  }

  function setLoading(loading) {
    isLoading = loading;
    const btn = document.getElementById("atanit-send-btn");
    const input = document.getElementById("atanit-input");
    btn.disabled = loading;
    input.disabled = loading;
    setTyping(loading);
  }

  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    // Masquer quick replies après premier message
    document.getElementById("atanit-quick-replies").style.display = "none";

    addMessage(text, "user");
    setLoading(true);

    try {
      const response = await fetch(CONFIG.agentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!response.ok) throw new Error("Erreur réseau");
      const data = await response.json();
      addMessage(data.message, "bot");
    } catch (err) {
      addMessage(
        "❌ Désolé, une erreur est survenue. Veuillez réessayer ou contacter **support@atanit-brain-care.com**.",
        "bot"
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleChat() {
    isOpen = !isOpen;
    const box = document.getElementById("atanit-chat-box");
    const badge = document.getElementById("atanit-badge");
    box.classList.toggle("atanit-open", isOpen);
    badge.style.display = "none";

    if (isOpen && document.getElementById("atanit-messages").children.length === 0) {
      // Message de bienvenue basé sur la langue du navigateur
      const lang = navigator.language || "fr";
      const welcome = lang.startsWith("fr") ? CONFIG.welcomeMessageFR : CONFIG.welcomeMessageEN;
      setTimeout(() => addMessage(welcome, "bot"), 300);
    }

    if (isOpen) {
      setTimeout(() => document.getElementById("atanit-input").focus(), 100);
    }
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────────
  function attachEvents() {
    // Toggle
    document.getElementById("atanit-chat-toggle").addEventListener("click", toggleChat);
    document.getElementById("atanit-close-btn").addEventListener("click", toggleChat);

    // Envoi avec le bouton
    document.getElementById("atanit-send-btn").addEventListener("click", () => {
      const input = document.getElementById("atanit-input");
      sendMessage(input.value);
      input.value = "";
      input.style.height = "auto";
    });

    // Envoi avec Entrée (Shift+Entrée pour nouvelle ligne)
    document.getElementById("atanit-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const input = e.target;
        sendMessage(input.value);
        input.value = "";
        input.style.height = "auto";
      }
    });

    // Auto-resize du textarea
    document.getElementById("atanit-input").addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 80) + "px";
    });

    // Quick replies
    document.getElementById("atanit-quick-replies").addEventListener("click", (e) => {
      const btn = e.target.closest(".atanit-qr-btn");
      if (btn) sendMessage(btn.dataset.msg);
    });
  }

  // ─── Initialisation ───────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildWidget();
    attachEvents();

    // Afficher le badge de notification après 3 secondes
    setTimeout(() => {
      const badge = document.getElementById("atanit-badge");
      if (!isOpen) {
        badge.style.display = "flex";
        badge.textContent = "1";
      }
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
