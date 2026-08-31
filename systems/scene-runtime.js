(function (root) {
  "use strict";

  var registry = Object.create(null);
  var order = [];
  var params = new URLSearchParams(root.location ? root.location.search : "");
  var requestedId = params.get("scene") || "mare-infinitus";
  var screensaver = params.get("screensaver") === "1";
  var activeId = requestedId;
  var photoMode = false;
  var soundscape = null;

  function register(pack) {
    if (!pack || typeof pack.id !== "string" || !pack.id) throw new Error("A scene pack needs a stable id.");
    if (!registry[pack.id]) order.push(pack.id);
    registry[pack.id] = Object.freeze(pack);
    return registry[pack.id];
  }

  function list() {
    return order.map(function (id) { return registry[id]; });
  }

  function active() {
    return registry[activeId] || registry["mare-infinitus"] || null;
  }

  function sceneUrl(id) {
    var url = new URL(root.location.href);
    if (id === "mare-infinitus") url.searchParams.delete("scene");
    else url.searchParams.set("scene", id);
    url.searchParams.delete("debug");
    return url.pathname + url.search + url.hash;
  }

  function switchTo(id) {
    if (!registry[id] || id === activeId) return false;
    root.location.assign(sceneUrl(id));
    return true;
  }

  function capture(canvas, suggestedName) {
    if (!canvas || !canvas.toBlob) return false;
    var rect = canvas.getBoundingClientRect();
    var exportCanvas = document.createElement("canvas");
    exportCanvas.width = Math.max(canvas.width, Math.round(rect.width));
    exportCanvas.height = Math.max(canvas.height, Math.round(rect.height));
    var exportContext = exportCanvas.getContext("2d", { alpha: false });
    exportContext.imageSmoothingEnabled = false;
    exportContext.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);
    exportCanvas.toBlob(function (blob) {
      if (!blob) return;
      var anchor = document.createElement("a");
      anchor.download = (suggestedName || activeId) + "-" + new Date().toISOString().replace(/[:.]/g, "-") + ".png";
      anchor.href = URL.createObjectURL(blob);
      anchor.click();
      root.setTimeout(function () { URL.revokeObjectURL(anchor.href); }, 1500);
    }, "image/png");
    return true;
  }

  function setPhotoMode(next) {
    if (screensaver) return false;
    photoMode = !!next;
    var shell = document.querySelector(".mare-shell");
    if (shell) shell.classList.toggle("photo-mode", photoMode);
    var button = document.querySelector("[data-photo-toggle]");
    if (button) {
      button.setAttribute("aria-pressed", photoMode ? "true" : "false");
      button.title = photoMode ? "Press C to save this frame; P or Escape to leave photo mode" : "Enter photo mode (P)";
    }
    return photoMode;
  }

  function ensureSoundscape() {
    if (!soundscape && root.LivingSoundscape) {
      var pack = active();
      soundscape = root.LivingSoundscape.create(pack && pack.sound || {});
    }
    return soundscape;
  }

  function toggleSound() {
    if (screensaver) return false;
    var sound = ensureSoundscape();
    if (!sound) return false;
    var enabled = sound.toggle();
    var button = document.querySelector("[data-sound-toggle]");
    if (button) {
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      button.querySelector("b").textContent = enabled ? "SOUND ON" : "SOUND";
    }
    return enabled;
  }

  function updateAudio(signals) {
    if (soundscape) soundscape.update(signals || {});
  }

  function renderPicker() {
    var listElement = document.querySelector("[data-scene-list]");
    if (!listElement) return;
    listElement.textContent = "";
    list().forEach(function (pack) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "scene-card" + (pack.id === activeId ? " is-active" : "");
      button.dataset.sceneId = pack.id;
      button.innerHTML = "<span>" + String(pack.index || "WORLD").replace(/[<>]/g, "") + "</span>" +
        "<strong>" + String(pack.title).replace(/[<>]/g, "") + "</strong>" +
        "<small>" + String(pack.shortDescription || "").replace(/[<>]/g, "") + "</small>";
      button.addEventListener("click", function () { switchTo(pack.id); });
      listElement.appendChild(button);
    });
  }

  function setPickerOpen(next) {
    if (screensaver) return;
    var panel = document.querySelector("[data-scene-picker]");
    var button = document.querySelector("[data-scene-toggle]");
    if (!panel) return;
    panel.hidden = !next;
    if (button) button.setAttribute("aria-expanded", next ? "true" : "false");
  }

  function bindChrome() {
    var pack = active();
    if (pack) {
      activeId = pack.id;
      document.documentElement.dataset.scene = pack.id;
    }
    renderPicker();
    if (screensaver) return;
    var sceneToggle = document.querySelector("[data-scene-toggle]");
    var sceneClose = document.querySelector("[data-scene-close]");
    var soundToggle = document.querySelector("[data-sound-toggle]");
    var photoToggle = document.querySelector("[data-photo-toggle]");
    if (sceneToggle) sceneToggle.addEventListener("click", function () {
      var picker = document.querySelector("[data-scene-picker]");
      setPickerOpen(picker ? picker.hidden : true);
    });
    if (sceneClose) sceneClose.addEventListener("click", function () { setPickerOpen(false); });
    if (soundToggle) soundToggle.addEventListener("click", toggleSound);
    if (photoToggle) photoToggle.addEventListener("click", function () { setPhotoMode(!photoMode); });
    root.addEventListener("keydown", function (event) {
      var interactive = event.target && event.target.closest && event.target.closest("input, textarea, select, button, [contenteditable='true']");
      if (interactive) return;
      var key = event.key.toUpperCase();
      if (key === "W" && !event.repeat) {
        var picker = document.querySelector("[data-scene-picker]");
        setPickerOpen(picker ? picker.hidden : true);
        event.preventDefault();
      } else if (key === "M" && !event.repeat) {
        toggleSound();
        event.preventDefault();
      } else if (key === "P" && !event.repeat) {
        setPhotoMode(!photoMode);
        event.preventDefault();
      } else if (photoMode && key === "C" && !event.repeat) {
        capture(document.querySelector(".mare-canvas"), activeId);
        event.preventDefault();
      } else if (photoMode && key === "ESCAPE") {
        setPhotoMode(false);
      } else if (key === "ESCAPE") {
        setPickerOpen(false);
      }
    });
  }

  root.LivingSceneRuntime = Object.freeze({
    version: "1.0.0",
    register: register,
    list: list,
    active: active,
    requestedId: function () { return requestedId; },
    switchTo: switchTo,
    sceneUrl: sceneUrl,
    bindChrome: bindChrome,
    updateAudio: updateAudio,
    capture: capture,
    isScreensaver: function () { return screensaver; }
  });
})(typeof window !== "undefined" ? window : globalThis);
