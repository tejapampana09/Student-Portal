/**
 * Student Corner SRM AP - Automated Captcha Solver Bookmarklet
 * Compatible with Mobile Chrome, Safari iOS, Kiwi Browser, and Desktop Browsers.
 */
(function () {
  "use strict";

  // Prevent multiple simultaneous runs
  if (window.__srm_captcha_solving) return;
  window.__srm_captcha_solving = true;

  // Determine portal server origin
  let serverOrigin = "https://52-66-250-175.sslip.io";
  try {
    const scripts = document.querySelectorAll("script[src*='bookmarklet.js']");
    if (scripts.length > 0) {
      const src = scripts[scripts.length - 1].getAttribute("src");
      const url = new URL(src, window.location.href);
      if (url.origin && !url.origin.includes("student.srmap.edu.in")) {
        serverOrigin = url.origin;
      }
    }
  } catch (e) {}

  function showToast(message, type) {
    let toast = document.getElementById("__srm_toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "__srm_toast";
      toast.style.cssText = [
        "position: fixed",
        "top: 20px",
        "left: 50%",
        "transform: translateX(-50%) translateY(-20px)",
        "z-index: 2147483647",
        "padding: 12px 22px",
        "border-radius: 9999px",
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        "font-size: 14px",
        "font-weight: 600",
        "color: #ffffff",
        "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
        "transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "pointer-events: none",
        "display: flex",
        "align-items: center",
        "gap: 8px",
        "opacity: 0",
      ].join(";");
      document.body.appendChild(toast);
    }

    const bgColors = {
      info: "linear-gradient(135deg, #2563eb, #1d4ed8)",
      success: "linear-gradient(135deg, #10b981, #059669)",
      warning: "linear-gradient(135deg, #f59e0b, #d97706)",
      error: "linear-gradient(135deg, #ef4444, #dc2626)",
    };

    toast.style.background = bgColors[type] || bgColors.info;
    toast.innerHTML = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";

    clearTimeout(window.__srm_toast_timer);
    window.__srm_toast_timer = setTimeout(() => {
      if (toast) {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(-20px)";
      }
      window.__srm_captcha_solving = false;
    }, type === "info" ? 10000 : 3500);
  }

  showToast("⏳ <span>AI Reading SRM Captcha...</span>", "info");

  // Locate the Captcha Image on SRM page
  let img = document.querySelector("img[src*='captchas'], img[src*='captcha'], #imgCaptcha, img[id*='captcha' i]");

  if (!img) {
    // Fallback search: find any img tag whose dimensions match typical SRM captcha (approx 100-200w, 30-70h)
    const allImgs = Array.from(document.querySelectorAll("img"));
    img = allImgs.find((el) => {
      const src = el.src || "";
      const w = el.naturalWidth || el.width;
      const h = el.naturalHeight || el.height;
      return (
        src.toLowerCase().includes("captcha") ||
        (w >= 80 && w <= 250 && h >= 25 && h <= 80 && !src.includes("logo"))
      );
    });
  }

  // Locate the input box for Captcha
  const input = document.querySelector("input[name='ccode'], #ccode, input[id*='captcha' i], input[name*='captcha' i]");

  if (!img) {
    showToast("❌ Captcha image not found on this page", "error");
    window.__srm_captcha_solving = false;
    return;
  }

  if (!input) {
    showToast("❌ Captcha input box not found", "error");
    window.__srm_captcha_solving = false;
    return;
  }

  try {
    // Render current visual canvas without refreshing the server session
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 120;
    canvas.height = img.naturalHeight || img.height || 40;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const base64Data = canvas.toDataURL("image/png");

    fetch(serverOrigin + "/api/captcha/solve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ image: base64Data }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || `HTTP ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        const code = (data.captcha || data.text || "").trim();
        if (!code) throw new Error("Empty captcha result");

        // Fill input
        input.value = code;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.focus();

        showToast(`✨ Solved: <strong>${code}</strong>`, "success");

        // Focus submit button
        const submitBtn = document.querySelector("input[type='submit'], button[type='submit'], #btnLogin, #btnSubmit, input[value*='Sign' i], input[value*='Login' i]");
        if (submitBtn) {
          submitBtn.focus();
        }
      })
      .catch((err) => {
        console.error("[SRM Captcha Solver]", err);
        showToast(`⚠️ Solver error: ${err.message || "Failed to reach server"}`, "error");
      })
      .finally(() => {
        setTimeout(() => {
          window.__srm_captcha_solving = false;
        }, 1500);
      });
  } catch (canvasErr) {
    console.error("[SRM Captcha Canvas Error]", canvasErr);
    showToast("⚠️ Could not read image canvas", "error");
    window.__srm_captcha_solving = false;
  }
})();
