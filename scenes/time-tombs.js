(function (root) {
  "use strict";

  var PACK = {
    id: "time-tombs",
    index: "HYPERION",
    title: "The Time Tombs",
    shortDescription: "A living valley of monuments moving backward through time.",
    source: "Hyperion",
    rendererVersion: 4,
    artDirectionVersion: 4,
    actorContractVersion: 3,
    fixedPixel: true,
    landmarks: ["sphinx", "shrike-palace", "crystal-monolith", "obelisk", "jade-tomb", "cave-tombs", "pilgrim-camp"],
    materials: ["sand", "dust", "stone", "crystal", "time", "fire"],
    systems: ["phaser-world", "fixed-pixel-camera", "depth-sorting", "temporal-echoes", "pilgrim-behavior", "alpha-hit-regions"],
    sound: { windFrequency: 390, droneFrequency: 36, overtoneRatio: 1.618, waveform: "sine", volume: 0.15 },
    mount: mount
  };

  if (root.LivingSceneRuntime) root.LivingSceneRuntime.register(PACK);

  var bundleBase = typeof document === 'undefined' ? '' : document.currentScript ? document.currentScript.src : document.baseURI;
  function loadRuntime() {
    if (root.TimeTombsRuntime) return Promise.resolve(root.TimeTombsRuntime);
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = new URL("../dist/time-tombs/time-tombs.js?v=e735460efac1", bundleBase).href;
      script.onload = function () { if (root.TimeTombsRuntime) resolve(root.TimeTombsRuntime); else reject(new Error("Missing Time Tombs runtime")); };
      script.onerror = function () { script.remove(); reject(new Error("Unable to load bundled Time Tombs runtime")); };
      document.head.appendChild(script);
    });
  }
  function mount(host) {
    loadRuntime()
      .then(function (runtime) { return runtime.mount(host); })
      .catch(function (error) {
        console.error("Unable to start the Time Tombs Phaser world", error);
        host.shell.classList.add("scene-load-error");
      });
  }
})(window);
