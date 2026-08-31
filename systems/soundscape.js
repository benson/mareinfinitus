(function (root) {
  "use strict";

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

  function create(options) {
    var settings = options || {};
    var context = null;
    var master = null;
    var windGain = null;
    var droneGain = null;
    var enabled = false;
    var noiseSource = null;

    function build() {
      if (context) return true;
      var AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);

      var length = context.sampleRate * 4;
      var buffer = context.createBuffer(1, length, context.sampleRate);
      var data = buffer.getChannelData(0);
      var previous = 0;
      for (var i = 0; i < length; i += 1) {
        var white = Math.random() * 2 - 1;
        previous = previous * 0.985 + white * 0.015;
        data[i] = previous * 3.2;
      }
      noiseSource = context.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      var windFilter = context.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = settings.windFrequency || 260;
      windFilter.Q.value = 0.32;
      windGain = context.createGain();
      windGain.gain.value = 0.34;
      noiseSource.connect(windFilter).connect(windGain).connect(master);
      noiseSource.start();

      var drone = context.createOscillator();
      var overtone = context.createOscillator();
      drone.type = "sine";
      overtone.type = settings.waveform || "triangle";
      drone.frequency.value = settings.droneFrequency || 46;
      overtone.frequency.value = (settings.droneFrequency || 46) * (settings.overtoneRatio || 1.5);
      droneGain = context.createGain();
      droneGain.gain.value = 0.12;
      var overtoneGain = context.createGain();
      overtoneGain.gain.value = 0.025;
      drone.connect(droneGain).connect(master);
      overtone.connect(overtoneGain).connect(master);
      drone.start();
      overtone.start();
      return true;
    }

    function toggle() {
      if (!build()) return false;
      enabled = !enabled;
      if (context.state === "suspended") context.resume();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(enabled ? (settings.volume || 0.19) : 0, context.currentTime, 0.7);
      return enabled;
    }

    function update(signals) {
      if (!context || !enabled) return;
      var input = signals || {};
      var activity = clamp(Number(input.activity) || 0, 0, 1);
      var storm = clamp(Number(input.storm) || 0, 0, 1);
      var mystery = clamp(Number(input.mystery) || 0, 0, 1);
      windGain.gain.setTargetAtTime(0.18 + storm * 0.34 + activity * 0.08, context.currentTime, 1.2);
      droneGain.gain.setTargetAtTime(0.07 + mystery * 0.1, context.currentTime, 1.8);
    }

    return Object.freeze({ toggle: toggle, update: update, isEnabled: function () { return enabled; } });
  }

  root.LivingSoundscape = Object.freeze({ version: "1.0.0", create: create });
})(typeof window !== "undefined" ? window : globalThis);
