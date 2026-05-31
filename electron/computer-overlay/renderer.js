const statusEl = document.querySelector("[data-status]");
const stopButton = document.querySelector("[data-stop]");

window.computerOverlay?.onState?.((payload = {}) => {
  if (statusEl && payload.status) statusEl.textContent = payload.status;
  stopButton?.classList.toggle("is-stopping", payload.stopping === true);
  if (stopButton) {
    stopButton.disabled = payload.stopping === true;
    stopButton.setAttribute("aria-label", payload.stopping ? "Stopping Computer Use" : "Stop Computer Use");
  }
});

stopButton?.addEventListener("click", async () => {
  if (stopButton.disabled) return;
  stopButton.classList.add("is-stopping");
  stopButton.disabled = true;
  if (statusEl) statusEl.textContent = "Stopping";
  await window.computerOverlay?.stop?.();
});
