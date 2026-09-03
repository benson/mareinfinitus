(function (root) {
  "use strict";
  if (!root.LivingSceneRuntime) return;
  root.LivingSceneRuntime.register({
    id: "mare-infinitus",
    index: "WORLD 326",
    title: "Mare Infinitus",
    shortDescription: "Violet water, a fishing station, and an abyss that remembers what crossed it.",
    source: "Endymion",
    rendererVersion: 1,
    artDirectionVersion: 1,
    actorContractVersion: 2,
    fixedPixel: true,
    landmarks: ["farcaster-arch", "fishing-station", "raft", "moon"],
    materials: ["water", "wind", "rain", "sediment", "light"],
    systems: ["ecology", "buoyancy", "fluid", "soft-body", "weather", "platform-life"],
    sound: { windFrequency: 180, droneFrequency: 41, overtoneRatio: 1.498, volume: 0.16 }
  });
})(typeof window !== "undefined" ? window : globalThis);
