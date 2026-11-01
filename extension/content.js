/**
 * SRM AP Captcha Auto-Solver Content Script
 * Automatically triggers on SRM Student Portal login page.
 */
(async function () {
  "use strict";

  // Check if current page is the login page or has the captcha input
  const isLoginPage =
    window.location.href.includes("StudentLoginPage") ||
    !!document.querySelector("input[name='ccode'], #ccode");

  if (!isLoginPage) return;

  // Read user preferences
  const config = await new Promise((resolve) => {
    chrome.storage.local.get(
      {
        enabled: true,
        serverUrl: "https://52-66-250-175.sslip.io",
        autoFocus: true,
      },
      resolve
    );
  });

  if (!config.enabled) {
    console.log("[SRM Captcha Extension] Auto-solve is disabled in settings.");
    return;
  }

  // Floating Status Pill UI
  function showStatus(text, type) {
    let pill = document.getElementById("__srm_ext_pill");
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "__srm_ext_pill";
      pill.style.cssText = [
        "position: fixed",
        "top: 16px",
        "right: 16px",
        "z-index: 2147483647",
        "padding: 8px 16px",
        "border-radius: 9999px",
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        "font-size: 13px",
        "font-weight: 600",
        "color: #ffffff",
        "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25)",
        "transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "pointer-events: none",
        "display: flex",
        "align-items: center",
        "gap: 8px",
        "opacity: 0",
        "transform: translateY(-8px)",
      ].join(";");
      document.body.appendChild(pill);
    }

    const colors = {
      info: "linear-gradient(135deg, #2563eb, #1d4ed8)",
      success: "linear-gradient(135deg, #10b981, #059669)",
      error: "linear-gradient(135deg, #ef4444, #dc2626)",
    };

    pill.style.background = colors[type] || colors.info;
    pill.innerHTML = text;
    pill.style.opacity = "1";
    pill.style.transform = "translateY(0)";

    clearTimeout(window.__srm_ext_timer);
    window.__srm_ext_timer = setTimeout(() => {
      if (pill) {
        pill.style.opacity = "0";
        pill.style.transform = "translateY(-8px)";
      }
    }, type === "info" ? 8000 : 3500);
  }

  // Locate Captcha Image with retry mechanism
  function findCaptchaImage() {
    let img = document.querySelector("img[src*='captchas'], img[src*='captcha'], #imgCaptcha, img[id*='captcha' i]");
    if (img) return img;

    const allImgs = Array.from(document.querySelectorAll("img"));
    return allImgs.find((el) => {
      const src = el.src || "";
      const w = el.naturalWidth || el.width;
      const h = el.naturalHeight || el.height;
      return (
        src.toLowerCase().includes("captcha") ||
        (w >= 80 && w <= 250 && h >= 25 && h <= 80 && !src.includes("logo"))
      );
    });
  }

  async function solveCaptchaProcess() {
    showStatus("⚡ <span>Reading SRM Captcha...</span>", "info");

    let img = null;
    for (let i = 0; i < 15; i++) {
      img = findCaptchaImage();
      if (img && (img.complete || img.naturalWidth > 0)) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    const input = document.querySelector("input[name='ccode'], #ccode, input[id*='captcha' i], input[name*='captcha' i]");

    if (!img) {
      showStatus("❌ Captcha image not found", "error");
      return;
    }

    if (!input) {
      showStatus("❌ Captcha input not found", "error");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width || 120;
      canvas.height = img.naturalHeight || img.height || 40;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const base64Data = canvas.toDataURL("image/png");

      const res = await fetch(`${config.serverUrl}/api/captcha/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ image: base64Data }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const code = (data.captcha || data.text || "").trim();

      if (!code) throw new Error("Empty response from AI solver");

      // Auto-fill into the input field
      input.value = code;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      showStatus(`✨ Solved: <strong>${code}</strong>`, "success");

      // If user hasn't filled password or wants quick login
      if (config.autoFocus) {
        const pwdInput = document.querySelector("input[type='password'], input[name='txtAuthKey']");
        const submitBtn = document.querySelector("input[type='submit'], button[type='submit'], #btnLogin, #btnSubmit");
        if (pwdInput && !pwdInput.value) {
          pwdInput.focus();
        } else if (submitBtn) {
          submitBtn.focus();
        }
      }
    } catch (err) {
      console.error("[SRM Captcha Extension Error]:", err);
      showStatus(`⚠️ Solver: ${err.message || "Failed"}`, "error");
    }
  }

  // Trigger automatically when page loads
  setTimeout(solveCaptchaProcess, 300);

  // Listen for manual triggers from extension popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "SOLVE_NOW") {
      solveCaptchaProcess();
      sendResponse({ status: "started" });
    }
    return true;
  });
})();
