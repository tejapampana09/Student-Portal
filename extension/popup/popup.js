document.addEventListener("DOMContentLoaded", async () => {
  const toggleEnabled = document.getElementById("toggleEnabled");
  const toggleFocus = document.getElementById("toggleFocus");
  const btnSolveNow = document.getElementById("btnSolveNow");
  const statusBadge = document.getElementById("statusBadge");
  const statusText = document.getElementById("statusText");

  // Load saved settings
  const settings = await chrome.storage.local.get({
    enabled: true,
    autoFocus: true,
  });

  toggleEnabled.checked = settings.enabled;
  toggleFocus.checked = settings.autoFocus;
  updateStatus(settings.enabled);

  function updateStatus(enabled) {
    if (enabled) {
      statusBadge.classList.remove("disabled");
      statusText.textContent = "Active";
    } else {
      statusBadge.classList.add("disabled");
      statusText.textContent = "Paused";
    }
  }

  toggleEnabled.addEventListener("change", async (e) => {
    const isChecked = e.target.checked;
    await chrome.storage.local.set({ enabled: isChecked });
    updateStatus(isChecked);
  });

  toggleFocus.addEventListener("change", async (e) => {
    await chrome.storage.local.set({ autoFocus: e.target.checked });
  });

  btnSolveNow.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "SOLVE_NOW" });
      }
    } catch (err) {
      console.warn("Could not dispatch to active tab:", err);
    }
  });
});
