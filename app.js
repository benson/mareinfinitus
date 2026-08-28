(function () {
  "use strict";

  var ART_PIXEL = 3;
  var FLUID_CELL = 6;
  var SURFACE_CELL = 2;
  var REFERENCE_WIDTH = 427;
  var PLATFORM_WORLD_WIDTH = 330;
  var PLATFORM_VISIBLE_WIDTH = 165;
  var WORLD_WRAP_LEFT = -120;
  var WORLD_WRAP_RIGHT = 680;
  var MAX_CREATURE_ANIMATION_RATE = 0.9;
  var runtimeParams = new URLSearchParams(window.location.search);
  var screensaverMode = runtimeParams.get("screensaver") === "1";
  var debugMode = runtimeParams.get("debug") === "1";

  var PALETTES = {
    A: {
      sky: "#080817", skyLow: "#16112d", star: "#ddd7ff",
      planetDark: "#5f241d", planet: "#a44728", planetLight: "#dd7441",
      waterTop: "#4b3a7a", water: "#27204e", waterDeep: "#100f2d",
      foam: "#ded9ff", plankton: "#d39b32", bubble: "#6bb9c5", android: "#477fc5",
      kelp: "#9a6f20", timber: "#2a191c", timberLight: "#67402b",
      steel: "#39384e", steelDark: "#20202f", lamp: "#ffb23d",
      abyss: "#05050f", creature: "#0a091b"
    },
    B: {
      sky: "#09091b", skyLow: "#21163a", star: "#eee8ff",
      planetDark: "#652a25", planet: "#a94e31", planetLight: "#ee8650",
      waterTop: "#62518f", water: "#30265f", waterDeep: "#14133b",
      foam: "#f1eaff", plankton: "#e0a83c", bubble: "#73cad1", android: "#5597df",
      kelp: "#b78628", timber: "#2a1c20", timberLight: "#795038",
      steel: "#48475d", steelDark: "#252538", lamp: "#ffc35a",
      abyss: "#060612", creature: "#0b0a20"
    },
    C: {
      sky: "#090c1e", skyLow: "#2a193c", star: "#f8efff",
      planetDark: "#6f3029", planet: "#b85b38", planetLight: "#f29558",
      waterTop: "#745b9f", water: "#392b6c", waterDeep: "#171642",
      foam: "#fff4ff", plankton: "#edb64d", bubble: "#83dce0", android: "#67b0ef",
      kelp: "#c59635", timber: "#302127", timberLight: "#8a5b3d",
      steel: "#55546d", steelDark: "#2b2a42", lamp: "#ffd36d",
      abyss: "#070713", creature: "#0d0c25"
    }
  };
  PALETTES.A = Object.assign({}, PALETTES.B);
  PALETTES.C = Object.assign({}, PALETTES.B);
  var DENSITY_PROFILES = { A: 0.38, B: 1, C: 1.75 };
  var INSPECTION_MASK_PALETTE = {};
  Object.keys(PALETTES.B).forEach(function (key) {
    INSPECTION_MASK_PALETTE[key] = "#ffffff";
  });
  INSPECTION_MASK_PALETTE.sun = "#ffffff";

  var CreatureVariation = window.MareCreatureVariation || null;
  var AmbientLife = window.MareAmbientLife || null;
  var ecology = window.MareEcology ? window.MareEcology.create({ seed: 326.73 }) : null;
  var ecologySteering = ecology ? ecology.createSteeringOutput() : null;
  var ecologyInfluence = ecology ? ecology.createInfluenceOutput() : null;
  var ecologyContext = {};
  var ecologyEvent = null;
  var ecologyPreviewEvent = null;
  var variationPose = {};
  var variationBody = {};
  var variationPoint = {};
  var variationColors = {};
  var depthSample = {};
  var bodyFieldSample = {};
  var deepBodyDescriptors = [];
  var platformLife = AmbientLife ? AmbientLife.createPlatformState(326, 72, 64) : null;

  var canvas = document.querySelector(".mare-canvas");
  var shell = document.querySelector(".mare-shell");
  var ctx = canvas.getContext("2d", { alpha: false });
  var mode = "B";
  var particles = [];
  var swimmers = [];
  var ripples = [];
  var rainDrops = [];
  var rainSplashes = [];
  var rainSpawnAccumulator = 0;
  var rainSeed = 0;
  var fluid = null;
  var surface = null;
  var deposits = null;
  var waterTexture = null;
  var tuning = {
    density: 0.7,
    carpetSpeed: 9,
    seaLife: 1.7,
    platformActivity: 1.6,
    waveEnergy: 1.2
  };
  var raft = { x: -42, y: 0, vx: 0.82, vy: 0, angle: 0, angularVelocity: 0 };
  var leviathans = [
    { x: 72, y: 0, vx: 0.17, vy: 0, worldStart: 72, depth: 0.69, scale: 0.82, direction: 1, phase: 0.2 },
    { x: 348, y: 0, vx: -0.12, vy: 0, worldStart: 348, depth: 0.82, scale: 1.08, direction: -1, phase: 2.7 },
    { x: 610, y: 0, vx: 0.14, vy: 0, worldStart: 610, depth: 0.51, scale: 0.67, direction: 1, phase: 5.1 }
  ];
  if (CreatureVariation) {
    leviathans.forEach(function (leviathan, index) {
      leviathan.variation = CreatureVariation.createTraits("leviathan", leviathan.phase + index * 0.37, leviathan.scale);
    });
  }
  var colossalEncounters = [
    { start: -150, cycle: 1100, duration: 300, phase: 0.4, direction: 1, worldDepth: 100, scale: 7.4, tendrils: [] },
    { start: 400, cycle: 1100, duration: 310, phase: 2.8, direction: -1, worldDepth: 124, scale: 9.2, tendrils: [] }
  ];
  var backgroundTitans = [
    { start: 145, cycle: 1560, duration: 270, phase: 1.1, direction: 1, worldDepth: 172, type: "mountainback" },
    { start: 910, cycle: 1560, duration: 250, phase: 4.4, direction: -1, worldDepth: 198, type: "veilback" }
  ];
  var backgroundTitanPreview = "";
  var carpet = { x: 470, y: 0, vx: -28.8, vy: 0, waitingUntil: 0, passIndex: 0 };
  var environment = {
    tide: 0,
    tideVelocity: 0,
    wind: 0.18,
    storm: 0.08,
    stormTarget: 0.08,
    forcedStorm: 0
  };
  var structure = {
    sway: 0,
    swayVelocity: 0,
    sag: 0,
    sagVelocity: 0,
    stress: 0,
    integrity: 1
  };
  var mooring = {
    points: [], previous: [], buoyX: 0, buoyY: 0,
    buoyVX: 0, buoyVY: 0, segmentLength: 5.5, initialized: false
  };
  var pointer = { down: false, inside: false, x: 0, y: 0, clientX: 0, clientY: 0 };
  var width = 1;
  var height = 1;
  var cameraX = 0;
  var lastFrame = performance.now();
  var simulationTime = 0;
  var frameRequest = 0;
  var resizeRequest = 0;
  var uiTimer = 0;
  var glossaryOpen = false;
  var glossaryPinned = false;
  var glossaryHoverId = "";
  var glossaryPosition = null;
  var glossaryDrag = null;
  var inspectHeld = false;
  var touchInspectLatched = false;
  var touchInspectTimer = 0;
  var touchInspectReleaseTimer = 0;
  var touchInspectStart = null;
  var inspectTargetId = "";
  var inspectSubjectKey = "";
  var inspectTooltip = document.querySelector("[data-inspection-tooltip]");
  var inspectId = document.querySelector("[data-inspection-id]");
  var inspectName = document.querySelector("[data-inspection-name]");
  var inspectSummary = document.querySelector("[data-inspection-summary]");
  var inspectMaskCanvas = document.createElement("canvas");
  var inspectMaskCtx = inspectMaskCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
  var inspectionOutlineCache = {
    id: "", subjectKey: "", tick: -1, left: 0, top: 0, width: 0, height: 0,
    component: new Uint8Array(0), queue: new Int32Array(0),
    inner: new Uint8Array(0), outer: new Uint8Array(0), ready: false
  };
  var glossaryPanel = document.querySelector("#mare-glossary");
  var glossaryHeader = document.querySelector("[data-glossary-drag]");
  var glossaryToggle = document.querySelector("[data-glossary-toggle]");
  var glossaryPin = document.querySelector("[data-glossary-pin]");
  var glossaryList = document.querySelector("[data-glossary-list]");
  var glossaryCopyStatus = document.querySelector("[data-glossary-copy-status]");
  var welcome = document.querySelector("[data-welcome]");
  var welcomeEnter = document.querySelector("[data-welcome-enter]");
  var welcomeOpen = document.querySelector("[data-welcome-open]");
  var welcomePreviouslyFocused = null;
  var celestialLateralPhase = Math.random() * Math.PI * 2;

  shell.classList.toggle("screensaver-runtime", screensaverMode);

  var BESTIARY = [
    { id: "MI-00", group: "Ocean materials", name: "Violet sea", origin: "BOOK", summary: "The world-ocean itself: vast, saline, and empty to every horizon. Suspended phytoplankton—not atmospheric scattering—gives its articulated water the disturbing violet color.", excerpts: [
      { text: "The sea was a disturbing violet, serrated by wave-top crests of a blue so dark as to be almost black, and occasionally broken by yellowkelp beds or foam of an even darker violet.", source: "Endymion, ch. 31" },
      { text: "The violet sea was very big, very empty, and our raft only a speck below, a tiny black rectangle on the reticulated violet-and-black sea.", source: "Endymion, ch. 31" },
      { text: "Floating on my back, twisting my head and neck to keep the colored dorsals in view, I kicked my way north, rising with each great movement of the violet sea, dropping into wide troughs as the ocean seemed to breathe in.", source: "Endymion, ch. 34" }
    ] },
    { id: "MI-01", group: "Ocean materials", name: "Surface foam", origin: "BOOK", summary: "Regular two-meter swells serrate the violet surface with crests so dark blue they appear almost black. Darker violet foam gathers and breaks along their moving peaks.", excerpts: [
      { text: "Easy swells turning into regular two-meter waves that jostled the raft some but were far enough apart to let us ride them without undue discomfort.", source: "Endymion, ch. 31" },
      { text: "Aenea was studying the platform again through the binoculars. ‘I don’t think they can see us now,’ she said. ‘We’re between these swells most of the time. But when we get closer ...’ ‘And when the moons rise,’ I added.", source: "Endymion, ch. 31" }
    ] },
    { id: "MI-02", group: "Ocean materials", name: "Phytoplankton bloom", origin: "BOOK", summary: "Drifting clustered specks carried by the current, feeding the small fauna and tinting Mare Infinitus violet.", excerpts: [
      { text: "The violet articulated seas are caused by a form of phytoplankton in the water and are not a result of the atmospheric scattering which grants the traveler such lovely sunsets.", source: "Endymion, ch. 31" },
      { text: "There was no deck or platform down there, just twenty meters of air between my boots and the violet waves. The moons were rising and the sea was coming alive with light.", source: "Endymion, ch. 33" }
    ] },
    { id: "MI-03", group: "Ocean materials", name: "Suspended silt", origin: "SIM", summary: "Warm mineral grains lifted around the station’s immense submerged foundation. Each fleck follows the local flow, settling in quiet water and rising again behind animals, anchors, and moving cables." },
    { id: "MI-04", group: "Ocean materials", name: "Pylon bubbles", origin: "SIM", summary: "Small cyan bubbles escape around the submerged supports, rising in loose columns that bend sideways wherever the current curls around the station." },
    { id: "MI-10", group: "Bestiary", name: "School fish", origin: "SIM", summary: "Small grazing fish occupy the bright upper water in shifting groups. They match speed and direction with their neighbors, loosen around food, compress when alarmed, and scatter sharply from larger predators." },
    { id: "MI-11", group: "Bestiary", name: "Drifting jelly", origin: "SIM", summary: "Translucent bells drift between the surface light and middle depths. Their loose articulated tendrils trail in the current, while an occasional slow contraction provides only enough thrust to change depth or avoid a passing animal." },
    { id: "MI-12", group: "Bestiary", name: "Violet eel", origin: "SIM", summary: "A slender shallow-to-midwater swimmer whose body carries a restrained lateral wave from head to tail. It threads between schools and station supports, resting in calm water before darting toward food." },
    { id: "MI-13", group: "Bestiary", name: "Ocean ray", origin: "SIM", summary: "A broad-bodied glider of the middle water. Slow fin strokes produce long, economical movement beneath the schooling fish, and its wake gently rolls plankton and silt outward from each wingtip." },
    { id: "MI-14", group: "Bestiary", name: "Rainbow shark", origin: "BOOK", summary: "A three-meter predator with twin dorsal fins, shimmering electric color, very white teeth, and a powerful tail. It circles wounded prey and surges upward from beneath the violet swells to attack.", excerpts: [
      { text: "I saw the fish first. They had dorsals like holos I’d seen of Old Earth sharks, or the cannibal saberbacks of Hyperion’s South Sea, but two shining dorsal fins rather than one. I could see the fish clearly in the moonlight: they seemed to glitter a dozen bright colors, from the twin dorsal fins to their long bellies. They were about three meters long, they moved like predators with powerful surges of their tails, and their teeth were very white.", source: "Endymion, ch. 33" },
      { text: "It was only a few minutes before the colored sharks began circling again. Their shimmering, electric colors were visible beneath the waves, and when one moved in for the attack, I stopped trying to swim, floated, and kicked at its head in precisely the same way as I had seen the late lieutenant hold the things at bay. The fish were undoubtedly deadly, but they were stupid—they attacked one at a time, as if there were some unseen pecking order among them—and I kicked them in the snout one at a time.", source: "Endymion, ch. 34" }
    ] },
    { id: "MI-15", group: "Bestiary", name: "Hectapus", origin: "BOOK", summary: "Named among the local delicacies at Gus’s Oceanic Grill, the hectapus trails eight loose hunting arms beneath a luminous, softly pulsing mantle in the middle depths.", excerpt: "While the Mare Infinitus interlude is very short—five kilometers of such ocean travel is enough for most of the River’s wanderers—it does include the Web-famous Gus’s Oceanic Aquarium and Grill. Be sure to order the grilled sea giant, the hectapus soup, and the excellent yellowweed wine. Dine on one of the many terraces on Gus’s Oceanic platform so that you can enjoy one of Mare Infinitus’s exquisite sunsets and even more exquisite moonrises.", source: "Endymion, ch. 31" },
    { id: "MI-16", group: "Bestiary", name: "Sea giant", origin: "BOOK", summary: "Another creature named on Gus’s celebrated menu, the sea giant is a heavy, segmented grazer of the deeper water—far larger than the schooling fish and ponderous enough to carry a broad wake behind it.", excerpt: "While this world is noted for its empty ocean expanses (it has no continents or islands) and aggressive sea life (the ‘Lamp Mouth Leviathan’ for example), please be assured that your Tethys Traveler’s ship will stay safely within the Mid-littoral Stream from portal to portal, and be escorted by several Mare Protectorate outrider ships—all so that your brief aquatic interval, set off by a fine dinner at Gus’s Oceanic Grill, will leave only pleasant memories.", source: "Endymion, ch. 31" },
    { id: "MI-17", group: "Bestiary", name: "Lamp-mouth leviathan", origin: "BOOK", summary: "A grub-white leviathan three times the size of the station platform, massed with eyestalks, gaping mouths, enormous gill slits, hundred-meter tendrils, and dangling antennae tipped with brilliant cold-light lanterns.", excerpts: [
      { text: "The grub-white beast is easily three times the size of the station platform: a mass of eyestalks, gaping maws, fibrillating gill slits each the size of the thopter, pulsating tendrils extending hundreds of meters, dangling antennae each carrying a cold-light ‘lantern’ of great brilliance—even out here in the daylight—and mouths, many mouths, each large enough to swallow a fleet submarine. As de Soya watches, the harvesting crews are already flocking over the pressure-exploded carcass, sawing off tendrils and eyestalks and cutting the white meat to portable cubes before the hot sun spoils it all.", source: "Endymion, ch. 35" }
    ] },
    { id: "MI-18", group: "Bestiary", name: "Deep gigacanth", origin: "BOOK", summary: "The ancient relatives of the surface ’canths inhabit water ten thousand fathoms deep. Some are kilometers long: whale-shaped masses of dim segmented flesh whose passing displaces the abyss and erases the light above them.", excerpt: "The bottom of the ocean here is sort of a problematic thing ... usually ten thousand fathoms, at least ... that’s where the big granddaddies of our surface ’canths like Lamp Mouth live, sir ... monsters down that deep, sir ... klicks long ...", source: "Endymion, ch. 32" },

    { id: "MI-20", group: "Travelers", name: "River Tethys raft", origin: "BOOK", summary: "The travelers’ handmade gymnosperm-wood raft has crossed directly from a river into Mare Infinitus’s ocean. It remains unusually buoyant in the saline water, but now rocks, takes waves over its edges, and follows the hidden Mid-littoral current toward the farcaster.", excerpts: [
      { text: "The raft rode quite differently in these gentle but serious ocean swells, but my bargeman’s eye noted that while the waves tended to lap over the edges a bit more, the gymnosperm wood seemed even more buoyant here. I went to one knee near the rudder and gingerly lifted a palmful of sea to my mouth. I spit it out quickly and rinsed my mouth with fresh water from the canteen on my belt. This seawater was far more saline than even Hyperion’s undrinkable oceans.", source: "Endymion, ch. 31" },
      { text: "I lashed the rudder in place and joined the other two at the front of the raft. Because of the rocking as the gentle ocean swells rolled under us, all three of us were holding on to the upright post there, which still held A. Bettik’s shirt flapping in the night wind. The shirt glowed whitely in the moonlight and starlight.", source: "Endymion, ch. 31" }
    ] },
    { id: "MI-21", group: "Travelers", name: "Aenea", origin: "BOOK", summary: "Aenea rides the raft with A. Bettik while Raul scouts ahead. Her small pale silhouette and quiet attention give the impossible scale of Mare Infinitus—especially its rising worlds—something human to measure against.", excerpt: "‘Wow,’ Aenea said softly to herself. I guessed that she was talking about the rising moons. All three were huge and orange, but the center one was so large that even half of its diameter as it rose seemed to fill what I still thought of as the eastern sky. Aenea rose to her feet, and her standing silhouette still came less than halfway up the giant orange hemisphere.", source: "Endymion, ch. 31" },
    { id: "MI-22", group: "Travelers", name: "A. Bettik", origin: "BOOK", summary: "The blue android steadies and steers the raft while Raul and Aenea scout. His exposed blue skin is the clearest visual distinction between the two travelers remaining aboard.", excerpt: "I looked over her shoulder. We were about a thousand meters above the sea now, and the raft looked tiny but was clearly visible. A. Bettik was standing—shirtless once again in the midday heat—at the steering oar. He waved a bare blue arm. We both waved back.", source: "Endymion, ch. 31" },
    { id: "MI-23", group: "Travelers", name: "Raul on the hawking mat", origin: "BOOK", summary: "Raul lies low on the ancient hawking mat, banks beneath the station’s support beams, and skims west through their shadows only millimeters above the wave tops.", excerpts: [
      { text: "I banked left, swooped beneath the support beams there, and skipped just above the waves, heading west under the protective edge of the platform. Only one deck protruded out this far—the one I’d dropped onto—and I could see that it was empty at the north end. Not just empty, I realized, but shot to bits from the flechette fire and probably too dangerous to stand on. I flew under it and continued west. Boots clattered on the upper catwalks, but anyone catching a glimpse of me would have a hell of a rough time lining up a shot because of the dozens of pylons and cross girders here.", source: "Endymion, ch. 33" },
      { text: "I swooped out from under the platform into the shadow of it—the moons were higher now—and stayed just millimeters above the wave tops, staying low, trying to keep the long ocean swell between me and the western end of the platform.", source: "Endymion, ch. 33" }
    ] },

    { id: "MI-30", group: "Structures", name: "Farcaster portal", origin: "BOOK", summary: "The ancient hundred-meter arch marks the River Tethys route through Mare Infinitus. At night it first appears as negative space against the Milky Way; by Raul’s time it is inert, inaccessible, and impossible to interrogate from the outside.", excerpts: [
      { text: "It was just after dark and the moons had not risen when we saw the lights blinking on the eastern horizon. We rushed to the front of the raft and tried to make out what was out there—Aenea using the binoculars, A. Bettik the night goggles on full amplification, and me the rifle’s scope. The arch was just visible, a chord of negative space cutting into the Milky Way just above the horizon.", source: "Endymion, ch. 31" },
      { text: "The two dozen Pax engineers who have been swarming over the farcaster portal for three weeks report only that there is no sign that the ancient arch had been activated, despite sightings of a bright flash by several fishermen on the platform that night. The engineers also report that there is no way to get inside the ancient Core-constructed arch, nor to tell where—if anywhere—someone might have been transported through it.", source: "Endymion, ch. 35" }
    ] },
    { id: "MI-31", group: "Structures", name: "Station 326 Mid-littoral", origin: "BOOK", summary: "A huge inhabited fishing platform planted directly in the Mid-littoral current, crowded with stacked modules, lamplit windows, navigation beacons, tied boats, aircraft decks, maintenance catwalks, and open understructure.", excerpts: [
      { text: "‘It’s not the arch,’ said Aenea. ‘It’s a platform in the ocean—big—on stilts of some sort.’ ‘I do see the arch, however,’ said the android, who was looking several degrees north of the blinking light. The arch was just visible, a chord of negative space cutting into the Milky Way just above the horizon. The platform, with its blinking navigation beacons for aircraft and lamplit windows just becoming visible, was several klicks closer. And between us and the farcaster.", source: "Endymion, ch. 31" },
      { text: "I studied the large platform through the rifle scope. ‘It has a lot of levels,’ I muttered. ‘There are several ships tied up ... fishing boats is my bet. And a pad for skimmers and other aircraft. I think I see a couple of thopters tied down there.’", source: "Endymion, ch. 31" },
      { text: "Mare Infinitus Station Three-twenty-six Mid-littoral, where the hawking mat was discovered, is declared a crime zone and put under martial law. De Soya brings in Pax troops and ships from the floating city of St. Thérèse and places all of the former Pax garrison and the fishing guests under house arrest.", source: "Endymion, ch. 35" }
    ] },
    { id: "MI-32", group: "Structures", name: "Platform pylons", origin: "BOOK", summary: "A forest of narrow supports holds the inhabited decks far above the swells. The raft and hawking mat can pass through the open water beneath, while the repeating posts fragment sightlines and make the station feel much larger than its visible edge.", excerpt: "I rolled off the edge of the roof but grabbed the overhang as I did so, peering down between my swinging boots as my fingers slipped. There was no deck or platform down there, just twenty meters of air between my boots and the violet waves. The moons were rising and the sea was coming alive with light.", source: "Endymion, ch. 33" },
    { id: "MI-33", group: "Structures", name: "Submerged foundation", origin: "BOOK", summary: "With no island or ordinary seabed available, the station rests on an immense engineered foundation descending hundreds of fathoms. Its dark weighted mass disturbs the current beneath the pylons and gives smaller animals a vertical reef-like habitat.", excerpt: "There are the coral rings—but they’re not secured to anything, they float, and the yellowkelp islands, but they’re not ... I mean, you put a foot on them, it goes right through, if you know what I mean, sir. Anyway, what the old Hegemony engineers did is, they rigged the portals sort of like we’ve been doing with the platforms and cities for the last five hundred years, sir. That is, they run these foundation bases a couple of hundred fathoms—big, heavy things they’ve got to be, sir—and then run big, bladed drag anchors out on cables beneath that.", source: "Endymion, ch. 32" },
    { id: "MI-34", group: "Structures", name: "Mooring buoy", origin: "SIM", summary: "A small surface marker tethered near the station. Its body rises and rolls with the swells while the line below bends, tightens, and relaxes against wind and current." },
    { id: "MI-35", group: "Structures", name: "Sea-anchor line", origin: "BOOK", summary: "One immense cable runs from the station’s weighted base toward a bladed drag anchor beyond the visible water. Its slow flexible motion reveals both the scale of the engineering and the enormous force of Mare Infinitus’s seasonal tides.", excerpt: "With those keelweights and twenty klicks of cable trailing to rock, our cities and platforms don’t go very far, even in the Big Tide season, no, sir. But these portals ... well, we have lots of submarine volcanic activity on Mare-Eye, sir. The old Webdays’ engineers fixed those portals so that if their keelweights and cables sensed volcanic activity under them, they’d just ... well, migrate, sir, is the best word I can think of.", source: "Endymion, ch. 32" },
    { id: "MI-36", group: "Structures", name: "Platform occupants", origin: "BOOK", summary: "A few distant residents cross the decks and catwalks, tend the station, pause at the rail, wave over the water, or sweep a handlight through the open structure below.", excerpt: "Trapdoors were flying open and footsteps pounded on the catwalks beneath the main deck, but I reached the eastern deck first. I jumped to it, found the mat where I had lashed it to the post, unrolled it, tapped the flight threads, and was up and flying over the railing just as a trapdoor opened above the long flight of stairs coming down to the deck.", source: "Endymion, ch. 33" },

    { id: "MI-40", group: "Sky", name: "Near-Jovian primary", origin: "BOOK", summary: "Mare Infinitus is the satellite of this near-Jovian rocky world. The immense orange hemisphere rises through the eastern stars until even Aenea’s standing silhouette reaches less than halfway up its face.", excerpts: [
      { text: "‘Wow,’ Aenea said softly to herself. I guessed that she was talking about the rising moons. All three were huge and orange, but the center one was so large that even half of its diameter as it rose seemed to fill what I still thought of as the eastern sky. Aenea rose to her feet, and her standing silhouette still came less than halfway up the giant orange hemisphere.", source: "Endymion, ch. 31" },
      { text: "The largest of the moons was still in the sky as the suns rose—first the smaller of the binaries, a brilliant mote in the morning sky, paling the Milky Way to invisibility and dulling the details on the large moon, and then the primary, smaller than Hyperion’s Sol-like sun, but very bright. The sky deepened to an ultramarine and then deepened further to a cobalt-blue, with the two stars blazing and the orange moon filling the sky behind us. Sunlight made the moon’s atmosphere a hazy disk and banished the surface features from our sight.", source: "Endymion, ch. 31" }
    ] },
    { id: "MI-41", group: "Sky", name: "Storm front", origin: "SIM", summary: "A broad weather mass darkens the horizon, strengthens the wind and current, drives vertical rain across the ocean, roughens the swells, and occasionally illuminates its own interior with lightning." },

    { id: "MI-50", group: "Ecological phenomena", name: "Mass jelly bloom", origin: "SIM", summary: "A food-rich current gathers many drifting jellies into the same luminous layer. Their bells remain independent, but their shared depth and direction briefly turn scattered animals into a slow living constellation." },
    { id: "MI-51", group: "Ecological phenomena", name: "Pelagic migration", origin: "SIM", summary: "Fish, rays, eels, and larger animals align into a traveling corridor, each species holding its preferred depth and pace while the whole procession follows the same distant current." },
    { id: "MI-52", group: "Ecological phenomena", name: "Feeding frenzy", origin: "SIM", summary: "Concentrated plankton pulls prey into a tight region; their motion in turn attracts hunters. The short event produces rapid scattering, feeding, stronger wakes, and a visible local disturbance in the material sea." },
    { id: "MI-53", group: "Ecological phenomena", name: "Deep quiet", origin: "SIM", summary: "A long dim interval when nearby animals settle and suspended material thins. With less surface activity competing for attention, the faint biological glow of deep creatures becomes easier—and sometimes less comfortable—to notice." },
    { id: "MI-54", group: "Ecological phenomena", name: "Distant breach", origin: "SIM", summary: "Far beyond the raft, a large animal briefly breaks the horizon and disappears again. A delayed pulse spreads outward from the breach and reaches the nearer swells long after the body is gone." },
    { id: "MI-55", group: "Ecological phenomena", name: "Abyssal shadow passage", origin: "SIM", summary: "A segmented absence crosses the deep water, displacing a faint current and occluding plankton and biological glow before sinking beyond the illuminated layers." },
    { id: "MI-56", group: "Ecological phenomena", name: "Abyssal titan", origin: "SIM", summary: "A landscape-scale animal passes behind the pelagic life: segmented ridges, a dim eye, and slow fins or veils emerging only where its immense shadow interrupts the abyss." }
  ];
  var BESTIARY_BY_ID = Object.create(null);
  BESTIARY.forEach(function (entry) {
    if (BESTIARY_BY_ID[entry.id]) throw new Error("Duplicate field-guide id: " + entry.id);
    BESTIARY_BY_ID[entry.id] = entry;
  });
  var INSPECTION_REGISTRY = {
    "MI-00": { mask: "sea" },
    "MI-01": { mask: "surface" },
    "MI-02": { mask: "particle", particleKind: "plankton" },
    "MI-03": { mask: "particle", particleKind: "silt" },
    "MI-04": { mask: "particle", particleKind: "bubble" },
    "MI-10": { mask: "swimmer", swimmerKind: "fish" },
    "MI-11": { mask: "swimmer", swimmerKind: "jelly" },
    "MI-12": { mask: "swimmer", swimmerKind: "eel" },
    "MI-13": { mask: "swimmer", swimmerKind: "ray" },
    "MI-14": { mask: "swimmer", swimmerKind: "shark" },
    "MI-15": { mask: "swimmer", swimmerKind: "hectapus" },
    "MI-16": { mask: "swimmer", swimmerKind: "seaGiant" },
    "MI-17": { mask: "leviathan" },
    "MI-18": { mask: "colossal" },
    "MI-20": { mask: "raft" },
    "MI-21": { mask: "traveler" },
    "MI-22": { mask: "traveler" },
    "MI-23": { mask: "carpet" },
    "MI-30": { mask: "portal", semanticAperture: true },
    "MI-31": { mask: "platform" },
    "MI-32": { mask: "pylons" },
    "MI-33": { mask: "foundation" },
    "MI-34": { mask: "buoy" },
    "MI-35": { mask: "mooring" },
    "MI-36": { mask: "occupants" },
    "MI-40": { mask: "planet" },
    "MI-41": { mask: "storm" },
    "MI-50": { mask: "ecology", eventType: "jellyBloom" },
    "MI-51": { mask: "ecology", eventType: "migration" },
    "MI-52": { mask: "ecology", eventType: "feedingFrenzy" },
    "MI-53": { mask: "ecology", eventType: "deepQuiet" },
    "MI-54": { mask: "ecology", eventType: "distantBreach" },
    "MI-55": { mask: "ecology", eventType: "shadowPassage" },
    "MI-56": { mask: "titan" }
  };
  var SWIMMER_INSPECTION_IDS = Object.create(null);
  Object.keys(INSPECTION_REGISTRY).forEach(function (id) {
    if (!BESTIARY_BY_ID[id]) throw new Error("Inspection registry references unknown id: " + id);
    var descriptor = INSPECTION_REGISTRY[id];
    if (descriptor.swimmerKind) SWIMMER_INSPECTION_IDS[descriptor.swimmerKind] = id;
  });

  function hash(n) {
    var value = Math.sin(n * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function visualDensity() {
    return tuning.density;
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function smoothstep(amount) {
    var value = clamp(amount, 0, 1);
    return value * value * (3 - 2 * value);
  }

  function waterlineY() {
    return Math.floor(clamp(86 + (height - 240) * 0.065, 76, 112));
  }

  function worldToScreenX(worldX) {
    return worldX - cameraX;
  }

  function screenToWorldX(screenX) {
    return screenX + cameraX;
  }

  function activeWorldLeft() {
    return Math.min(WORLD_WRAP_LEFT, screenToWorldX(-96));
  }

  function activeWorldRight() {
    return Math.max(WORLD_WRAP_RIGHT, screenToWorldX(width + 96));
  }

  function wrapWorldX(worldX) {
    var left = activeWorldLeft();
    var right = activeWorldRight();
    var span = right - left;
    return ((worldX - left) % span + span) % span + left;
  }

  function platformGeometry() {
    var line = waterlineY();
    var left = width - PLATFORM_VISIBLE_WIDTH;
    var right = left + PLATFORM_WORLD_WIDTH;
    var deck = line - 36;
    var pylonCount = Math.floor(PLATFORM_WORLD_WIDTH / 17) + 1;
    var pylons = [];
    for (var i = 0; i < pylonCount; i += 1) {
      pylons.push(left + 8 + i * ((right - left - 16) / Math.max(1, pylonCount - 1)));
    }
    return {
      line: line,
      left: left,
      right: right,
      deck: deck,
      pylons: pylons,
      foundationTop: line + 66,
      foundationBottom: line + 92
    };
  }

  function renderGlossary() {
    if (!glossaryList) return;
    var groups = [];
    BESTIARY.forEach(function (entry) {
      if (groups.indexOf(entry.group) < 0) groups.push(entry.group);
    });
    groups.forEach(function (groupName) {
      var group = document.createElement("section");
      group.className = "glossary-group";
      var heading = document.createElement("h2");
      heading.textContent = groupName.toUpperCase();
      group.appendChild(heading);
      BESTIARY.forEach(function (entry) {
        if (entry.group !== groupName) return;
        var button = document.createElement("button");
        button.type = "button";
        button.className = "glossary-entry";
        button.dataset.entryId = entry.id;

        var id = document.createElement("span");
        id.className = "entry-id";
        id.textContent = entry.id;
        var name = document.createElement("span");
        name.className = "entry-name";
        name.textContent = entry.name;
        var origin = document.createElement("span");
        origin.className = "entry-origin " + entry.origin.toLowerCase();
        origin.textContent = entry.origin;
        var summary = document.createElement("span");
        summary.className = "entry-summary";
        summary.textContent = entry.summary;

        button.appendChild(id);
        button.appendChild(name);
        button.appendChild(origin);
        button.appendChild(summary);
        var excerpts = entry.excerpts || (entry.excerpt ? [{ text: entry.excerpt, source: entry.source }] : []);
        excerpts.forEach(function (passage) {
          var excerpt = document.createElement("q");
          excerpt.className = "entry-excerpt";
          excerpt.textContent = passage.text;
          var source = document.createElement("span");
          source.className = "entry-source";
          source.textContent = "BOOK TEXT · " + (passage.source || "Endymion");
          button.appendChild(excerpt);
          button.appendChild(source);
        });
        button.addEventListener("pointerenter", function () {
          glossaryHoverId = entry.id;
        });
        button.addEventListener("pointerleave", function () {
          if (glossaryHoverId === entry.id) glossaryHoverId = "";
        });
        button.addEventListener("focus", function () {
          glossaryHoverId = entry.id;
        });
        button.addEventListener("blur", function () {
          if (glossaryHoverId === entry.id) glossaryHoverId = "";
        });
        button.addEventListener("click", function () {
          var label = entry.id + " — " + entry.name;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(label).then(function () {
              glossaryCopyStatus.textContent = "COPIED " + label;
            }, function () {
              glossaryCopyStatus.textContent = label;
            });
          } else {
            glossaryCopyStatus.textContent = label;
          }
        });
        group.appendChild(button);
      });
      glossaryList.appendChild(group);
    });
  }

  function setGlossaryOpen(nextOpen) {
    if (screensaverMode) nextOpen = false;
    glossaryOpen = !!nextOpen;
    if (glossaryPanel) glossaryPanel.hidden = !glossaryOpen;
    if (glossaryToggle) glossaryToggle.setAttribute("aria-expanded", String(glossaryOpen));
    if (glossaryOpen) {
      shell.classList.remove("ui-hidden");
      window.clearTimeout(uiTimer);
      if (glossaryPosition) {
        window.requestAnimationFrame(function () {
          positionGlossary(glossaryPosition.left, glossaryPosition.top, false);
        });
      }
      var closeButton = glossaryPanel && glossaryPanel.querySelector("[data-glossary-close]");
      if (closeButton) closeButton.focus({ preventScroll: true });
    } else {
      glossaryHoverId = "";
      if (glossaryPinned) setGlossaryPinned(false);
      if (glossaryCopyStatus) glossaryCopyStatus.textContent = "";
      showInterface();
    }
  }

  function setGlossaryPinned(nextPinned) {
    glossaryPinned = !!nextPinned;
    if (glossaryPanel) glossaryPanel.classList.toggle("is-pinned", glossaryPinned);
    if (glossaryPin) {
      glossaryPin.setAttribute("aria-pressed", String(glossaryPinned));
      glossaryPin.textContent = glossaryPinned ? "PINNED" : "PIN";
    }
    try {
      if (glossaryPinned) window.localStorage.setItem("mare-glossary-pinned", "1");
      else window.localStorage.removeItem("mare-glossary-pinned");
    } catch (error) {
      // Persistence is optional in private or restricted browsing contexts.
    }
    if (glossaryPinned && !glossaryOpen) setGlossaryOpen(true);
  }

  function positionGlossary(left, top, persist) {
    if (!glossaryPanel || glossaryPanel.hidden) return;
    var rect = glossaryPanel.getBoundingClientRect();
    var panelWidth = Math.min(rect.width || 470, Math.max(1, window.innerWidth - 16));
    var panelHeight = Math.min(rect.height || window.innerHeight - 32, Math.max(1, window.innerHeight - 16));
    var maxLeft = Math.max(8, window.innerWidth - panelWidth - 8);
    var maxTop = Math.max(8, window.innerHeight - panelHeight - 8);
    glossaryPosition = {
      left: clamp(left, 8, maxLeft),
      top: clamp(top, 8, maxTop)
    };
    glossaryPanel.style.left = glossaryPosition.left + "px";
    glossaryPanel.style.top = glossaryPosition.top + "px";
    glossaryPanel.style.right = "auto";
    glossaryPanel.style.bottom = "auto";
    glossaryPanel.style.width = panelWidth + "px";
    glossaryPanel.style.height = panelHeight + "px";
    if (persist) {
      try {
        window.localStorage.setItem("mare-glossary-position", JSON.stringify(glossaryPosition));
      } catch (error) {
        // Dragging still works without persistent storage.
      }
    }
  }

  function beginGlossaryDrag(event) {
    if (!glossaryPanel || glossaryPanel.hidden || !glossaryHeader) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest && event.target.closest("button")) return;
    var rect = glossaryPanel.getBoundingClientRect();
    glossaryDrag = {
      pointerId: event.pointerId,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top
    };
    glossaryPanel.style.left = rect.left + "px";
    glossaryPanel.style.top = rect.top + "px";
    glossaryPanel.style.right = "auto";
    glossaryPanel.style.bottom = "auto";
    glossaryPanel.style.width = rect.width + "px";
    glossaryPanel.style.height = rect.height + "px";
    glossaryPanel.classList.add("is-dragging");
    glossaryHeader.setPointerCapture && glossaryHeader.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveGlossary(event) {
    if (!glossaryDrag || event.pointerId !== glossaryDrag.pointerId) return;
    positionGlossary(event.clientX - glossaryDrag.grabX, event.clientY - glossaryDrag.grabY, false);
  }

  function endGlossaryDrag(event) {
    if (!glossaryDrag || event.pointerId !== glossaryDrag.pointerId) return;
    glossaryHeader.releasePointerCapture && glossaryHeader.releasePointerCapture(event.pointerId);
    glossaryDrag = null;
    glossaryPanel.classList.remove("is-dragging");
    if (glossaryPosition) positionGlossary(glossaryPosition.left, glossaryPosition.top, true);
  }

  function setWelcomeBackgroundInert(inert) {
    Array.prototype.forEach.call(shell.children, function (child) {
      if (child === welcome) return;
      child.inert = inert;
      if (inert) child.setAttribute("aria-hidden", "true");
      else child.removeAttribute("aria-hidden");
    });
  }

  function setWelcomeOpen(nextOpen, remember) {
    if (!welcome) return;
    if (screensaverMode) nextOpen = false;
    var opening = !!nextOpen;
    welcome.hidden = !opening;
    shell.classList.toggle("welcome-open", opening);
    if (opening) {
      welcomePreviouslyFocused = document.activeElement;
      setWelcomeBackgroundInert(true);
      window.clearTimeout(uiTimer);
      if (welcomeEnter) welcomeEnter.focus({ preventScroll: true });
    } else {
      setWelcomeBackgroundInert(false);
      if (remember) {
        try {
          window.localStorage.setItem("mare-welcome-seen-v1", "1");
        } catch (error) {
          // The introduction still works when storage is unavailable.
        }
      }
      if (welcomePreviouslyFocused && welcomePreviouslyFocused.focus) {
        welcomePreviouslyFocused.focus({ preventScroll: true });
      }
      welcomePreviouslyFocused = null;
      showInterface();
    }
  }

  function pointToSegmentDistance(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var length2 = dx * dx + dy * dy;
    if (length2 <= 0.0001) return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay));
    var amount = clamp(((px - ax) * dx + (py - ay) * dy) / length2, 0, 1);
    var nearestX = ax + dx * amount;
    var nearestY = ay + dy * amount;
    return Math.sqrt((px - nearestX) * (px - nearestX) + (py - nearestY) * (py - nearestY));
  }

  function planetPosition(time) {
    var orbitTop = -112;
    var orbitBottom = 224;
    var orbitTravel = (143 + time * 0.14) % (orbitBottom - orbitTop);
    var lateralDrift = 235 + Math.sin(celestialLateralPhase + time * 0.012) * 25;
    return {
      x: Math.floor(worldToScreenX(lateralDrift - (orbitTravel - 143) * 0.08)),
      y: orbitTop + orbitTravel,
      radius: 94
    };
  }

  function swimmerInspectionId(kind) {
    return SWIMMER_INSPECTION_IDS[kind] || "MI-10";
  }

  function ecologicalEventInspectionId(type) {
    var ids = Object.keys(INSPECTION_REGISTRY);
    for (var i = 0; i < ids.length; i += 1) {
      if (INSPECTION_REGISTRY[ids[i]].eventType === type) return ids[i];
    }
    return "";
  }

  function ecologicalEventTypeForInspection(id) {
    return INSPECTION_REGISTRY[id] && INSPECTION_REGISTRY[id].eventType || "";
  }

  function inspectionSubjectAt(x, y, time, targetId) {
    if (INSPECTION_REGISTRY[targetId] && INSPECTION_REGISTRY[targetId].mask === "swimmer") {
      for (var swimmerIndex = swimmers.length - 1; swimmerIndex >= 0; swimmerIndex -= 1) {
        var swimmer = swimmers[swimmerIndex];
        if (swimmerInspectionId(swimmer.kind) !== targetId) continue;
        if (swimmerPixelContains(swimmer, x, y, time)) return swimmer;
      }
    }
    if (targetId === "MI-17") {
      for (var leviathanIndex = leviathans.length - 1; leviathanIndex >= 0; leviathanIndex -= 1) {
        var leviathan = leviathans[leviathanIndex];
        var leviathanX = (x - leviathan.x) / Math.max(1, 61 * leviathan.scale);
        var leviathanY = (y - leviathan.y) / Math.max(1, 19 * leviathan.scale);
        if (leviathanX * leviathanX + leviathanY * leviathanY <= 1) return leviathan;
      }
    }
    if (targetId === "MI-18") {
      var activeColossal = activeColossalEncounter(time, platformGeometry().line);
      if (activeColossal) return activeColossal.encounter;
    }
    return null;
  }

  function inspectionSubjectKey(targetId, subject) {
    if (!subject) return targetId;
    if (Number.isFinite(subject.seed)) return targetId + ":" + subject.seed.toFixed(6);
    if (Number.isFinite(subject.phase)) return targetId + ":" + subject.phase.toFixed(4);
    return targetId;
  }

  function inspectionTargetAt(x, y, time) {
    var geometry = platformGeometry();
    var carpetWidth = 25;
    if (x >= carpet.x - 2 && x <= carpet.x + carpetWidth + 17 && y >= carpet.y - 10 && y <= carpet.y + 7) {
      return "MI-23";
    }

    var pose = raftPose();
    var aeneaY = raftYAt(pose, -5) - 5;
    var bettikY = raftYAt(pose, 7) - 5;
    if (Math.abs(x - (pose.centerX - 5)) <= 4 && Math.abs(y - aeneaY) <= 7) return "MI-21";
    if (Math.abs(x - (pose.centerX + 7)) <= 4 && Math.abs(y - bettikY) <= 7) return "MI-22";
    if (x >= pose.centerX - 19 && x <= pose.centerX + 19 && y >= pose.centerY - 15 && y <= pose.centerY + 7) {
      return "MI-20";
    }

    for (var swimmerIndex = swimmers.length - 1; swimmerIndex >= 0; swimmerIndex -= 1) {
      var swimmer = swimmers[swimmerIndex];
      if (swimmerPixelContains(swimmer, x, y, time)) {
        return swimmerInspectionId(swimmer.kind);
      }
    }

    for (var leviathanIndex = leviathans.length - 1; leviathanIndex >= 0; leviathanIndex -= 1) {
      var leviathan = leviathans[leviathanIndex];
      var leviathanX = (x - leviathan.x) / Math.max(1, 61 * leviathan.scale);
      var leviathanY = (y - leviathan.y) / Math.max(1, 19 * leviathan.scale);
      if (leviathanX * leviathanX + leviathanY * leviathanY <= 1) return "MI-17";
    }

    var activeColossal = activeColossalEncounter(time, geometry.line);
    if (activeColossal) {
      var colossalX = (x - activeColossal.state.x) / Math.max(1, 26 * activeColossal.state.scale);
      var colossalY = (y - activeColossal.state.y) / Math.max(1, 12 * activeColossal.state.scale);
      if (colossalX * colossalX + colossalY * colossalY <= 1.25) return "MI-18";
    }

    var backgroundTitan = activeBackgroundTitan(time, geometry.line);
    if (backgroundTitan) {
      var titanX = (x - backgroundTitan.state.x) / backgroundTitan.state.radiusX;
      var titanY = (y - backgroundTitan.state.y) / backgroundTitan.state.radiusY;
      if (titanX * titanX + titanY * titanY <= 1) return "MI-56";
    }

    if (mooring.initialized) {
      if (Math.abs(x - mooring.buoyX) <= 6 && Math.abs(y - (mooring.buoyY - 2)) <= 9) return "MI-34";
      for (var ropePoint = 1; ropePoint < mooring.points.length; ropePoint += 1) {
        if (pointToSegmentDistance(
          x, y,
          mooring.points[ropePoint - 1].x, mooring.points[ropePoint - 1].y,
          mooring.points[ropePoint].x, mooring.points[ropePoint].y
        ) <= 3) return "MI-35";
      }
    }

    // The arch owns its whole semantic aperture, not only its painted ring.
    // This keeps inspection stable while the pointer crosses transparent sky
    // or water inside the farcaster.
    var portalX = Math.floor(worldToScreenX(48));
    var portalY = geometry.line + 5;
    var portalDX = (x - portalX) / 61;
    var portalDY = (y - portalY) / 61;
    if (portalDY >= -1.04 && portalDY <= 0.1 && portalDX * portalDX + portalDY * portalDY <= 1.08) {
      return "MI-30";
    }

    for (var particleIndex = particles.length - 1; particleIndex >= 0; particleIndex -= 1) {
      var particle = particles[particleIndex];
      if (Math.abs(x - particle.x) <= 2.5 && Math.abs(y - particle.y) <= 2.5) {
        return particle.kind === "bubble" ? "MI-04" : particle.kind === "silt" ? "MI-03" : "MI-02";
      }
    }

    if (ecologyEvent && ecologyEvent.active) {
      var eventId = ecologicalEventInspectionId(ecologyEvent.type);
      var eventX = ecologyEvent.x * width;
      var eventY = geometry.line + ecologyEvent.depth * Math.max(20, height - geometry.line);
      if (ecologyEvent.type === "shadowPassage") {
        var eventTravel = ecologyEvent.direction > 0 ? ecologyEvent.phase : 1 - ecologyEvent.phase;
        eventX = lerp(-90, width + 90, eventTravel);
        if (Math.abs(x - eventX) < 86 && Math.abs(y - eventY) < 26) return eventId;
      } else if (ecologyEvent.type === "distantBreach") {
        if (Math.abs(x - eventX) < 34 && y >= geometry.line - 42 && y <= geometry.line + 8) return eventId;
      } else if (ecologyEvent.type === "migration") {
        if (Math.abs(y - eventY) < 24) return eventId;
      } else if (ecologyEvent.type === "deepQuiet") {
        if (y > geometry.line + 18) return eventId;
      } else if (Math.abs(x - eventX) < 74 && Math.abs(y - eventY) < 58) {
        return eventId;
      }
    }

    if (x >= geometry.left - 5 && x <= geometry.right) {
      var occupantCount = platformResidentCount();
      var platformShiftX = Math.round(structure.sway);
      var platformShiftY = Math.round(structure.sag);
      var occupantPose = {};
      for (var occupantIndex = 0; occupantIndex < occupantCount; occupantIndex += 1) {
        platformResidentPose(occupantIndex, time, geometry, occupantPose);
        var occupantX = occupantPose.x + platformShiftX;
        var occupantY = occupantPose.deck + platformShiftY - 3;
        if (Math.abs(x - occupantX) <= 3 && Math.abs(y - occupantY) <= 7) return "MI-36";
      }
      if (y >= geometry.foundationTop - 2 && y <= geometry.foundationBottom + 24) return "MI-33";
      for (var pylonIndex = 0; pylonIndex < geometry.pylons.length; pylonIndex += 1) {
        if (
          Math.abs(x - geometry.pylons[pylonIndex]) <= 5 &&
          y >= geometry.deck && y <= geometry.foundationTop + 2
        ) return "MI-32";
      }
      if (y >= geometry.deck - 100 && y <= geometry.line + 3) return "MI-31";
    }

    var localSurface = surfaceY(x, time, geometry.line, raft.x);
    if (Math.abs(y - localSurface) <= 6) return "MI-01";
    if (y >= geometry.line) return "MI-00";
    var planet = planetPosition(time);
    var planetDx = x - planet.x;
    var planetDy = y - planet.y;
    if (planetDx * planetDx + planetDy * planetDy <= planet.radius * planet.radius) return "MI-40";
    if (environment.storm > 0.32) return "MI-41";
    return "";
  }

  function hideInspector() {
    inspectTargetId = "";
    inspectSubjectKey = "";
    if (inspectTooltip) inspectTooltip.hidden = true;
  }

  function updateInspector(time) {
    if (!inspectHeld || !pointer.inside) {
      hideInspector();
      return;
    }
    var targetId = inspectionTargetAt(pointer.x, pointer.y, time);
    var entry = BESTIARY_BY_ID[targetId];
    if (!entry) {
      hideInspector();
      return;
    }
    var subject = inspectionSubjectAt(pointer.x, pointer.y, time, targetId);
    var subjectKey = inspectionSubjectKey(targetId, subject);
    if (inspectTargetId !== targetId || inspectSubjectKey !== subjectKey) {
      inspectTargetId = targetId;
      inspectSubjectKey = subjectKey;
      inspectId.textContent = entry.id + " · " + entry.origin;
      inspectName.textContent = entry.name;
      inspectSummary.textContent = entry.summary;
    }
    var tooltipWidth = 244;
    var tooltipHeight = 96;
    var left = pointer.clientX + 16;
    var top = pointer.clientY + 16;
    if (left + tooltipWidth > window.innerWidth - 10) left = pointer.clientX - tooltipWidth - 16;
    if (top + tooltipHeight > window.innerHeight - 10) top = pointer.clientY - tooltipHeight - 16;
    inspectTooltip.style.left = Math.max(10, left) + "px";
    inspectTooltip.style.top = Math.max(10, top) + "px";
    inspectTooltip.hidden = false;
  }

  function drawInspectionPerson(id, time) {
    var pose = raftPose();
    if (id === "MI-21") {
      drawPerson(pose.centerX - 5, raftYAt(pose, -5) - 1, time * 0.82, "#ffffff", 1, "guest");
    } else if (id === "MI-22") {
      drawPerson(pose.centerX + 7, raftYAt(pose, 7) - 1, time * 0.72 + 2, "#ffffff", -1, "worker");
    }
  }

  function drawInspectionOccupants(time, geometry) {
    ctx.save();
    ctx.translate(Math.round(structure.sway), Math.round(structure.sag));
    var occupantCount = platformResidentCount();
    var pose = {};
    for (var i = 0; i < occupantCount; i += 1) {
      platformResidentPose(i, time, geometry, pose);
      drawPerson(
        pose.x,
        pose.deck,
        pose.phase,
        "#ffffff",
        pose.direction,
        pose.role,
        pose.action
      );
    }
    ctx.restore();
  }

  function drawInspectionPylons(geometry) {
    for (var i = 0; i < geometry.pylons.length; i += 1) {
      var x = Math.floor(geometry.pylons[i]);
      var topX = x + structure.sway;
      var topY = geometry.deck + structure.sag;
      pixelLine(topX, topY, x, geometry.foundationTop + 4, "#ffffff", 7);
      for (var y = geometry.line + 10; y < geometry.foundationTop; y += 12) {
        var rungAmount = (y - geometry.line) / Math.max(1, geometry.foundationTop - geometry.line);
        var rungX = lerp(topX, x, rungAmount);
        pixelRect(rungX - 2, y, 6, 1, "#ffffff");
      }
    }
  }

  function drawInspectionBuoy() {
    if (!mooring.initialized) return;
    drawPixelMask(
      mooring.buoyX - 3,
      mooring.buoyY - 3,
      ["   1   ", " 11111 ", "11   11", " 11111 ", "  111  ", "   1   "],
      { "1": "#ffffff" },
      false
    );
    pixelLine(mooring.buoyX, mooring.buoyY - 3, mooring.buoyX, mooring.buoyY - 8, "#ffffff", 1);
  }

  function swimmerKindForInspection(id) {
    return INSPECTION_REGISTRY[id] && INSPECTION_REGISTRY[id].swimmerKind || "fish";
  }

  function drawInspectionMask(id, time, geometry) {
    inspectMaskCtx.setTransform(1, 0, 0, 1, 0, 0);
    inspectMaskCtx.clearRect(0, 0, width, height);
    inspectMaskCtx.globalAlpha = 1;
    var sceneCtx = ctx;
    ctx = inspectMaskCtx;
    try {
      var descriptor = INSPECTION_REGISTRY[id] || {};
      if (descriptor.mask === "planet") {
        drawPlanet(time, INSPECTION_MASK_PALETTE);
        ctx.clearRect(0, geometry.line, width, height - geometry.line);
      }
      else if (descriptor.mask === "portal") drawPortal(time, INSPECTION_MASK_PALETTE, geometry.line);
      else if (descriptor.mask === "carpet") drawCarpet(time, INSPECTION_MASK_PALETTE, geometry.line);
      else if (descriptor.mask === "raft") {
        drawRaftUnder(INSPECTION_MASK_PALETTE);
        drawRaftAbove(time, INSPECTION_MASK_PALETTE);
      } else if (descriptor.mask === "traveler") drawInspectionPerson(id, time);
      else if (descriptor.mask === "colossal") drawColossalEncounters(time, INSPECTION_MASK_PALETTE, geometry.line);
      else if (descriptor.mask === "leviathan") drawLeviathans(time, INSPECTION_MASK_PALETTE, true);
      else if (descriptor.mask === "swimmer") {
        drawSwimmers(time, INSPECTION_MASK_PALETTE, swimmerKindForInspection(id));
      } else if (descriptor.mask === "buoy") drawInspectionBuoy();
      else if (descriptor.mask === "mooring") drawMooringUnder(INSPECTION_MASK_PALETTE);
      else if (descriptor.mask === "occupants") drawInspectionOccupants(time, geometry);
      else if (descriptor.mask === "pylons") drawInspectionPylons(geometry);
      else if (descriptor.mask === "foundation") drawSubstructure(time, INSPECTION_MASK_PALETTE, geometry);
      else if (descriptor.mask === "platform") drawPlatform(time, INSPECTION_MASK_PALETTE, geometry);
      else if (descriptor.mask === "surface") drawSurface(time, INSPECTION_MASK_PALETTE, geometry.line, raft.x);
      else if (descriptor.mask === "particle") drawParticles(INSPECTION_MASK_PALETTE, descriptor.particleKind);
      else if (descriptor.mask === "storm") {
        drawWeather(time, INSPECTION_MASK_PALETTE, geometry.line);
        ctx.clearRect(0, geometry.line, width, height - geometry.line);
      } else if (descriptor.mask === "titan") {
        drawBackgroundTitans(time, INSPECTION_MASK_PALETTE, geometry.line);
      } else if (descriptor.mask === "ecology") {
        drawRareEcology(time, INSPECTION_MASK_PALETTE, geometry, descriptor.eventType);
      }
    } finally {
      inspectMaskCtx.globalAlpha = 1;
      ctx = sceneCtx;
    }
  }

  function drawInspectionSubjectMask(id, time, geometry, subject) {
    var descriptor = INSPECTION_REGISTRY[id] || {};
    var supported = descriptor.semanticAperture || descriptor.mask === "leviathan" ||
      descriptor.mask === "colossal" || descriptor.mask === "swimmer";
    if (!supported) return false;
    inspectMaskCtx.setTransform(1, 0, 0, 1, 0, 0);
    inspectMaskCtx.clearRect(0, 0, width, height);
    inspectMaskCtx.globalAlpha = 1;
    var sceneCtx = ctx;
    ctx = inspectMaskCtx;
    try {
      if (descriptor.semanticAperture) {
        drawPortal(time, INSPECTION_MASK_PALETTE, geometry.line);
        return true;
      }
      if (!subject) return false;
      if (descriptor.mask === "swimmer") {
        drawVariedSwimmer(subject, time, INSPECTION_MASK_PALETTE);
        return true;
      }
      if (descriptor.mask === "leviathan") {
        drawLeviathanActor(time, INSPECTION_MASK_PALETTE, subject, leviathans.indexOf(subject), true);
        return true;
      }
      if (descriptor.mask === "colossal") {
        var active = activeColossalEncounter(time, geometry.line);
        if (!active) return false;
        drawColossalEncounter(time, INSPECTION_MASK_PALETTE, geometry.line, active.encounter, active.index, true);
        return true;
      }
    } finally {
      inspectMaskCtx.globalAlpha = 1;
      ctx = sceneCtx;
    }
    return false;
  }

  function inspectionSearchRadius(id) {
    if (id === "MI-18") return 100;
    if (id === "MI-31" || id === "MI-32" || id === "MI-33") return 34;
    if (id === "MI-01" || id === "MI-41") return 22;
    if (id === "MI-17") return 42;
    return 14;
  }

  function drawSeaInspectionHighlight(time, geometry) {
    var palette = PALETTES[mode];
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (var x = 0; x < width; x += 1) {
      pixelRect(x, Math.round(surfaceY(x, time, geometry.line, raft.x)), 1, 1, palette.foam);
    }
    ctx.restore();
  }

  function inspectionMaskBounds(id, subject, outlineAll, geometry) {
    if (outlineAll || !subject) return { left: 0, top: 0, width: width, height: height };
    var centerX = Number(subject.x);
    var centerY = Number(subject.y);
    var radiusX = 24;
    var radiusY = 20;
    var descriptor = INSPECTION_REGISTRY[id] || {};
    if (descriptor.mask === "swimmer") {
      var extents = swimmerCollisionExtents(subject, {});
      radiusX = Math.max(12, extents.x + 10);
      radiusY = Math.max(12, extents.y + 10);
    } else if (descriptor.mask === "leviathan") {
      radiusX = 78 * subject.scale;
      radiusY = 34 * subject.scale;
    } else if (descriptor.mask === "colossal") {
      var active = activeColossalEncounter(simulationTime, geometry.line);
      if (active) {
        centerX = active.state.x;
        centerY = active.state.y;
        radiusX = 42 * active.state.scale;
        radiusY = 18 * active.state.scale;
      }
    }
    if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
      return { left: 0, top: 0, width: width, height: height };
    }
    var left = clamp(Math.floor(centerX - radiusX), 0, width - 1);
    var top = clamp(Math.floor(centerY - radiusY), 0, height - 1);
    var right = clamp(Math.ceil(centerX + radiusX), left + 1, width);
    var bottom = clamp(Math.ceil(centerY + radiusY), top + 1, height);
    return { left: left, top: top, width: right - left, height: bottom - top };
  }

  function ensureInspectionBuffers(pixelCount) {
    if (inspectionOutlineCache.component.length >= pixelCount) return;
    inspectionOutlineCache.component = new Uint8Array(pixelCount);
    inspectionOutlineCache.queue = new Int32Array(pixelCount);
    inspectionOutlineCache.inner = new Uint8Array(pixelCount);
    inspectionOutlineCache.outer = new Uint8Array(pixelCount);
  }

  function paintInspectionOutlineCache() {
    if (!inspectionOutlineCache.ready) return;
    var pixelCount = inspectionOutlineCache.width * inspectionOutlineCache.height;
    var palette = PALETTES[mode];
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = palette.abyss;
    for (var outer = 0; outer < pixelCount; outer += 1) {
      if (inspectionOutlineCache.outer[outer]) {
        ctx.fillRect(
          inspectionOutlineCache.left + outer % inspectionOutlineCache.width,
          inspectionOutlineCache.top + Math.floor(outer / inspectionOutlineCache.width),
          1, 1
        );
      }
    }
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = palette.foam;
    for (var inner = 0; inner < pixelCount; inner += 1) {
      if (inspectionOutlineCache.inner[inner]) {
        ctx.fillRect(
          inspectionOutlineCache.left + inner % inspectionOutlineCache.width,
          inspectionOutlineCache.top + Math.floor(inner / inspectionOutlineCache.width),
          1, 1
        );
      }
    }
    ctx.restore();
  }

  function drawInspectionOutline(time) {
    var outlineAll = !!glossaryHoverId;
    if (!outlineAll && (!inspectHeld || !pointer.inside)) return;
    var id = outlineAll ? glossaryHoverId : inspectionTargetAt(pointer.x, pointer.y, time);
    if (!id) return;
    var geometry = platformGeometry();
    if (id === "MI-00") {
      drawSeaInspectionHighlight(time, geometry);
      return;
    }
    var subject = outlineAll ? null : inspectionSubjectAt(pointer.x, pointer.y, time, id);
    var subjectKey = inspectionSubjectKey(id, subject);
    var poseTick = Math.floor(time * 24);
    var bounds = inspectionMaskBounds(id, subject, outlineAll, geometry);
    if (
      inspectionOutlineCache.ready && inspectionOutlineCache.id === id &&
      inspectionOutlineCache.subjectKey === subjectKey && inspectionOutlineCache.tick === poseTick &&
      inspectionOutlineCache.left === bounds.left && inspectionOutlineCache.top === bounds.top &&
      inspectionOutlineCache.width === bounds.width && inspectionOutlineCache.height === bounds.height
    ) {
      paintInspectionOutlineCache();
      return;
    }

    var subjectMask = !outlineAll && drawInspectionSubjectMask(id, time, geometry, subject);
    if (!subjectMask) drawInspectionMask(id, time, geometry);
    var image = inspectMaskCtx.getImageData(bounds.left, bounds.top, bounds.width, bounds.height);
    var pixelCount = bounds.width * bounds.height;
    ensureInspectionBuffers(pixelCount);
    var component = inspectionOutlineCache.component;
    var queue = inspectionOutlineCache.queue;
    var innerOutline = inspectionOutlineCache.inner;
    var outerOutline = inspectionOutlineCache.outer;
    component.fill(0, 0, pixelCount);
    innerOutline.fill(0, 0, pixelCount);
    outerOutline.fill(0, 0, pixelCount);
    if (outlineAll || subjectMask) {
      for (var allIndex = 0; allIndex < pixelCount; allIndex += 1) {
        if (image.data[allIndex * 4 + 3] >= 18) component[allIndex] = 1;
      }
    } else {
      var seed = -1;
      var nearestDistance2 = Infinity;
      var maxDistance = inspectionSearchRadius(id);
      for (var index = 0; index < pixelCount; index += 1) {
        if (image.data[index * 4 + 3] < 18) continue;
        var maskX = bounds.left + index % bounds.width;
        var maskY = bounds.top + Math.floor(index / bounds.width);
        var dx = maskX - pointer.x;
        var dy = maskY - pointer.y;
        var distance2 = dx * dx + dy * dy;
        if (distance2 < nearestDistance2) {
          nearestDistance2 = distance2;
          seed = index;
        }
      }
      if (seed < 0 || nearestDistance2 > maxDistance * maxDistance) return;

      var head = 0;
      var tail = 0;
      component[seed] = 1;
      queue[tail] = seed;
      tail += 1;
      while (head < tail) {
        var current = queue[head];
        head += 1;
        var currentX = current % bounds.width;
        var currentY = Math.floor(current / bounds.width);
        for (var oy = -1; oy <= 1; oy += 1) {
          for (var ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue;
            var nextX = currentX + ox;
            var nextY = currentY + oy;
            if (nextX < 0 || nextX >= bounds.width || nextY < 0 || nextY >= bounds.height) continue;
            var next = nextY * bounds.width + nextX;
            if (component[next] || image.data[next * 4 + 3] < 18) continue;
            component[next] = 1;
            queue[tail] = next;
            tail += 1;
          }
        }
      }
    }

    for (var componentIndex = 0; componentIndex < pixelCount; componentIndex += 1) {
      if (!component[componentIndex]) continue;
      var componentX = componentIndex % bounds.width;
      var componentY = Math.floor(componentIndex / bounds.width);
      var boundary = componentX === 0 || componentX === bounds.width - 1 || componentY === 0 || componentY === bounds.height - 1 ||
        !component[componentIndex - 1] || !component[componentIndex + 1] ||
        !component[componentIndex - bounds.width] || !component[componentIndex + bounds.width];
      if (!boundary) continue;
      for (var outlineY = -2; outlineY <= 2; outlineY += 1) {
        for (var outlineX = -2; outlineX <= 2; outlineX += 1) {
          var paintX = componentX + outlineX;
          var paintY = componentY + outlineY;
          if (paintX < 0 || paintX >= bounds.width || paintY < 0 || paintY >= bounds.height) continue;
          var paintIndex = paintY * bounds.width + paintX;
          if (component[paintIndex]) continue;
          outerOutline[paintIndex] = 1;
          if (Math.abs(outlineX) <= 1 && Math.abs(outlineY) <= 1) innerOutline[paintIndex] = 1;
        }
      }
    }

    inspectionOutlineCache.id = id;
    inspectionOutlineCache.subjectKey = subjectKey;
    inspectionOutlineCache.tick = poseTick;
    inspectionOutlineCache.left = bounds.left;
    inspectionOutlineCache.top = bounds.top;
    inspectionOutlineCache.width = bounds.width;
    inspectionOutlineCache.height = bounds.height;
    inspectionOutlineCache.ready = true;
    paintInspectionOutlineCache();
  }

  function drawPixelDisc(cx, cy, radius, color) {
    ctx.fillStyle = color;
    for (var y = -radius; y <= radius; y += 1) {
      var half = Math.floor(Math.sqrt(radius * radius - y * y));
      ctx.fillRect(Math.floor(cx - half), Math.floor(cy + y), half * 2 + 1, 1);
    }
  }

  function pixelRect(x, y, rectWidth, rectHeight, color) {
    var left = Math.round(x);
    var top = Math.round(y);
    var right = Math.round(x + rectWidth);
    var bottom = Math.round(y + rectHeight);
    if (right <= left || bottom <= top) return;
    ctx.fillStyle = color;
    ctx.fillRect(left, top, right - left, bottom - top);
  }

  function pixelLine(x0, y0, x1, y1, color, thickness) {
    var startX = Math.round(x0);
    var startY = Math.round(y0);
    var endX = Math.round(x1);
    var endY = Math.round(y1);
    var dx = Math.abs(endX - startX);
    var sx = startX < endX ? 1 : -1;
    var dy = -Math.abs(endY - startY);
    var sy = startY < endY ? 1 : -1;
    var error = dx + dy;
    var size = Math.max(1, Math.round(thickness || 1));
    ctx.fillStyle = color;
    while (true) {
      ctx.fillRect(startX - Math.floor(size / 2), startY - Math.floor(size / 2), size, size);
      if (startX === endX && startY === endY) break;
      var doubled = error * 2;
      if (doubled >= dy) {
        error += dy;
        startX += sx;
      }
      if (doubled <= dx) {
        error += dx;
        startY += sy;
      }
    }
  }

  function pixelArc(cx, cy, radius, startAngle, endAngle, color, thickness) {
    var steps = Math.max(12, Math.ceil(radius * Math.abs(endAngle - startAngle) * 1.4));
    var previousX = cx + Math.cos(startAngle) * radius;
    var previousY = cy + Math.sin(startAngle) * radius;
    for (var step = 1; step <= steps; step += 1) {
      var angle = lerp(startAngle, endAngle, step / steps);
      var x = cx + Math.cos(angle) * radius;
      var y = cy + Math.sin(angle) * radius;
      pixelLine(previousX, previousY, x, y, color, thickness);
      previousX = x;
      previousY = y;
    }
  }

  function moduleSpan(x, y, spanWidth, spanHeight, base, light, dark, seed, moduleWidth) {
    var widthLeft = Math.max(0, Math.round(spanWidth));
    var cursor = Math.round(x);
    var module = Math.max(4, Math.round(moduleWidth || 9));
    while (widthLeft > 0) {
      var pieceWidth = Math.min(module, widthLeft);
      pixelRect(cursor, y, pieceWidth, spanHeight, dark);
      if (pieceWidth > 2 && spanHeight > 2) {
        pixelRect(cursor + 1, y + 1, pieceWidth - 2, spanHeight - 2, base);
        pixelRect(cursor + 1, y + 1, pieceWidth - 2, 1, light);
      }
      if (pieceWidth > 5 && hash(seed + cursor * 0.37) > 0.42) {
        pixelRect(cursor + pieceWidth - 2, y + Math.max(1, spanHeight - 2), 1, 1, light);
      }
      cursor += pieceWidth;
      widthLeft -= pieceWidth;
    }
  }

  function panelBlock(x, y, blockWidth, blockHeight, base, light, dark, seed) {
    var tileWidth = 12;
    var tileHeight = 9;
    for (var py = 0; py < blockHeight; py += tileHeight) {
      for (var px = 0; px < blockWidth; px += tileWidth) {
        var pieceWidth = Math.min(tileWidth, blockWidth - px);
        var pieceHeight = Math.min(tileHeight, blockHeight - py);
        pixelRect(x + px, y + py, pieceWidth, pieceHeight, dark);
        if (pieceWidth > 2 && pieceHeight > 2) {
          pixelRect(x + px + 1, y + py + 1, pieceWidth - 2, pieceHeight - 2, base);
          if (hash(seed + px * 2.3 + py * 7.1) > 0.5) {
            pixelRect(x + px + 2, y + py + 2, Math.max(1, pieceWidth - 4), 1, light);
          }
        }
      }
    }
  }

  function drawPixelMask(x, y, mask, colors, mirror) {
    if (!mask || !mask.length) return;
    var originX = Math.round(x);
    var originY = Math.round(y);
    for (var row = 0; row < mask.length; row += 1) {
      var line = mask[row];
      for (var col = 0; col < line.length; col += 1) {
        var key = line[col];
        if (key === " ") continue;
        var color = colors[key];
        if (!color) continue;
        var drawX = mirror ? originX + line.length - 1 - col : originX + col;
        pixelRect(drawX, originY + row, 1, 1, color);
      }
    }
  }

  function hexToRgb(hex) {
    var value = hex.charAt(0) === "#" ? hex.slice(1) : hex;
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16)
    ];
  }

  function buildWaterTexture(palette, line) {
    var texture = document.createElement("canvas");
    texture.width = width;
    texture.height = height;
    var textureContext = texture.getContext("2d", { alpha: true });
    var image = textureContext.createImageData(width, height);
    var colors = [palette.waterTop, palette.water, palette.waterDeep, palette.abyss].map(hexToRgb);
    var stops = [0, 0.28, 0.64, 1];
    var bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];
    var startY = Math.max(0, line);
    var depthSpan = Math.max(1, height - startY);
    for (var y = startY; y < height; y += 1) {
      var depth = clamp((y - startY) / depthSpan, 0, 1);
      for (var x = 0; x < width; x += 1) {
        var worldPixelX = Math.round(screenToWorldX(x));
        var ordered = (bayer[((y % 4) + 4) % 4][((worldPixelX % 4) + 4) % 4] + 0.5) / 16;
        var organic = hash(worldPixelX * 17.13 + y * 31.71);
        var texturedDepth = clamp(depth + (organic - 0.5) * 0.032 + (ordered - 0.5) * 0.014, 0, 1);
        var quantizedDepth = Math.round(texturedDepth * 28) / 28;
        var segment = quantizedDepth < stops[1] ? 0 : quantizedDepth < stops[2] ? 1 : 2;
        var amount = (quantizedDepth - stops[segment]) /
          Math.max(0.001, stops[segment + 1] - stops[segment]);
        var rgb = [
          Math.round(lerp(colors[segment][0], colors[segment + 1][0], amount)),
          Math.round(lerp(colors[segment][1], colors[segment + 1][1], amount)),
          Math.round(lerp(colors[segment][2], colors[segment + 1][2], amount))
        ];
        if (y < startY + 6) rgb = colors[0];
        var index = (y * width + x) * 4;
        image.data[index] = rgb[0];
        image.data[index + 1] = rgb[1];
        image.data[index + 2] = rgb[2];
        image.data[index + 3] = 255;
      }
    }
    textureContext.putImageData(image, 0, 0);
    waterTexture = texture;
  }

  function createSurface() {
    var cols = Math.ceil(width / SURFACE_CELL) + 2;
    surface = {
      cols: cols,
      height: new Float32Array(cols),
      velocity: new Float32Array(cols),
      nextVelocity: new Float32Array(cols)
    };
    for (var col = 0; col < cols; col += 1) {
      surface.height[col] = (
        Math.sin(col * 0.085) * 0.58 + Math.sin(col * 0.031 + 1.8) * 0.34
      ) * tuning.waveEnergy;
    }
  }

  function sampleSurface(x) {
    if (!surface) return 0;
    var gridX = clamp(x / SURFACE_CELL, 0, surface.cols - 1.001);
    var left = Math.floor(gridX);
    var right = Math.min(surface.cols - 1, left + 1);
    return lerp(surface.height[left], surface.height[right], gridX - left);
  }

  function surfaceY(x, time, line, raftX) {
    var worldX = screenToWorldX(x);
    var classicWave = Math.sin(worldX * 0.075 - time * 0.72) * 0.34 +
      Math.sin(worldX * 0.031 - time * 0.31 + 1.4) * 0.16;
    return line + environment.tide + sampleSurface(x) + classicWave * tuning.waveEnergy;
  }

  function disturbSurface(x, impulse, radius) {
    if (!surface) return;
    var center = x / SURFACE_CELL;
    var gridRadius = Math.max(1, radius / SURFACE_CELL);
    var start = Math.max(1, Math.floor(center - gridRadius));
    var end = Math.min(surface.cols - 2, Math.ceil(center + gridRadius));
    for (var col = start; col <= end; col += 1) {
      var distance = Math.abs(col - center) / gridRadius;
      if (distance >= 1) continue;
      surface.velocity[col] += impulse * (0.5 + Math.cos(distance * Math.PI) * 0.5);
    }
  }

  function updateEnvironment(dt, time) {
    var previousTide = environment.tide;
    environment.tide = Math.sin(time * 0.025) * 3.4 + Math.sin(time * 0.008 + 1.2) * 1.2;
    environment.tideVelocity = (environment.tide - previousTide) / Math.max(dt, 0.001);

    var weatherEpoch = Math.floor(time / 42);
    var nextEpoch = weatherEpoch + 1;
    var phase = (time % 42) / 42;
    var a = Math.pow(hash(weatherEpoch * 9.17 + 31), 3.4);
    var b = Math.pow(hash(nextEpoch * 9.17 + 31), 3.4);
    var weatherBlend = phase * phase * (3 - 2 * phase);
    var naturalStorm = lerp(a, b, weatherBlend);
    if (environment.forcedStorm > 0) {
      environment.forcedStorm = Math.max(0, environment.forcedStorm - dt);
      naturalStorm = Math.max(naturalStorm, clamp(environment.forcedStorm / 5, 0, 1));
    }
    environment.stormTarget = 0.05 + naturalStorm * 0.95;
    environment.storm += (environment.stormTarget - environment.storm) * (1 - Math.exp(-dt * 0.32));
    environment.wind = 0.16 + environment.storm * 1.35 + Math.sin(time * 0.06) * 0.08;
  }

  function updateSurface(dt, time) {
    if (!surface) return;
    var storm = environment.storm;
    for (var col = 1; col < surface.cols - 1; col += 1) {
      var laplacian = surface.height[col - 1] + surface.height[col + 1] - surface.height[col] * 2;
      var fluidLift = fluid && col * SURFACE_CELL < width
        ? sampleFluid(col * SURFACE_CELL, fluid.line + 2).y
        : 0;
      var windWave = Math.sin(col * 0.37 + time * (0.7 + storm * 0.8)) *
        environment.wind * 0.035 * tuning.waveEnergy;
      surface.nextVelocity[col] = (
        surface.velocity[col] + (laplacian * 24 + fluidLift * 0.15 + windWave) * dt
      ) * Math.pow(0.986 - storm * 0.003, dt * 60);
    }
    surface.nextVelocity[0] = surface.nextVelocity[1];
    surface.nextVelocity[surface.cols - 1] = surface.nextVelocity[surface.cols - 2];
    surface.velocity.set(surface.nextVelocity);
    for (var x = 0; x < surface.cols; x += 1) {
      surface.height[x] += surface.velocity[x] * dt;
      var surfaceLimit = 2.8 + storm * 4.7;
      surface.height[x] = clamp(surface.height[x], -surfaceLimit, surfaceLimit);
    }

  }

  function updateRain(dt, time, geometry) {
    var storm = environment.storm;
    if (storm > 0.24) {
      rainSpawnAccumulator += dt * width * (0.012 + storm * 0.05);
      while (rainSpawnAccumulator >= 1 && rainDrops.length < Math.ceil(width * 0.22)) {
        rainSpawnAccumulator -= 1;
        rainSeed += 1;
        rainDrops.push({
          x: hash(rainSeed * 17.31 + 2.8) * width,
          y: -3 - hash(rainSeed * 31.7 + 9.4) * Math.max(8, geometry.line * 0.38),
          vx: environment.wind * (0.16 + hash(rainSeed * 7.1) * 0.12),
          vy: 42 + storm * 38 + hash(rainSeed * 11.9) * 12,
          length: 2 + Math.round(storm * 2 + hash(rainSeed * 23.3)),
          seed: rainSeed
        });
      }
    } else {
      rainSpawnAccumulator = Math.min(rainSpawnAccumulator, 0.5);
    }
    for (var drop = rainDrops.length - 1; drop >= 0; drop -= 1) {
      var rain = rainDrops[drop];
      rain.x += rain.vx * dt;
      rain.y += rain.vy * dt;
      var impactY = surfaceY(rain.x, time, geometry.line, raft.x);
      if (rain.y + rain.length >= impactY) {
        disturbSurface(rain.x, -0.045 - storm * 0.055, 3 + storm * 2);
        rainSplashes.push({ x: rain.x, age: 0, life: 0.28 + hash(rain.seed * 3.7) * 0.14, seed: rain.seed });
        rainDrops.splice(drop, 1);
      } else if (rain.x > width + 8 || rain.y > height + 8) {
        rainDrops.splice(drop, 1);
      }
    }
    for (var splash = rainSplashes.length - 1; splash >= 0; splash -= 1) {
      rainSplashes[splash].age += dt;
      if (rainSplashes[splash].age >= rainSplashes[splash].life) rainSplashes.splice(splash, 1);
    }
  }

  function drawRainDrops(palette) {
    ctx.save();
    ctx.globalAlpha = clamp(0.28 + environment.storm * 0.34, 0, 0.62);
    for (var drop = 0; drop < rainDrops.length; drop += 1) {
      var rain = rainDrops[drop];
      var slant = clamp(rain.vx / Math.max(1, rain.vy) * rain.length, -0.7, 0.7);
      pixelLine(rain.x - slant, rain.y - rain.length, rain.x, rain.y, palette.bubble, 1);
    }
    ctx.restore();
  }

  function drawRainSplashes(time, palette, geometry) {
    ctx.save();
    for (var splash = 0; splash < rainSplashes.length; splash += 1) {
      var impact = rainSplashes[splash];
      var progress = clamp(impact.age / impact.life, 0, 1);
      var surface = Math.round(surfaceY(impact.x, time, geometry.line, raft.x));
      var spread = 1 + Math.floor(progress * 3);
      var lift = Math.max(0, Math.round(Math.sin(progress * Math.PI) * 2));
      ctx.globalAlpha = (1 - progress) * 0.72;
      pixelRect(impact.x - spread, surface - lift, 1, 1, palette.foam);
      pixelRect(impact.x + spread, surface - Math.max(0, lift - 1), 1, 1, palette.foam);
      if (progress < 0.34) pixelRect(impact.x, surface - 1, 1, 1, palette.bubble);
    }
    ctx.restore();
  }

  function createParticles() {
    var line = waterlineY();
    var geometry = platformGeometry();
    var count = Math.min(
      1600,
      Math.floor((width * Math.max(1, height - line)) / 210 * tuning.seaLife * visualDensity())
    );
    particles = [];
    for (var i = 0; i < count; i += 1) {
      var seed = hash(i + width * 7 + height * 13);
      var kind = i % 23 === 0 ? "bubble" : i % 13 === 0 ? "silt" : "plankton";
      var particle = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        seed: seed,
        kind: kind,
        cluster: Math.floor(hash(seed * 83.7) * 7)
      };
      placeParticle(particle, i, geometry, 0);
      particles.push(particle);
    }
  }

  function placeParticle(particle, ordinal, geometry, timeSeed) {
    var waterDepth = Math.max(12, height - geometry.line - 5);
    var seedOffset = timeSeed * 0.00017;
    if (particle.kind === "bubble") {
      var ventIndex = Math.floor(hash(particle.seed * 71 + ordinal) * geometry.pylons.length);
      var ventX = geometry.pylons[clamp(ventIndex, 0, geometry.pylons.length - 1)];
      particle.x = ventX + (hash(particle.seed * 97 + seedOffset) - 0.5) * 9;
      particle.y = geometry.line + waterDepth * (0.42 + hash(particle.seed * 103 + seedOffset) * 0.53);
    } else if (particle.kind === "silt") {
      var structureBias = hash(particle.seed * 109 + seedOffset);
      particle.x = structureBias > 0.34
        ? geometry.left - 30 + hash(particle.seed * 127 + seedOffset) * (geometry.right - geometry.left + 60)
        : hash(particle.seed * 131 + seedOffset) * width;
      particle.y = geometry.line + waterDepth * (0.72 + hash(particle.seed * 139 + seedOffset) * 0.25);
    } else {
      var bloomCount = Math.max(3, Math.ceil(width / 115));
      var bloomIndex = particle.cluster % bloomCount;
      var bloomX = (bloomIndex + 0.5) / bloomCount * width;
      var bloomY = geometry.line + waterDepth * (0.2 + hash(bloomIndex * 17.7 + 4.1) * 0.43);
      var bloomRadiusX = 16 + hash(bloomIndex * 29.3 + 2.8) * 26;
      var bloomRadiusY = 8 + hash(bloomIndex * 31.1 + 9.4) * 19;
      var cloudX = hash(particle.seed * 149 + seedOffset) + hash(particle.seed * 157 + seedOffset) - 1;
      var cloudY = hash(particle.seed * 163 + seedOffset) + hash(particle.seed * 173 + seedOffset) - 1;
      particle.x = bloomX + cloudX * bloomRadiusX;
      particle.y = bloomY + cloudY * bloomRadiusY;
    }
    for (var attempt = 0; attempt < 7 && isSolid(particle.x, particle.y, geometry); attempt += 1) {
      particle.x += (hash(particle.seed * 181 + attempt * 13.1) - 0.5) * 32;
      particle.y = clamp(
        particle.y + (hash(particle.seed * 191 + attempt * 17.7) - 0.5) * 24,
        geometry.line + 5,
        height - 5
      );
    }
    particle.vx = 0;
    particle.vy = 0;
  }

  function swimmerDepthPreference(kind, size, seed) {
    var base = 0.23;
    if (kind === "jelly") base = 0.3;
    else if (kind === "eel") base = 0.42;
    else if (kind === "shark") base = 0.48;
    else if (kind === "ray") base = 0.56;
    else if (kind === "hectapus") base = 0.66;
    else if (kind === "seaGiant") base = 0.81;
    var sizeDepth = clamp((size - 0.78) / 0.58, 0, 1) * 0.14;
    return clamp(base + sizeDepth + (seed - 0.5) * 0.1, 0.12, 0.92);
  }

  function createSwimmers() {
    var line = waterlineY();
    var waterDepth = Math.max(24, height - line);
    var depthFactor = Math.sqrt(clamp((height - line) / 154, 0.58, 2.2));
    var count = clamp(Math.floor(width / 13 * depthFactor * tuning.seaLife * visualDensity()), 10, 210);
    swimmers = [];
    for (var i = 0; i < count; i += 1) {
      var kind = i % 23 === 0
        ? "seaGiant"
        : i % 17 === 0
          ? "hectapus"
          : i % 11 === 0
            ? "shark"
            : i % 5 === 0
              ? "jelly"
              : i % 13 === 0
                ? "ray"
                : i % 7 === 0
                  ? "eel"
                  : "fish";
      var swimmerSeed = hash(i * 23.7 + 3);
      var swimmerSize = 0.78 + hash(i * 31.9 + 11) * 0.58;
      var depthTarget = swimmerDepthPreference(kind, swimmerSize, swimmerSeed);
      var schoolCount = Math.max(3, Math.ceil(width / 120));
      var schoolId = Math.floor(i / 7) % schoolCount;
      var swimmerX = kind === "fish"
        ? (schoolId + 0.5) / schoolCount * width + (hash(i * 7.3 + width) - 0.5) * 34
        : hash(i * 7.3 + width) * width;
      var swimmer = {
        x: swimmerX,
        y: line + waterDepth * clamp(depthTarget + (hash(i * 11.9 + height) - 0.5) * 0.09, 0.1, 0.94),
        vx: (hash(i * 4.7) - 0.5) * 0.8,
        vy: (hash(i * 9.1) - 0.5) * 0.3,
        energy: 0.45 + hash(i * 17.3) * 0.5,
        seed: swimmerSeed,
        kind: kind,
        size: swimmerSize,
        depthTarget: depthTarget,
        school: schoolId,
        transitSchool: kind === "fish" && schoolId < 2,
        transitDirection: schoolId % 2 === 0 ? 1 : -1,
        direction: 1
      };
      if (CreatureVariation) swimmer.variation = CreatureVariation.createTraits(kind, swimmerSeed, swimmerSize);
      if (ecology) ecology.ensureAgent(swimmer, i, kind);
      swimmers.push(swimmer);
    }
  }

  function createDeposits() {
    deposits = new Float32Array(Math.ceil(width / 2) + 1);
  }

  function isSolid(x, y, geometry) {
    if (y < geometry.line + 2) return false;
    for (var i = 0; i < geometry.pylons.length; i += 1) {
      var px = geometry.pylons[i];
      if (x >= px - 2 && x <= px + 3 && y <= geometry.foundationTop + 2) return true;
    }
    if (
      x >= geometry.left - 5 &&
      x <= geometry.right &&
      y >= geometry.foundationTop &&
      y <= geometry.foundationBottom
    ) return true;
    return false;
  }

  var swimmerColliderScratch = { x: 4, y: 3 };

  function swimmerCollisionExtents(swimmer, out) {
    var extents = out || {};
    var radiusX = swimmer.kind === "seaGiant" ? 12 :
      swimmer.kind === "hectapus" || swimmer.kind === "shark" ? 8 :
        swimmer.kind === "ray" || swimmer.kind === "eel" ? 6 :
          swimmer.kind === "jelly" ? 5 : 4;
    var radiusY = swimmer.kind === "seaGiant" ? 7 :
      swimmer.kind === "hectapus" ? 8 :
        swimmer.kind === "jelly" ? 7 :
          swimmer.kind === "ray" ? 5 : 3;
    if (CreatureVariation && swimmer.variation) {
      var bounds = CreatureVariation.boundsFor(swimmer.variation, extents);
      radiusX = Math.max(radiusX, Math.abs(bounds.left), Math.abs(bounds.right));
      radiusY = Math.max(radiusY, Math.abs(bounds.top), Math.abs(bounds.bottom));
    }
    extents.x = Math.ceil(radiusX) + 1;
    extents.y = Math.ceil(radiusY) + 1;
    return extents;
  }

  function swimmerInspectionContains(swimmer, x, y) {
    var extents = swimmerCollisionExtents(swimmer, swimmerColliderScratch);
    var dx = (x - swimmer.x) / Math.max(1, extents.x + 2);
    var dy = (y - swimmer.y) / Math.max(1, extents.y + 2);
    return dx * dx + dy * dy <= 1;
  }

  function swimmerPixelContains(swimmer, x, y, time) {
    if (!swimmerInspectionContains(swimmer, x, y)) return false;
    inspectMaskCtx.setTransform(1, 0, 0, 1, 0, 0);
    inspectMaskCtx.clearRect(0, 0, width, height);
    inspectMaskCtx.globalAlpha = 1;
    var sceneCtx = ctx;
    ctx = inspectMaskCtx;
    try {
      drawVariedSwimmer(swimmer, time, INSPECTION_MASK_PALETTE);
    } finally {
      inspectMaskCtx.globalAlpha = 1;
      ctx = sceneCtx;
    }
    var sampleX = clamp(Math.round(x) - 1, 0, width - 1);
    var sampleY = clamp(Math.round(y) - 1, 0, height - 1);
    var sampleWidth = Math.min(3, width - sampleX);
    var sampleHeight = Math.min(3, height - sampleY);
    var pixels = inspectMaskCtx.getImageData(sampleX, sampleY, sampleWidth, sampleHeight).data;
    for (var pixel = 3; pixel < pixels.length; pixel += 4) {
      if (pixels[pixel] >= 18) return true;
    }
    return false;
  }

  function swimmerIntersectsRect(x, y, extents, left, top, right, bottom) {
    return x + extents.x >= left && x - extents.x <= right &&
      y + extents.y >= top && y - extents.y <= bottom;
  }

  function swimmerCollidesAt(swimmer, x, y, geometry) {
    var extents = swimmerCollisionExtents(swimmer, swimmerColliderScratch);
    var pylonTop = geometry.line + 2;
    var pylonBottom = geometry.foundationTop + 2;
    for (var i = 0; i < geometry.pylons.length; i += 1) {
      var px = geometry.pylons[i];
      if (swimmerIntersectsRect(x, y, extents, px - 2, pylonTop, px + 3, pylonBottom)) return true;
    }
    return swimmerIntersectsRect(
      x, y, extents,
      geometry.left - 5, geometry.foundationTop,
      geometry.right, geometry.foundationBottom
    );
  }

  function ejectSwimmerFromStructure(swimmer, geometry) {
    var extents = swimmerCollisionExtents(swimmer, swimmerColliderScratch);
    if (!swimmerCollidesAt(swimmer, swimmer.x, swimmer.y, geometry)) return false;
    // Expanded pylon colliders overlap for larger animals. Treat the entire
    // station obstruction as one envelope during depenetration so resolving
    // one post can never place the animal directly inside its neighbor.
    var targetLeft = Math.min(geometry.left - 5, geometry.pylons[0] - 2) - extents.x - 1;
    var targetRight = Math.max(geometry.right, geometry.pylons[geometry.pylons.length - 1] + 3) + extents.x + 1;
    var targetBottom = geometry.foundationBottom + extents.y + 1;
    var leftDistance = Math.abs(swimmer.x - targetLeft);
    var rightDistance = Math.abs(targetRight - swimmer.x);
    var bottomDistance = Math.abs(targetBottom - swimmer.y);
    var minimum = Math.min(leftDistance, rightDistance, bottomDistance);
    if (minimum === leftDistance) {
      swimmer.x = targetLeft;
      swimmer.vx = -Math.max(0.12, Math.abs(swimmer.vx) * 0.35);
    } else if (minimum === rightDistance) {
      swimmer.x = targetRight;
      swimmer.vx = Math.max(0.12, Math.abs(swimmer.vx) * 0.35);
    } else {
      swimmer.y = targetBottom;
      swimmer.vy = Math.max(0.08, Math.abs(swimmer.vy) * 0.3);
    }
    return true;
  }

  function moveSwimmerAroundStructure(swimmer, nextX, nextY, geometry) {
    ejectSwimmerFromStructure(swimmer, geometry);
    if (!swimmerCollidesAt(swimmer, nextX, nextY, geometry)) {
      swimmer.x = nextX;
      swimmer.y = nextY;
      return;
    }
    // Slide along the obstruction when one axis remains clear. Zeroing the
    // blocked component avoids the frame-by-frame direction reversal that
    // made embedded animals flicker.
    if (!swimmerCollidesAt(swimmer, nextX, swimmer.y, geometry)) {
      swimmer.x = nextX;
      swimmer.vy *= 0.18;
      return;
    }
    if (!swimmerCollidesAt(swimmer, swimmer.x, nextY, geometry)) {
      swimmer.y = nextY;
      swimmer.vx *= 0.18;
      return;
    }
    swimmer.vx *= 0.12;
    swimmer.vy *= 0.12;
    ejectSwimmerFromStructure(swimmer, geometry);
  }

  function swimmerTentacleRoot(swimmer, index, count, out) {
    var traits = swimmer.variation;
    var across = count <= 1 ? 0 : index / (count - 1) * 2 - 1;
    if (swimmer.kind === "jelly") {
      out.x = swimmer.x + across * Math.max(2, traits.bodyLength * 0.34);
      out.y = swimmer.y;
    } else {
      out.x = swimmer.x + across * Math.max(2, traits.bodyLength * 0.3);
      out.y = swimmer.y + Math.max(1, traits.bodyHeight * 0.28);
    }
    return out;
  }

  function initializeSwimmerTentacles(swimmer) {
    var traits = swimmer.variation;
    var count = traits ? traits.tentacleCount : 0;
    swimmer.tentacles = [];
    var root = {};
    for (var tentacle = 0; tentacle < count; tentacle += 1) {
      swimmerTentacleRoot(swimmer, tentacle, count, root);
      var segmentCount = swimmer.kind === "jelly" ? 7 : 6;
      var segmentLength = Math.max(0.9, traits.tentacleLength / segmentCount);
      var chain = { points: [], previous: [], segmentLength: segmentLength };
      for (var point = 0; point <= segmentCount; point += 1) {
        var seedWave = Math.sin(swimmer.seed * 41 + tentacle * 1.9 + point * 0.7) * point * 0.12;
        var px = root.x + seedWave;
        var py = root.y + point * segmentLength;
        chain.points.push({ x: px, y: py });
        chain.previous.push({ x: px, y: py });
      }
      swimmer.tentacles.push(chain);
    }
  }

  function updateSwimmerTentacles(swimmer, dt, time) {
    if (swimmer.kind !== "jelly" && swimmer.kind !== "hectapus") return;
    var traits = swimmer.variation;
    if (!traits) return;
    if (!swimmer.tentacles || swimmer.tentacles.length !== traits.tentacleCount) {
      initializeSwimmerTentacles(swimmer);
    }
    var root = {};
    for (var tentacle = 0; tentacle < swimmer.tentacles.length; tentacle += 1) {
      var chain = swimmer.tentacles[tentacle];
      swimmerTentacleRoot(swimmer, tentacle, swimmer.tentacles.length, root);
      var rootPoint = chain.points[0];
      if (Math.abs(rootPoint.x - root.x) + Math.abs(rootPoint.y - root.y) > 48) {
        initializeSwimmerTentacles(swimmer);
        return;
      }
      rootPoint.x = root.x;
      rootPoint.y = root.y;
      chain.previous[0].x = root.x;
      chain.previous[0].y = root.y;
      for (var point = 1; point < chain.points.length; point += 1) {
        var current = chain.points[point];
        var previous = chain.previous[point];
        var velocityX = (current.x - previous.x) * 0.925;
        var velocityY = (current.y - previous.y) * 0.925;
        previous.x = current.x;
        previous.y = current.y;
        var flow = sampleFluid(current.x, current.y);
        var freedom = point / (chain.points.length - 1);
        current.x += velocityX + flow.x * dt * 0.22 +
          Math.sin(time * 0.24 + swimmer.seed * 37 + tentacle * 1.3 + freedom * 3.8) * 0.008 * freedom;
        current.y += velocityY + (0.005 + flow.y * dt * 0.16) * freedom;
      }
      for (var constraint = 0; constraint < 3; constraint += 1) {
        chain.points[0].x = root.x;
        chain.points[0].y = root.y;
        for (var segment = 1; segment < chain.points.length; segment += 1) {
          var a = chain.points[segment - 1];
          var b = chain.points[segment];
          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var distance = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
          var correction = (distance - chain.segmentLength) / distance;
          if (segment === 1) {
            b.x -= dx * correction;
            b.y -= dy * correction;
          } else {
            a.x += dx * correction * 0.5;
            a.y += dy * correction * 0.5;
            b.x -= dx * correction * 0.5;
            b.y -= dy * correction * 0.5;
          }
        }
      }
    }
  }

  function fluidIndex(col, row) {
    return row * fluid.cols + col;
  }

  function createFluid(geometry) {
    var cols = Math.ceil(width / FLUID_CELL) + 1;
    var rows = Math.ceil((height - geometry.line) / FLUID_CELL) + 1;
    var size = cols * rows;
    fluid = {
      cols: cols,
      rows: rows,
      line: geometry.line,
      u: new Float32Array(size),
      v: new Float32Array(size),
      u0: new Float32Array(size),
      v0: new Float32Array(size),
      pressure: new Float32Array(size),
      pressure0: new Float32Array(size),
      divergence: new Float32Array(size),
      dye: new Float32Array(size),
      dye0: new Float32Array(size),
      nutrient: new Float32Array(size),
      nutrient0: new Float32Array(size),
      plankton: new Float32Array(size),
      plankton0: new Float32Array(size),
      solid: new Uint8Array(size)
    };
    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var index = row * cols + col;
        var worldX = col * FLUID_CELL;
        var worldY = geometry.line + row * FLUID_CELL;
        fluid.u[index] = 0.3;
        var depth = row / Math.max(1, rows - 1);
        fluid.nutrient[index] = 0.24 + depth * 0.58 + hash(col * 3.1 + row * 7.7) * 0.08;
        var simulationWorldX = screenToWorldX(worldX);
        var bloomWaveA = Math.max(0, Math.sin(simulationWorldX * 0.035 + row * 0.17) * 0.5 + 0.5 - 0.48) / 0.52;
        var bloomWaveB = Math.max(0, Math.sin(simulationWorldX * 0.017 - row * 0.23 + 2.1) * 0.5 + 0.5 - 0.62) / 0.38;
        var bloomField = clamp(bloomWaveA * 0.7 + bloomWaveB * 0.55, 0, 1);
        fluid.plankton[index] = (1 - depth * 0.72) *
          (0.025 + bloomField * 0.24 + hash(col * 5.3 + row * 11.9) * 0.035);
        fluid.solid[index] = isSolid(worldX, worldY, geometry) ? 1 : 0;
      }
    }
  }

  function sampleGridArray(array, cols, rows, gridX, gridY) {
    if (!array || cols < 1 || rows < 1) return 0;
    var x = clamp(gridX, 0, cols - 1.001);
    var y = clamp(gridY, 0, rows - 1.001);
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var x1 = Math.min(cols - 1, x0 + 1);
    var y1 = Math.min(rows - 1, y0 + 1);
    var tx = x - x0;
    var ty = y - y0;
    var a = array[y0 * cols + x0] * (1 - tx) + array[y0 * cols + x1] * tx;
    var b = array[y1 * cols + x0] * (1 - tx) + array[y1 * cols + x1] * tx;
    return a * (1 - ty) + b * ty;
  }

  function sampleFluidArray(array, gridX, gridY) {
    if (!fluid) return 0;
    return sampleGridArray(array, fluid.cols, fluid.rows, gridX, gridY);
  }

  function sampleFluid(x, y) {
    if (!fluid || y < fluid.line) return { x: 0.3, y: 0, dye: 0, nutrient: 0, plankton: 0 };
    var gridX = x / FLUID_CELL;
    var gridY = (y - fluid.line) / FLUID_CELL;
    return {
      x: sampleFluidArray(fluid.u, gridX, gridY),
      y: sampleFluidArray(fluid.v, gridX, gridY),
      dye: sampleFluidArray(fluid.dye, gridX, gridY),
      nutrient: sampleFluidArray(fluid.nutrient, gridX, gridY),
      plankton: sampleFluidArray(fluid.plankton, gridX, gridY)
    };
  }

  function consumePlankton(x, y, amount) {
    if (!fluid || y < fluid.line) return 0;
    var col = clamp(Math.round(x / FLUID_CELL), 0, fluid.cols - 1);
    var row = clamp(Math.round((y - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
    var index = fluidIndex(col, row);
    var eaten = Math.min(fluid.plankton[index], amount);
    fluid.plankton[index] -= eaten;
    fluid.nutrient[index] = clamp(fluid.nutrient[index] + eaten * 0.22, 0, 1.5);
    return eaten;
  }

  function injectFluid(x, y, forceX, forceY, radius, dyeAmount) {
    if (!fluid || y < fluid.line - radius) return;
    var minCol = clamp(Math.floor((x - radius) / FLUID_CELL), 0, fluid.cols - 1);
    var maxCol = clamp(Math.ceil((x + radius) / FLUID_CELL), 0, fluid.cols - 1);
    var minRow = clamp(Math.floor((y - radius - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
    var maxRow = clamp(Math.ceil((y + radius - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
    for (var row = minRow; row <= maxRow; row += 1) {
      for (var col = minCol; col <= maxCol; col += 1) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) continue;
        var dx = col * FLUID_CELL - x;
        var dy = fluid.line + row * FLUID_CELL - y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= radius) continue;
        var falloff = 1 - distance / radius;
        fluid.u[index] += forceX * falloff;
        fluid.v[index] += forceY * falloff;
        fluid.dye[index] = clamp(fluid.dye[index] + dyeAmount * falloff, 0, 1.5);
      }
    }
  }

  function projectFluid() {
    var cols = fluid.cols;
    var rows = fluid.rows;
    fluid.pressure.fill(0);
    for (var row = 1; row < rows - 1; row += 1) {
      for (var col = 1; col < cols - 1; col += 1) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) continue;
        fluid.divergence[index] = -0.5 * (
          fluid.u[fluidIndex(col + 1, row)] - fluid.u[fluidIndex(col - 1, row)] +
          fluid.v[fluidIndex(col, row + 1)] - fluid.v[fluidIndex(col, row - 1)]
        );
      }
    }

    for (var iteration = 0; iteration < 7; iteration += 1) {
      fluid.pressure0.set(fluid.pressure);
      for (var py = 1; py < rows - 1; py += 1) {
        for (var px = 1; px < cols - 1; px += 1) {
          var pressureIndex = fluidIndex(px, py);
          if (fluid.solid[pressureIndex]) continue;
          fluid.pressure[pressureIndex] = (
            fluid.divergence[pressureIndex] +
            fluid.pressure0[fluidIndex(px - 1, py)] +
            fluid.pressure0[fluidIndex(px + 1, py)] +
            fluid.pressure0[fluidIndex(px, py - 1)] +
            fluid.pressure0[fluidIndex(px, py + 1)]
          ) * 0.25;
        }
      }
    }

    for (var vy = 1; vy < rows - 1; vy += 1) {
      for (var vx = 1; vx < cols - 1; vx += 1) {
        var velocityIndex = fluidIndex(vx, vy);
        if (fluid.solid[velocityIndex]) {
          fluid.u[velocityIndex] = 0;
          fluid.v[velocityIndex] = 0;
          continue;
        }
        fluid.u[velocityIndex] -= 0.5 * (
          fluid.pressure[fluidIndex(vx + 1, vy)] - fluid.pressure[fluidIndex(vx - 1, vy)]
        );
        fluid.v[velocityIndex] -= 0.5 * (
          fluid.pressure[fluidIndex(vx, vy + 1)] - fluid.pressure[fluidIndex(vx, vy - 1)]
        );
      }
    }
  }

  function updateFluid(dt, time, geometry, actors) {
    if (!fluid) return;
    fluid.u0.set(fluid.u);
    fluid.v0.set(fluid.v);
    fluid.dye0.set(fluid.dye);
    fluid.nutrient0.set(fluid.nutrient);
    fluid.plankton0.set(fluid.plankton);

    for (var row = 0; row < fluid.rows; row += 1) {
      for (var col = 0; col < fluid.cols; col += 1) {
        var index = fluidIndex(col, row);
        if (fluid.solid[index]) {
          fluid.u[index] = 0;
          fluid.v[index] = 0;
          fluid.dye[index] *= 0.92;
          fluid.plankton[index] *= 0.995;
          continue;
        }
        var backX = col - fluid.u0[index] * dt / FLUID_CELL;
        var backY = row - fluid.v0[index] * dt / FLUID_CELL;
        var depth = row / Math.max(1, fluid.rows - 1);
        var tidalCurrent = Math.cos(time * 0.025) * 0.18;
        var targetCurrent = 0.26 + tidalCurrent + Math.sin(row * 0.21 + time * 0.08) * 0.06 * (1 - depth);
        fluid.u[index] = sampleFluidArray(fluid.u0, backX, backY) * 0.997 + targetCurrent * 0.003;
        fluid.v[index] = sampleFluidArray(fluid.v0, backX, backY) * (0.994 - environment.storm * 0.001);
        fluid.dye[index] = sampleFluidArray(fluid.dye0, backX, backY) * 0.986;
        var nutrient = sampleFluidArray(fluid.nutrient0, backX, backY);
        var plankton = sampleFluidArray(fluid.plankton0, backX, backY);
        var light = Math.max(0, 1 - depth * 1.28);
        var growth = plankton * nutrient * light * (0.34 + environment.storm * 0.08) * dt;
        var respiration = plankton * (0.024 + depth * 0.018) * dt;
        fluid.plankton[index] = clamp(plankton + growth - respiration, 0, 1.35);
        fluid.nutrient[index] = clamp(nutrient - growth * 0.72 + respiration * 0.38 + depth * 0.002 * dt, 0, 1.45);
        if (depth > 0.78) fluid.nutrient[index] += (0.82 - fluid.nutrient[index]) * dt * 0.012;
      }
    }

    for (var top = 0; top < fluid.cols; top += 1) {
      var topIndex = fluidIndex(top, 0);
      if (!fluid.solid[topIndex]) {
        var surfaceCol = clamp(Math.floor(top * FLUID_CELL / SURFACE_CELL), 0, surface.cols - 1);
        fluid.u[topIndex] += Math.sin(top * 0.31 + time * 0.35) * 0.008 + environment.wind * 0.004;
        fluid.v[topIndex] += surface.velocity[surfaceCol] * 0.018 + environment.tideVelocity * 0.006;
      }
    }

    for (var pylon = 0; pylon < geometry.pylons.length; pylon += 1) {
      var direction = pylon % 2 ? 1 : -1;
      injectFluid(geometry.pylons[pylon] + 5, geometry.line + 30, 0.02, direction * 0.025, 12, 0.006);
    }
    injectFluid(actors.raftX - 10, geometry.line + 5, actors.raftVX * 0.06, actors.raftVY * 0.04, 18, 0);
    for (var leviathanIndex = 0; leviathanIndex < actors.leviathans.length; leviathanIndex += 1) {
      var leviathanActor = actors.leviathans[leviathanIndex];
      injectFluid(
        leviathanActor.x - leviathanActor.direction * 28 * leviathanActor.scale,
        leviathanActor.y,
        leviathanActor.direction * 0.032 * leviathanActor.scale,
        Math.sin(time * 0.16 + leviathanActor.phase) * 0.035,
        36 + 18 * leviathanActor.scale,
        0.012 * leviathanActor.scale
      );
    }
    for (var swimmerIndex = 0; swimmerIndex < actors.swimmers.length; swimmerIndex += 1) {
      var swimmerActor = actors.swimmers[swimmerIndex];
      var swimmerWake = swimmerWakeProfile(swimmerActor);
      var wakeX = swimmerActor.x - swimmerActor.direction * swimmerWake.radius * 0.42;
      injectFluid(
        wakeX,
        swimmerActor.y,
        swimmerActor.vx * swimmerWake.force,
        swimmerActor.vy * swimmerWake.force +
          Math.sin(time * swimmerWake.pulseSpeed + swimmerActor.seed * 31) * swimmerWake.pulse,
        swimmerWake.radius,
        swimmerWake.dye
      );
    }
    var activeColossal = activeColossalEncounter(time, geometry.line);
    if (activeColossal) {
      var colossal = activeColossal.state;
      var colossalEncounter = activeColossal.encounter;
      var colossalIndex = activeColossal.index;
      injectFluid(
        colossal.x,
        colossal.y,
        colossalEncounter.direction * 0.0055 * colossal.scale +
          Math.sin(time * 0.12 + colossalIndex) * 0.0024 * colossal.scale,
        Math.sin(time * 0.08 + colossalIndex) * 0.004,
        Math.min(96, 20 + colossal.scale * 10),
        0.003 + colossal.scale * 0.0007
      );
      var advanceX = colossal.x + colossalEncounter.direction * colossal.scale * 30;
      injectFluid(
        advanceX,
        colossal.y,
        colossalEncounter.direction * 0.0032 * colossal.scale,
        Math.sin(time * 0.065 + colossalIndex * 1.7) * 0.0025,
        Math.min(112, 42 + colossal.scale * 11),
        0.0012
      );
    }
    var backgroundTitan = activeBackgroundTitan(time, geometry.line);
    if (backgroundTitan) {
      injectFluid(
        backgroundTitan.state.x,
        backgroundTitan.state.y,
        backgroundTitan.encounter.direction * 0.018,
        Math.sin(time * 0.025 + backgroundTitan.index) * 0.004,
        Math.min(130, backgroundTitan.state.radiusY * 1.25),
        0.0015
      );
    }
    if (ecologyEvent && ecologyEvent.active) {
      var eventX = ecologyEvent.x * width;
      var eventY = geometry.line + ecologyEvent.depth * Math.max(20, height - geometry.line);
      if (ecologyEvent.type === "shadowPassage") {
        var shadowTravel = ecologyEvent.direction > 0 ? ecologyEvent.phase : 1 - ecologyEvent.phase;
        eventX = lerp(-90, width + 90, shadowTravel);
        injectFluid(
          eventX,
          eventY,
          ecologyEvent.direction * 0.11 * ecologyEvent.intensity,
          Math.sin(time * 0.18) * 0.035 * ecologyEvent.intensity,
          78,
          0.006 * ecologyEvent.intensity
        );
      } else if (ecologyEvent.type === "distantBreach") {
        injectFluid(eventX, geometry.line + 4, 0, 0.18 * ecologyEvent.intensity, 32, 0.01);
        disturbSurface(eventX, -0.5 * ecologyEvent.intensity * dt, 28);
      } else if (ecologyEvent.type === "feedingFrenzy") {
        injectFluid(eventX, eventY, ecologyEvent.direction * 0.08, -0.04, 34, 0.004);
      }
    }
    if (environment.storm > 0.28) {
      injectFluid(
        hash(Math.floor(time * 2.2)) * width,
        geometry.line + 12,
        environment.wind * 0.08,
        (hash(Math.floor(time * 3.7) + 4) - 0.5) * environment.storm * 0.18,
        38,
        environment.storm * 0.006
      );
    }
    for (var nutrientIndex = 0; nutrientIndex < actors.leviathans.length; nutrientIndex += 1) {
      var nutrientActor = actors.leviathans[nutrientIndex];
      var leviathanCell = sampleFluid(nutrientActor.x, nutrientActor.y);
      if (leviathanCell.nutrient < 1.1) {
        var lcol = clamp(Math.round(nutrientActor.x / FLUID_CELL), 0, fluid.cols - 1);
        var lrow = clamp(Math.round((nutrientActor.y - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
        fluid.nutrient[fluidIndex(lcol, lrow)] = clamp(fluid.nutrient[fluidIndex(lcol, lrow)] + dt * 0.055, 0, 1.3);
      }
    }
    projectFluid();
  }

  function flowAt(x, y, time) {
    var flow = sampleFluid(x, y);
    flow.x += Math.sin(y * 0.025 + time * 0.12) * 0.025;
    flow.y += Math.sin(x * 0.018 - time * 0.14) * 0.018;
    return flow;
  }

  function swimmerWakeProfile(swimmer) {
    var radius = 7;
    var force = 0.018;
    var pulse = 0.002;
    var pulseSpeed = 0.9;
    var dye = 0.0015;
    if (swimmer.kind === "jelly") {
      radius = 8;
      force = 0.012;
      pulse = 0.007;
      pulseSpeed = 1.15;
    } else if (swimmer.kind === "ray") {
      radius = 11;
      force = 0.022;
      pulse = 0.004;
      pulseSpeed = 0.42;
    } else if (swimmer.kind === "eel") {
      radius = 9;
      force = 0.025;
      pulse = 0.006;
      pulseSpeed = 1.35;
    } else if (swimmer.kind === "shark") {
      radius = 14;
      force = 0.029;
      pulse = 0.003;
      pulseSpeed = 0.55;
      dye = 0.0025;
    } else if (swimmer.kind === "hectapus") {
      radius = 16;
      force = 0.026;
      pulse = 0.007;
      pulseSpeed = 0.66;
      dye = 0.003;
    } else if (swimmer.kind === "seaGiant") {
      radius = 25;
      force = 0.042;
      pulse = 0.008;
      pulseSpeed = 0.2;
      dye = 0.004;
    }
    var size = clamp(swimmer.size || 1, 0.7, 1.5);
    return {
      radius: radius * size,
      force: force * size,
      pulse: pulse * size,
      pulseSpeed: pulseSpeed,
      dye: dye * size
    };
  }

  function depositSediment(x, amount) {
    if (!deposits) return;
    var index = clamp(Math.floor(x / 2), 0, deposits.length - 1);
    deposits[index] = clamp(deposits[index] + amount, 0, 5.5);
  }

  function updateSediment(dt, geometry) {
    if (!fluid || !deposits) return;
    var start = Math.max(0, Math.floor((geometry.left - 6) / 2));
    var end = Math.min(deposits.length - 1, Math.ceil(geometry.right / 2));
    for (var slot = start; slot <= end; slot += 1) {
      var x = slot * 2;
      var sampleY = geometry.foundationTop - 4;
      var flow = sampleFluid(x, sampleY);
      var speed = Math.sqrt(flow.x * flow.x + flow.y * flow.y);
      var fluidCol = clamp(Math.round(x / FLUID_CELL), 0, fluid.cols - 1);
      var fluidRow = clamp(Math.round((sampleY - fluid.line) / FLUID_CELL), 0, fluid.rows - 1);
      var index = fluidIndex(fluidCol, fluidRow);
      var deposition = fluid.dye[index] * Math.max(0, 0.58 - speed) * dt * 0.065;
      var erosion = deposits[slot] * Math.max(0, speed + environment.storm * 0.24 - 0.54) * dt * 0.024;
      deposits[slot] = clamp(deposits[slot] + deposition - erosion, 0, 5.5);
      fluid.dye[index] = clamp(fluid.dye[index] - deposition * 0.45 + erosion * 0.8, 0, 1.5);
    }
  }

  function updateSwimmers(dt, time, geometry, actors) {
    var activeColossalWarning = activeColossalEncounter(time, geometry.line);
    for (var i = 0; i < swimmers.length; i += 1) {
      var swimmer = swimmers[i];
      var sense = 13;
      var leftFood = sampleFluid(swimmer.x - sense, swimmer.y).plankton;
      var rightFood = sampleFluid(swimmer.x + sense, swimmer.y).plankton;
      var upFood = sampleFluid(swimmer.x, swimmer.y - sense).plankton;
      var downFood = sampleFluid(swimmer.x, swimmer.y + sense).plankton;
      var flow = sampleFluid(swimmer.x, swimmer.y);
      var desiredX = (rightFood - leftFood) * 1.7 + (swimmer.seed - 0.48) * 0.12;
      var desiredY = (downFood - upFood) * 1.45 + Math.sin(time * 0.2 + swimmer.seed * 19) * 0.035;
      var maxSpeed = 1.45;
      var movementScale = 7;
      var feedingRate = 0.016;
      if (swimmer.kind === "jelly") {
        desiredX *= 0.24;
        desiredY = Math.sin(time * 1.15 + swimmer.seed * 17) * 0.16;
        maxSpeed = 0.58;
        movementScale = 4.2;
        feedingRate = 0.004;
      } else if (swimmer.kind === "ray") {
        desiredX *= 0.58;
        desiredY += Math.sin(time * 0.35 + swimmer.seed * 11) * 0.08;
        maxSpeed = 0.95;
        movementScale = 5.5;
        feedingRate = 0.011;
      } else if (swimmer.kind === "eel") {
        desiredX += Math.sin(time * 1.7 + swimmer.seed * 23) * 0.24;
        desiredY += Math.cos(time * 1.2 + swimmer.seed * 29) * 0.12;
        maxSpeed = 1.75;
        movementScale = 8.2;
        feedingRate = 0.013;
      } else if (swimmer.kind === "shark") {
        desiredX += swimmer.direction * 0.18;
        desiredY *= 0.55;
        maxSpeed = 1.9;
        movementScale = 8.8;
        feedingRate = 0.021;
      } else if (swimmer.kind === "hectapus") {
        desiredX *= 0.3;
        desiredY += Math.sin(time * 0.72 + swimmer.seed * 21) * 0.07;
        maxSpeed = 0.72;
        movementScale = 4.8;
        feedingRate = 0.018;
      } else if (swimmer.kind === "seaGiant") {
        desiredX *= 0.22;
        desiredY += Math.sin(time * 0.19 + swimmer.seed * 15) * 0.03;
        maxSpeed = 0.48;
        movementScale = 3.5;
        feedingRate = 0.026;
      }

      if (swimmer.kind === "fish" && swimmer.transitSchool) {
        var routeDepth = 0.26 + swimmer.school * 0.13;
        var routeY = geometry.line + Math.max(24, height - geometry.line) * routeDepth;
        desiredX += swimmer.transitDirection * 0.46;
        desiredY += clamp((routeY - swimmer.y) * 0.018, -0.34, 0.34);
        maxSpeed = Math.min(maxSpeed, 1.18);
        movementScale = 6.2;
      }

      var behaviorSchoolingScale = 1;
      var behaviorSeparationScale = 1;
      var behaviorFlowScale = 1;
      var behaviorDepthOffset = 0;
      if (ecology) {
        var threat = 0;
        var threatDX = 0;
        var threatDY = 0;
        for (var ecologyPredator = 0; ecologyPredator < leviathans.length; ecologyPredator += 1) {
          var ecologyLeviathan = leviathans[ecologyPredator];
          var ecologyDx = swimmer.x - ecologyLeviathan.x;
          var ecologyDy = swimmer.y - ecologyLeviathan.y;
          var ecologyDistance = Math.sqrt(ecologyDx * ecologyDx + ecologyDy * ecologyDy);
          var ecologyRadius = 76 + ecologyLeviathan.scale * 42;
          if (ecologyDistance > 0.1 && ecologyDistance < ecologyRadius) {
            var ecologyFear = 1 - ecologyDistance / ecologyRadius;
            if (ecologyFear > threat) {
              threat = ecologyFear;
              threatDX = ecologyDx / ecologyDistance;
              threatDY = ecologyDy / ecologyDistance;
            }
          }
        }
        if (swimmer.kind === "fish" || swimmer.kind === "jelly" || swimmer.kind === "ray") {
          for (var ecologyHunter = 0; ecologyHunter < swimmers.length; ecologyHunter += 1) {
            var hunter = swimmers[ecologyHunter];
            if (hunter === swimmer || hunter.kind !== "shark") continue;
            var hunterDx = swimmer.x - hunter.x;
            var hunterDy = swimmer.y - hunter.y;
            var hunterDistance = Math.sqrt(hunterDx * hunterDx + hunterDy * hunterDy);
            if (hunterDistance > 0.1 && hunterDistance < 72) {
              var hunterThreat = 1 - hunterDistance / 72;
              if (hunterThreat > threat) {
                threat = hunterThreat;
                threatDX = hunterDx / hunterDistance;
                threatDY = hunterDy / hunterDistance;
              }
            }
          }
        }
        var curiosityDx = raft.x + 14 - swimmer.x;
        var curiosityDy = raft.y - swimmer.y;
        var curiosityDistance = Math.sqrt(curiosityDx * curiosityDx + curiosityDy * curiosityDy);
        var curiosity = swimmer.kind === "shark" || swimmer.kind === "hectapus"
          ? clamp(1 - curiosityDistance / 130, 0, 1)
          : clamp(1 - curiosityDistance / 88, 0, 1) * 0.7;
        var shelterTargetX = geometry.left - 10;
        var shelterTargetY = geometry.line + Math.min(54, (height - geometry.line) * 0.35);
        var shelterDx = shelterTargetX - swimmer.x;
        var shelterDy = shelterTargetY - swimmer.y;
        var shelterDistance = Math.sqrt(shelterDx * shelterDx + shelterDy * shelterDy);
        var pointerDx = swimmer.x - pointer.x;
        var pointerDy = swimmer.y - pointer.y;
        var pointerDistance = Math.sqrt(pointerDx * pointerDx + pointerDy * pointerDy);
        var disturbance = pointer.down && pointerDistance < 72 ? 1 - pointerDistance / 72 : 0;

        ecologyContext.stableId = i;
        ecologyContext.kind = swimmer.kind;
        ecologyContext.energy = swimmer.energy;
        ecologyContext.foodLevel = clamp((leftFood + rightFood + upFood + downFood) * 0.25, 0, 1.5);
        ecologyContext.foodDX = clamp((rightFood - leftFood) * 4, -1, 1);
        ecologyContext.foodDY = clamp((downFood - upFood) * 4, -1, 1);
        ecologyContext.threat = threat;
        ecologyContext.threatDX = threatDX;
        ecologyContext.threatDY = threatDY;
        ecologyContext.disturbance = disturbance;
        ecologyContext.storm = environment.storm;
        ecologyContext.curiosity = curiosity;
        ecologyContext.curiosityDX = curiosityDistance > 0.1 ? curiosityDx / curiosityDistance : 0;
        ecologyContext.curiosityDY = curiosityDistance > 0.1 ? curiosityDy / curiosityDistance : 0;
        ecologyContext.shelter = clamp(1 - shelterDistance / 190, 0, 1);
        ecologyContext.shelterDX = shelterDistance > 0.1 ? shelterDx / shelterDistance : 0;
        ecologyContext.shelterDY = shelterDistance > 0.1 ? shelterDy / shelterDistance : 0;
        ecology.stepAgent(swimmer, dt, time, ecologyContext, ecologySteering);
        ecology.influenceFor(swimmer.kind, ecologyInfluence);
        desiredX += ecologySteering.steerX;
        desiredY += ecologySteering.steerY;
        maxSpeed *= ecologySteering.speedScale;
        feedingRate *= ecologySteering.feedingScale;
        behaviorFlowScale = ecologySteering.flowScale;
        behaviorSchoolingScale = ecologySteering.schoolingScale;
        behaviorSeparationScale = ecologySteering.separationScale;
        behaviorDepthOffset = ecologySteering.depthOffset;
        swimmer.behaviorState = ecologySteering.state;
        swimmer.behaviorName = ecologySteering.stateName;
        swimmer.behaviorAnimationRate = ecologySteering.animationRate;
        swimmer.behaviorGlowBoost = ecologySteering.glowBoost;
        swimmer.eventVisibilityScale = ecologyInfluence.visibilityScale;
      }

      if (swimmer.kind === "fish") {
        var schoolCount = 0;
        var schoolCenterX = 0;
        var schoolCenterY = 0;
        var schoolVelocityX = 0;
        var schoolVelocityY = 0;
        var separateX = 0;
        var separateY = 0;
        for (var schoolmateIndex = 0; schoolmateIndex < swimmers.length; schoolmateIndex += 1) {
          var schoolmate = swimmers[schoolmateIndex];
          if (
            schoolmate === swimmer ||
            schoolmate.kind !== "fish" ||
            schoolmate.school !== swimmer.school
          ) continue;
          var schoolDx = schoolmate.x - swimmer.x;
          var schoolDy = schoolmate.y - swimmer.y;
          var schoolDistance2 = schoolDx * schoolDx + schoolDy * schoolDy;
          if (schoolDistance2 > 34 * 34) continue;
          schoolCount += 1;
          schoolCenterX += schoolmate.x;
          schoolCenterY += schoolmate.y;
          schoolVelocityX += schoolmate.vx;
          schoolVelocityY += schoolmate.vy;
          if (schoolDistance2 < 7 * 7 && schoolDistance2 > 0.2) {
            separateX -= schoolDx / schoolDistance2;
            separateY -= schoolDy / schoolDistance2;
          }
        }
        if (schoolCount > 0) {
          schoolCenterX /= schoolCount;
          schoolCenterY /= schoolCount;
          schoolVelocityX /= schoolCount;
          schoolVelocityY /= schoolCount;
          desiredX += ((schoolCenterX - swimmer.x) * 0.006 +
            (schoolVelocityX - swimmer.vx) * 0.28) * behaviorSchoolingScale +
            separateX * 2.6 * behaviorSeparationScale;
          desiredY += ((schoolCenterY - swimmer.y) * 0.006 +
            (schoolVelocityY - swimmer.vy) * 0.28) * behaviorSchoolingScale +
            separateY * 2.6 * behaviorSeparationScale;
        }
      }

      var nearestPrey = null;
      var nearestPreyDistance2 = Infinity;
      for (var otherIndex = 0; otherIndex < swimmers.length; otherIndex += 1) {
        var other = swimmers[otherIndex];
        if (other === swimmer) continue;
        var otherDx = other.x - swimmer.x;
        var otherDy = other.y - swimmer.y;
        var otherDistance2 = otherDx * otherDx + otherDy * otherDy;
        if (swimmer.kind === "shark" && other.kind === "fish" && otherDistance2 < nearestPreyDistance2) {
          nearestPrey = other;
          nearestPreyDistance2 = otherDistance2;
        }
        if (swimmer.kind === "fish" && other.kind === "shark" && otherDistance2 < 78 * 78 && otherDistance2 > 1) {
          var sharkFear = (1 - Math.sqrt(otherDistance2) / 78) * 2.1;
          desiredX -= otherDx / Math.sqrt(otherDistance2) * sharkFear;
          desiredY -= otherDy / Math.sqrt(otherDistance2) * sharkFear;
        }
      }
      if (nearestPrey && nearestPreyDistance2 < 118 * 118 && nearestPreyDistance2 > 1) {
        var preyDistance = Math.sqrt(nearestPreyDistance2);
        var huntDrive = 0.34 + (1 - preyDistance / 118) * 0.48;
        desiredX += (nearestPrey.x - swimmer.x) / preyDistance * huntDrive;
        desiredY += (nearestPrey.y - swimmer.y) / preyDistance * huntDrive;
        if (preyDistance < 5 + swimmer.size * 2.5) {
          nearestPrey.energy = 0;
          swimmer.energy = clamp(swimmer.energy + 0.24, 0, 1.2);
        }
      }

      if (activeColossalWarning) {
        var warningEncounter = activeColossalWarning.encounter;
        var warningState = activeColossalWarning.state;
        var warningFrontX = warningState.x + warningEncounter.direction * warningState.scale * 25;
        var warningDx = swimmer.x - warningFrontX;
        var warningDy = swimmer.y - warningState.y;
        var warningRadius = 62 + warningState.scale * 17;
        var warningDistance2 = warningDx * warningDx + warningDy * warningDy;
        if (warningDistance2 < warningRadius * warningRadius && warningDistance2 > 1) {
          var warningDistance = Math.sqrt(warningDistance2);
          var bodyWarning = (1 - warningDistance / warningRadius) *
            (swimmer.kind === "fish" || swimmer.kind === "jelly" ? 1.45 : 0.62);
          desiredX += warningDx / warningDistance * bodyWarning;
          desiredY += warningDy / warningDistance * bodyWarning;
        }
      }

      if (!Number.isFinite(swimmer.depthTarget)) {
        swimmer.depthTarget = swimmerDepthPreference(swimmer.kind, swimmer.size, swimmer.seed);
      }
      var waterDepth = Math.max(24, height - geometry.line);
      var depthPulse = Math.sin(time * (swimmer.kind === "jelly" ? 0.38 : 0.12) + swimmer.seed * 29);
      var depthRoam = swimmer.kind === "fish" || swimmer.kind === "jelly" ? 0.055 : 0.025;
      var preferredY = geometry.line + waterDepth * clamp(
        swimmer.depthTarget + behaviorDepthOffset + depthPulse * depthRoam,
        0.1,
        0.94
      );
      var depthCorrection = clamp((preferredY - swimmer.y) * 0.014, -0.34, 0.34);
      desiredY += depthCorrection;

      for (var predator = 0; predator < actors.leviathans.length; predator += 1) {
        var predatorActor = actors.leviathans[predator];
        var predatorX = swimmer.x - predatorActor.x;
        var predatorY = swimmer.y - predatorActor.y;
        var fearRadius = 72 + predatorActor.scale * 38;
        var predatorDistance2 = predatorX * predatorX + predatorY * predatorY;
        if (predatorDistance2 < fearRadius * fearRadius && predatorDistance2 > 1) {
          var fear = (1 - Math.sqrt(predatorDistance2) / fearRadius) * 2.4;
          desiredX += predatorX / Math.sqrt(predatorDistance2) * fear;
          desiredY += predatorY / Math.sqrt(predatorDistance2) * fear;
        }
      }

      swimmer.vx += (flow.x * 0.48 * behaviorFlowScale + desiredX - swimmer.vx) * dt * 1.7;
      swimmer.vy += (flow.y * 0.48 * behaviorFlowScale + desiredY - swimmer.vy) * dt * 1.7;
      var speed = Math.sqrt(swimmer.vx * swimmer.vx + swimmer.vy * swimmer.vy);
      if (speed > maxSpeed) {
        swimmer.vx *= maxSpeed / speed;
        swimmer.vy *= maxSpeed / speed;
      }
      var nextX = swimmer.x + swimmer.vx * dt * movementScale;
      var nextY = swimmer.y + swimmer.vy * dt * movementScale;
      moveSwimmerAroundStructure(swimmer, nextX, nextY, geometry);
      swimmer.direction = swimmer.vx >= 0 ? 1 : -1;
      var eaten = consumePlankton(swimmer.x, swimmer.y, dt * feedingRate);
      swimmer.energy = clamp(swimmer.energy + eaten * 1.9 - dt * 0.0035, 0, 1.2);

      var localSurface = surfaceY(swimmer.x, time, geometry.line, raft.x);
      if (screenToWorldX(swimmer.x) > activeWorldRight()) swimmer.x = worldToScreenX(activeWorldLeft());
      if (screenToWorldX(swimmer.x) < activeWorldLeft()) swimmer.x = worldToScreenX(activeWorldRight());
      if (swimmer.y < localSurface + 8) {
        swimmer.y = localSurface + 8;
        swimmer.vy = Math.abs(swimmer.vy);
      }
      if (swimmer.y > height - 5 || swimmer.energy <= 0.005) {
        swimmer.x = hash(swimmer.seed * 41 + time) * width;
        swimmer.y = geometry.line + waterDepth * clamp(
          swimmer.depthTarget + (hash(swimmer.seed * 67 + time) - 0.5) * 0.08,
          0.1,
          0.94
        );
        swimmer.energy = 0.45;
        ejectSwimmerFromStructure(swimmer, geometry);
      }
      updateSwimmerTentacles(swimmer, dt, time);
    }
  }

  function respawnParticle(particle, geometry) {
    var now = performance.now();
    placeParticle(particle, Math.floor(particle.seed * 10000), geometry, now);
  }

  function updateParticles(dt, time, geometry, actors) {
    var blend = 1 - Math.exp(-dt * 2.1);
    for (var i = 0; i < particles.length; i += 1) {
      var particle = particles[i];
      var flow = flowAt(particle.x, particle.y, time);
      var targetX = flow.x;
      var targetY = flow.y;

      if (particle.kind === "bubble") {
        targetX *= 0.55;
        targetY -= 0.72 + particle.seed * 0.42;
      } else if (particle.kind === "silt") {
        targetX *= 0.32;
        targetY += 0.11;
      }

      particle.vx += (targetX - particle.vx) * blend;
      particle.vy += (targetY - particle.vy) * blend;

      var nextX = particle.x + particle.vx * dt;
      var nextY = particle.y + particle.vy * dt;
      if (isSolid(nextX, nextY, geometry)) {
        if (
          particle.kind === "silt" &&
          nextY >= geometry.foundationTop - 5 &&
          nextX >= geometry.left - 6 &&
          nextX <= geometry.right
        ) {
          depositSediment(nextX, 0.055);
          respawnParticle(particle, geometry);
          continue;
        }
        var canSlideY = !isSolid(particle.x, nextY, geometry);
        var canSlideX = !isSolid(nextX, particle.y, geometry);
        if (canSlideY) {
          nextX = particle.x;
          particle.vx *= -0.28;
        } else if (canSlideX) {
          nextY = particle.y;
          particle.vy *= -0.28;
        } else {
          nextX = particle.x;
          nextY = particle.y;
          particle.vx *= -0.35;
          particle.vy *= -0.35;
        }
        if (particle.kind === "silt") particle.vy -= 0.3;
      }

      particle.x = nextX;
      particle.y = nextY;

      var localSurface = surfaceY(particle.x, time, geometry.line, actors.raftX);
      if (particle.kind === "bubble" && particle.y <= localSurface + 2) {
        if (ripples.length < 18 && particle.seed > 0.68) {
          ripples.push({ x: particle.x, age: 0, amp: 0.55 + particle.seed * 0.55 });
          disturbSurface(particle.x, -0.34 - particle.seed * 0.24, 7);
        }
        placeParticle(particle, i, geometry, time * 1000);
      } else if (particle.y <= localSurface + 2) {
        particle.y = localSurface + 3;
        particle.vy = Math.abs(particle.vy) * 0.2;
      }

      if (screenToWorldX(particle.x) > activeWorldRight()) particle.x = worldToScreenX(activeWorldLeft());
      if (screenToWorldX(particle.x) < activeWorldLeft()) particle.x = worldToScreenX(activeWorldRight());
      if (particle.y > height + 2) respawnParticle(particle, geometry);
    }

    for (var r = ripples.length - 1; r >= 0; r -= 1) {
      ripples[r].age += dt;
      if (ripples[r].age > 4) ripples.splice(r, 1);
    }
  }

  function drawPlanet(time, palette) {
    var planet = planetPosition(time);
    var radius = planet.radius;
    var cx = planet.x;
    var cy = planet.y;
    drawPixelDisc(cx, cy, radius, palette.planetDark);
    drawPixelDisc(cx - 4, cy - 4, radius - 7, palette.planet);
    for (var i = 0; i < 24; i += 1) {
      var angle = hash(i * 7.2) * Math.PI * 2;
      var dist = Math.sqrt(hash(i * 9.7 + 4)) * (radius - 18);
      var spot = 2 + Math.floor(hash(i * 4.3) * 8);
      drawPixelDisc(
        cx + Math.cos(angle) * dist,
        cy + Math.sin(angle) * dist,
        spot,
        i % 3 === 0 ? palette.planetLight : palette.planetDark
      );
    }
  }

  function drawPerson(x, y, phase, color, direction, role) {
    var action = arguments.length > 6 ? arguments[6] : "walk";
    var step = action === "walk" && Math.sin(phase) > 0 ? 1 : action === "walk" ? -1 : 0;
    var facing = direction || 1;
    var armLift = Math.sin(phase + Math.PI * 0.5) > 0 ? 0 : 1;
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y - 6), 2, 2);
    if (role === "guard") ctx.fillRect(Math.floor(x - 1), Math.floor(y - 7), 4, 1);
    ctx.fillRect(Math.floor(x), Math.floor(y - 4), 2, 3);
    if (action === "flashlight") {
      ctx.fillRect(Math.floor(x + (facing > 0 ? 2 : -2)), Math.floor(y - 4), 3, 1);
      ctx.fillRect(Math.floor(x + (facing > 0 ? -1 : 2)), Math.floor(y - 3), 1, 2);
    } else if (action === "wave") {
      ctx.fillRect(Math.floor(x + (facing > 0 ? 2 : -1)), Math.floor(y - 6), 1, 3);
      ctx.fillRect(Math.floor(x + (facing > 0 ? -1 : 2)), Math.floor(y - 3), 1, 2);
    } else if (action === "watch") {
      ctx.fillRect(Math.floor(x - 1), Math.floor(y - 3), 1, 2);
      ctx.fillRect(Math.floor(x + 2), Math.floor(y - 3), 1, 2);
    } else {
      ctx.fillRect(Math.floor(x - 1), Math.floor(y - 4 + armLift), 1, 2);
      ctx.fillRect(Math.floor(x + 2), Math.floor(y - 4 + (1 - armLift)), 1, 2);
    }
    ctx.fillRect(Math.floor(x - step), Math.floor(y - 1), 1, 3);
    ctx.fillRect(Math.floor(x + 1 + step), Math.floor(y - 1), 1, 3);
    if (role === "worker") ctx.fillRect(Math.floor(x), Math.floor(y - 7), 2, 1);
    if (role === "guest") ctx.fillRect(Math.floor(x + (facing > 0 ? 2 : -1)), Math.floor(y - 3), 1, 1);
    ctx.fillStyle = "#11111d";
    ctx.fillRect(Math.floor(x + (facing > 0 ? 1 : 0)), Math.floor(y - 5), 1, 1);
  }

  function platformResidentCount() {
    return visualDensity() < 0.48 ? 1 : 2;
  }

  function platformResidentPose(index, time, geometry, out) {
    var pose = out || {};
    var span = geometry.right - geometry.left;
    var activity = Math.max(0.25, tuning.platformActivity);
    var cycle = (time * 0.34 * activity + index * 11.7) % 30;
    pose.role = index === 0 ? "guard" : "worker";
    pose.deck = geometry.deck - 2;
    pose.phase = time * 0.75 * activity + index * 2.3;
    if (index === 0) {
      pose.direction = -1;
      pose.x = geometry.left + Math.min(17, span * 0.13);
      pose.action = cycle < 11 ? "watch" : cycle < 18 ? "flashlight" : "walk";
      if (pose.action === "walk") {
        pose.x += (Math.sin((cycle - 18) / 12 * Math.PI * 2) + 1) * Math.min(5, span * 0.035);
        pose.direction = Math.cos((cycle - 18) / 12 * Math.PI * 2) > 0 ? 1 : -1;
      }
    } else {
      pose.x = geometry.left + span * 0.55 + Math.sin(time * 0.18 * activity + 1.4) * Math.min(10, span * 0.06);
      pose.direction = Math.cos(time * 0.18 * activity + 1.4) >= 0 ? 1 : -1;
      pose.action = cycle < 12 ? "walk" : cycle < 22 ? "watch" : "wave";
      if (structure.integrity < 0.985 && cycle >= 12) {
        pose.action = "work";
        pose.x = geometry.left + span * 0.58;
        pose.direction = -1;
      }
    }
    return pose;
  }

  function drawResidentFlashlight(pose, palette, geometry, time) {
    if (pose.action !== "flashlight") return;
    var facing = pose.direction || -1;
    var sourceX = pose.x + facing * 4;
    var sourceY = pose.deck - 4;
    var reach = Math.min(58, Math.max(28, geometry.line - sourceY + 24));
    ctx.save();
    ctx.globalAlpha = 0.28;
    for (var beamStep = 0; beamStep <= reach; beamStep += 3) {
      var beamX = sourceX + facing * beamStep * 0.54;
      var beamY = sourceY + beamStep;
      if (hash(beamStep * 9.7 + Math.floor(time * 2)) > 0.24) pixelRect(beamX, beamY, 1, 1, palette.foam);
      if (beamStep > reach * 0.45 && beamStep % 6 === 0) {
        pixelRect(beamX + facing * 2, beamY, 1, 1, palette.bubble);
      }
    }
    ctx.globalAlpha = 0.52;
    pixelRect(sourceX, sourceY, 2, 1, palette.lamp);
    ctx.restore();
  }

  function drawSky(time, palette, line) {
    pixelRect(0, 0, width, line - 18, palette.sky);
    pixelRect(0, line - 18, width, 18, palette.skyLow);
    for (var band = line - 24; band < line - 10; band += 4) {
      var bandOffset = Math.floor(screenToWorldX(0) / 11) % 2;
      for (var bandX = -11; bandX < width + 11; bandX += 11) {
        if ((Math.floor(band / 4) + Math.floor(bandX / 11) + bandOffset) % 2 === 0) {
          pixelRect(bandX, band, 7, 2, palette.skyLow);
        }
      }
    }

    var starCell = 2.35;
    var firstStar = Math.floor(cameraX / starCell) - 1;
    var lastStar = Math.ceil((cameraX + width) / starCell) + 1;
    for (var i = firstStar; i <= lastStar; i += 1) {
      var starWorldX = i * starCell + hash(i * 2.7) * starCell;
      var x = Math.floor(worldToScreenX(starWorldX));
      var y = Math.floor(hash(i * 5.9 + 17) * 112);
      if (y >= line) continue;
      var twinkle = hash(i * 7 + Math.floor(time * 0.8));
      ctx.fillStyle = twinkle > 0.9 ? palette.foam : palette.star;
      ctx.fillRect(x, y, 1, 1);
    }
    drawPlanet(time, palette);
  }

  function drawWater(time, palette, line, raftX) {
    if (!waterTexture) buildWaterTexture(palette, line);
    ctx.drawImage(waterTexture, 0, 0);

    for (var x = 0; x < width; x += 1) {
      var top = Math.floor(surfaceY(x, time, line, raftX));
      var transitionBottom = line + 4;
      for (var fillY = top; fillY < transitionBottom; fillY += 1) {
        pixelRect(x, fillY, 1, 1, palette.waterTop);
      }
    }

    ctx.globalAlpha = 0.28;
    for (var y = line + 14; y < height; y += 22) {
      var offset = Math.floor((time * 0.18 + y * 0.73) % 28);
      for (var sx = -offset; sx < width; sx += 28) {
        var bend = Math.floor(Math.sin(sx * 0.03 + y * 0.025 - time * 0.12) * 3);
        drawPixelMask(
          sx + bend,
          y,
          ["1  1  1", "  1    "],
          { "1": y < line + 90 ? palette.waterTop : palette.water },
          (sx / 28) % 2 === 0
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  function createMooring(geometry) {
    var count = 14;
    var anchorX = geometry.left - 3;
    var anchorY = geometry.foundationTop + 8;
    mooring.buoyX = geometry.left - 48;
    mooring.buoyY = surfaceY(mooring.buoyX, 0, geometry.line, raft.x) - 2;
    mooring.buoyVX = 0;
    mooring.buoyVY = 0;
    mooring.points = [];
    mooring.previous = [];
    for (var i = 0; i < count; i += 1) {
      var amount = i / (count - 1);
      var point = {
        x: lerp(anchorX, mooring.buoyX, amount),
        y: lerp(anchorY, mooring.buoyY, amount) + Math.sin(amount * Math.PI) * 8
      };
      mooring.points.push(point);
      mooring.previous.push({ x: point.x, y: point.y });
    }
    mooring.segmentLength = Math.sqrt(
      Math.pow(anchorX - mooring.buoyX, 2) + Math.pow(anchorY - mooring.buoyY, 2)
    ) / (count - 1) * 1.12;
    mooring.initialized = true;
  }

  function updateStructure(dt, geometry) {
    var currentForce = 0;
    for (var i = 0; i < geometry.pylons.length; i += 2) {
      currentForce += sampleFluid(geometry.pylons[i], geometry.line + 38).x - 0.25;
    }
    currentForce /= Math.max(1, Math.ceil(geometry.pylons.length / 2));
    var waveDifference = sampleSurface(geometry.left) - sampleSurface(Math.min(width - 1, geometry.right - 5));
    var windLoad = environment.wind * environment.storm * 0.72;
    var force = currentForce * 0.8 + waveDifference * 0.025 + windLoad;
    structure.swayVelocity += (force - structure.sway * 0.92 - structure.swayVelocity * 1.7) * dt;
    structure.sway = clamp(structure.sway + structure.swayVelocity * dt, -3.2, 3.2);

    var occupancyLoad = 0.22 + Math.sin(performance.now() * 0.00007) * 0.03;
    var targetSag = 0.35 + occupancyLoad + environment.storm * 0.8 + (1 - structure.integrity) * 1.8;
    structure.sagVelocity += (targetSag - structure.sag) * dt * 1.2 - structure.sagVelocity * dt * 1.6;
    structure.sag = clamp(structure.sag + structure.sagVelocity * dt, 0, 2.8);
    structure.stress = clamp(
      Math.abs(structure.sway) / 3.2 + environment.storm * 0.42 + Math.abs(structure.sagVelocity) * 0.3,
      0,
      1.4
    );
    if (structure.stress > 0.82) {
      structure.integrity = Math.max(0.72, structure.integrity - (structure.stress - 0.82) * dt * 0.0008);
    } else if (environment.storm < 0.3) {
      structure.integrity = Math.min(1, structure.integrity + dt * 0.00022);
    }
  }

  function updateMooring(dt, time, geometry) {
    if (!mooring.initialized || mooring.points.length < 2) createMooring(geometry);
    var anchorX = geometry.left - 3;
    var anchorY = geometry.foundationTop + 8;
    var buoySurface = surfaceY(mooring.buoyX, time, geometry.line, raft.x) - 2;
    var buoyFlow = sampleFluid(mooring.buoyX, geometry.line + 6);
    mooring.buoyVX += (buoyFlow.x * 0.9 + environment.wind * 0.08 - mooring.buoyVX) * dt * 0.9;
    mooring.buoyVY += ((buoySurface - mooring.buoyY) * 5 - mooring.buoyVY * 3.1) * dt;
    mooring.buoyX += mooring.buoyVX * dt;
    mooring.buoyY += mooring.buoyVY * dt;

    var maxReach = mooring.segmentLength * (mooring.points.length - 1) * 0.96;
    var ropeDX = mooring.buoyX - anchorX;
    var ropeDY = mooring.buoyY - anchorY;
    var ropeDistance = Math.sqrt(ropeDX * ropeDX + ropeDY * ropeDY);
    if (ropeDistance > maxReach) {
      var tension = ropeDistance - maxReach;
      mooring.buoyVX -= ropeDX / ropeDistance * tension * dt * 3.5;
      mooring.buoyVY -= ropeDY / ropeDistance * tension * dt * 3.5;
    }

    for (var i = 1; i < mooring.points.length - 1; i += 1) {
      var point = mooring.points[i];
      var previous = mooring.previous[i];
      var velocityX = (point.x - previous.x) * 0.992;
      var velocityY = (point.y - previous.y) * 0.992;
      previous.x = point.x;
      previous.y = point.y;
      var flow = sampleFluid(point.x, point.y);
      point.x += velocityX + flow.x * dt * 0.18;
      point.y += velocityY + (0.08 + flow.y * 0.1) * dt;
    }

    for (var iteration = 0; iteration < 6; iteration += 1) {
      mooring.points[0].x = anchorX;
      mooring.points[0].y = anchorY;
      var last = mooring.points.length - 1;
      mooring.points[last].x = mooring.buoyX;
      mooring.points[last].y = mooring.buoyY;
      for (var segment = 0; segment < last; segment += 1) {
        var a = mooring.points[segment];
        var b = mooring.points[segment + 1];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var distance = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
        var correction = (distance - mooring.segmentLength) / distance * 0.5;
        if (segment > 0) {
          a.x += dx * correction;
          a.y += dy * correction;
        }
        if (segment + 1 < last) {
          b.x -= dx * correction;
          b.y -= dy * correction;
        }
      }
    }
  }

  function drawMooringUnder(palette) {
    if (!mooring.initialized) return;
    for (var i = 1; i < mooring.points.length; i += 1) {
      pixelLine(
        mooring.points[i - 1].x,
        mooring.points[i - 1].y,
        mooring.points[i].x,
        mooring.points[i].y,
        palette.steel,
        1
      );
    }
    drawPixelMask(
      mooring.buoyX - 3,
      mooring.buoyY,
      [" 11111 ", "  222  ", "   2   "],
      { "1": palette.planetLight, "2": palette.steelDark },
      false
    );
  }

  function drawMooringAbove(palette) {
    if (!mooring.initialized) return;
    drawPixelMask(
      mooring.buoyX - 3,
      mooring.buoyY - 3,
      ["   1   ", " 12221 ", "11   11"],
      { "1": palette.planetLight, "2": palette.steelDark },
      false
    );
    pixelLine(mooring.buoyX, mooring.buoyY - 3, mooring.buoyX, mooring.buoyY - 7, palette.steelDark, 1);
    pixelRect(mooring.buoyX, mooring.buoyY - 8, 1, 1, palette.lamp);
  }

  function drawSubstructure(time, palette, geometry) {
    var foundationWidth = geometry.right - geometry.left + 7;

    for (var i = 0; i < geometry.pylons.length; i += 1) {
      var x = Math.floor(geometry.pylons[i]);
      var topX = x + structure.sway;
      var topY = geometry.line - 1 + structure.sag;
      pixelLine(topX, topY, x, geometry.foundationTop + 4, palette.steelDark, 6);
      pixelLine(topX - 1, topY, x - 1, geometry.foundationTop + 4, palette.steel, 2);
      for (var y = geometry.line + 10; y < geometry.foundationTop; y += 12) {
        var rungAmount = (y - geometry.line) / Math.max(1, geometry.foundationTop - geometry.line);
        var rungX = lerp(topX, x, rungAmount);
        pixelRect(rungX - 2, y, 6, 1, palette.timberLight);
      }
    }

    panelBlock(
      geometry.left - 5,
      geometry.foundationTop,
      foundationWidth,
      25,
      palette.steel,
      palette.timberLight,
      palette.steelDark,
      81
    );
    moduleSpan(
      geometry.left - 2,
      geometry.foundationTop + 3,
      foundationWidth - 5,
      4,
      palette.steel,
      palette.timberLight,
      palette.steelDark,
      91,
      11
    );

    for (var tank = geometry.left + 8; tank < geometry.right - 8; tank += 18) {
      drawPixelDisc(tank, geometry.foundationTop + 13, 6, palette.steel);
      drawPixelDisc(tank - 1, geometry.foundationTop + 12, 4, palette.steelDark);
    }

    if (deposits) {
      ctx.fillStyle = palette.timberLight;
      ctx.globalAlpha = 0.72;
      var depositStart = Math.max(0, Math.floor((geometry.left - 5) / 2));
      var depositEnd = Math.min(deposits.length - 1, Math.ceil(geometry.right / 2));
      for (var deposit = depositStart; deposit <= depositEnd; deposit += 1) {
        var mound = Math.floor(deposits[deposit]);
        if (mound > 0) ctx.fillRect(deposit * 2, geometry.foundationTop - mound, 2, mound);
      }
      ctx.globalAlpha = 1;
    }

    var keelTop = geometry.foundationTop + 25;
    moduleSpan(
      geometry.left + 8, keelTop, foundationWidth - 22, 10,
      palette.steel, palette.timberLight, palette.steelDark, 121, 13
    );
    moduleSpan(
      geometry.left + 21, keelTop + 10, foundationWidth - 47, 7,
      palette.steel, palette.timberLight, palette.steelDark, 131, 11
    );
    moduleSpan(
      geometry.left + 38, keelTop + 17, foundationWidth - 80, 6,
      palette.steel, palette.timberLight, palette.steelDark, 141, 9
    );

    ctx.globalAlpha = 0.4;
    for (var j = 0; j < geometry.pylons.length; j += 3) {
      var bubbleTravel = Math.max(18, geometry.foundationTop - geometry.line - 5);
      for (var postBubble = 0; postBubble < 3; postBubble += 1) {
        var bubbleAge = (time * (0.055 + postBubble * 0.009) + j * 0.173 + postBubble * 0.337) % 1;
        var py = geometry.foundationTop - 3 - bubbleAge * bubbleTravel;
        var bubbleDrift = Math.sin(bubbleAge * Math.PI * 3 + j) * (1 + postBubble * 0.45);
        pixelRect(geometry.pylons[j] + 5 + bubbleDrift, py, 1, 1, palette.bubble);
      }
    }
    ctx.globalAlpha = 1;
  }

  function updateLeviathans(dt, time, geometry) {
    for (var i = 0; i < leviathans.length; i += 1) {
      var leviathan = leviathans[i];
      if (!leviathan.y) {
        leviathan.y = geometry.line + (height - geometry.line) * leviathan.depth;
      }
      var sense = 48 * leviathan.scale;
      var foodLeft = sampleFluid(leviathan.x - sense, leviathan.y).plankton;
      var foodRight = sampleFluid(leviathan.x + sense, leviathan.y).plankton;
      var foodUp = sampleFluid(leviathan.x, leviathan.y - sense).plankton;
      var foodDown = sampleFluid(leviathan.x, leviathan.y + sense).plankton;
      var localFlow = sampleFluid(leviathan.x, leviathan.y);
      var preferredDepthY = geometry.line + (height - geometry.line) * leviathan.depth;
      var targetVX = leviathan.direction * (0.12 + 0.045 / leviathan.scale) +
        localFlow.x * 0.1 + (foodRight - foodLeft) * 0.045;
      var targetVY = (foodDown - foodUp) * 0.065 +
        Math.sin(time * 0.075 + leviathan.phase) * 0.032 + localFlow.y * 0.07 +
        clamp((preferredDepthY - leviathan.y) * 0.004, -0.12, 0.12);
      leviathan.vx += (targetVX - leviathan.vx) * dt * 0.18;
      leviathan.vy += (targetVY - leviathan.vy) * dt * 0.23;
      leviathan.x += leviathan.vx * dt;
      leviathan.y += leviathan.vy * dt;
      leviathan.y = clamp(
        leviathan.y,
        geometry.line + Math.max(29, (height - geometry.line) * 0.27),
        height - 20
      );
      consumePlankton(leviathan.x + leviathan.direction * 35 * leviathan.scale, leviathan.y, dt * 0.008 * leviathan.scale);
      var worldX = screenToWorldX(leviathan.x);
      if (leviathan.direction > 0 && worldX > activeWorldRight() + 155) {
        leviathan.x = worldToScreenX(activeWorldLeft() - 155);
      } else if (leviathan.direction < 0 && worldX < activeWorldLeft() - 155) {
        leviathan.x = worldToScreenX(activeWorldRight() + 155);
      }
    }
  }

  function drawLeviathanActor(time, palette, leviathan, index, inspectionOnly) {
    var x = leviathan.x;
    var y = leviathan.y;
    var scale = leviathan.scale;
    var direction = leviathan.direction;
    var traits = leviathan.variation;
    var lengthVariation = traits ? clamp(traits.bodyLength / Math.max(1, 69 * scale), 0.78, 1.24) : 1;
    var heightVariation = traits ? clamp(traits.bodyHeight / Math.max(1, 19 * scale), 0.76, 1.3) : 1;
    var anatomicalHalfLength = 34 * lengthVariation;
    var anatomicalHalfHeight = 9 * heightVariation;
    if (!inspectionOnly) {
      var glowCount = traits ? Math.round(38 + traits.glowDensity * 38) : 54;
      for (var glowPoint = 0; glowPoint < glowCount; glowPoint += 1) {
        var glowSeed = index * 701.3 + glowPoint * 23.7;
        var glowAngle = hash(glowSeed) * Math.PI * 2;
        var glowRadius = (26 + hash(glowSeed + 4.3) * 36) * scale;
        var glowX = x + Math.cos(glowAngle) * glowRadius * 1.28;
        var glowY = y + Math.sin(glowAngle) * glowRadius * 0.42;
        var glowPulse = (Math.sin(time * 0.34 + glowPoint * 0.71 + leviathan.phase) + 1) * 0.5;
        ctx.globalAlpha = (0.12 + glowPulse * 0.2) * (traits ? traits.glowStrength : 1);
        pixelRect(glowX, glowY, 1, 1, glowPoint % 4 === 0 ? palette.plankton : palette.bubble);
        if (glowPoint % 6 === 0) pixelRect(glowX + direction, glowY + (glowPoint % 12 === 0 ? 1 : -1), 1, 1, palette.bubble);
      }
      ctx.globalAlpha = 0.11;
      drawPixelDisc(x + direction * 48 * scale, y - 9 * scale, Math.max(2, Math.round(6 * scale)), palette.bubble);
    }
    ctx.globalAlpha = inspectionOnly ? 1 : 0.68;
    for (var bodyX = -Math.ceil(anatomicalHalfLength); bodyX <= Math.ceil(anatomicalHalfLength); bodyX += 1) {
      var anatomicalX = bodyX * direction / anatomicalHalfLength;
      var bodyEnvelope = Math.sqrt(Math.max(0, 1 - anatomicalX * anatomicalX));
      var rearTaper = anatomicalX < -0.35
        ? lerp(0.35, 1, clamp((anatomicalX + 1) / 0.65, 0, 1))
        : 1;
      var headMass = anatomicalX > 0.35
        ? 1 + Math.sin(clamp((anatomicalX - 0.35) / 0.65, 0, 1) * Math.PI) * 0.18
        : 1;
      var segmentNotch = traits
        ? 1 - Math.max(0, Math.cos((anatomicalX + 1) * Math.PI * traits.segmentCount)) * 0.045
        : 1;
      var halfHeight = Math.max(0, Math.floor(anatomicalHalfHeight * bodyEnvelope * rearTaper * headMass * segmentNotch));
      var bodyCenterY = Math.round(-bodyEnvelope * (0.7 + anatomicalX * 0.35));
      for (var bodyY = -halfHeight; bodyY <= halfHeight; bodyY += 1) {
        var edge = halfHeight - Math.abs(bodyY);
        var bodySeed = index * 911 + bodyX * 17.3 + bodyY * 31.7;
        if (!inspectionOnly && edge < 2 && hash(bodySeed) < 0.25) continue;
        var bodyColor = hash(bodySeed + 4.1) > 0.91
          ? palette.steelDark
          : hash(bodySeed + 7.7) > 0.965
            ? palette.waterDeep
            : palette.creature;
        var maskPixelSize = inspectionOnly ? Math.max(1, Math.ceil(scale)) : 1;
        pixelRect(
          x + bodyX * scale,
          y + (bodyCenterY + bodyY) * scale,
          maskPixelSize,
          maskPixelSize,
          bodyColor
        );
      }
    }
    var seamCount = traits ? clamp(traits.segmentCount - 2, 2, 6) : 3;
    for (var bodySeam = 0; bodySeam < seamCount; bodySeam += 1) {
      var seamX = x + direction * lerp(-anatomicalHalfLength * 0.45, anatomicalHalfLength * 0.48, bodySeam / Math.max(1, seamCount - 1)) * scale;
      pixelLine(seamX, y - (5 + bodySeam) * scale, seamX - direction * scale, y + (5 + bodySeam) * scale, palette.steelDark, 1);
    }
    var tentacleCount = traits ? traits.tentacleCount : 4;
    for (var tentacle = 0; tentacle < tentacleCount; tentacle += 1) {
      var tentacleBaseY = y + (tentacle - (tentacleCount - 1) * 0.5) * 3.2 * scale;
      var tentacleLength = (traits ? traits.tentacleLength * 0.72 / Math.max(0.1, scale) : 17 + (tentacle % 2) * 6) * scale;
      for (var step = 0; step < tentacleLength; step += 2) {
        var tentacleX = x - direction * (anatomicalHalfLength * 0.91 * scale + step);
        var tentacleY = tentacleBaseY + Math.sin(time * 0.18 + leviathan.phase + tentacle + step * 0.14) * (2 + tentacle % 2);
        pixelRect(tentacleX, tentacleY, 1, 1, palette.creature);
        if (step % 8 === 0) pixelRect(tentacleX - direction, tentacleY + (tentacle % 2 ? 1 : -1), 1, 1, palette.steelDark);
      }
    }
    var tailRootX = x - direction * anatomicalHalfLength * 0.88 * scale;
    pixelLine(tailRootX, y, tailRootX - direction * 14 * scale, y - 10 * scale + Math.sin(time * 0.16 + leviathan.phase) * 2, palette.creature, Math.max(1, Math.round(scale * 2)));
    pixelLine(tailRootX, y, tailRootX - direction * 14 * scale, y + 10 * scale + Math.sin(time * 0.16 + leviathan.phase + 2.1) * 2, palette.creature, Math.max(1, Math.round(scale * 2)));
    pixelLine(x - direction * 2 * scale, y - 7 * scale, x - direction * 9 * scale, y - 15 * scale, palette.creature, Math.max(1, Math.round(scale * 1.5)));
    var faceX = x + direction * anatomicalHalfLength * 0.91 * scale;
    pixelLine(faceX, y - 4 * scale, faceX + direction * 16 * scale, y - 10 * scale, palette.creature, 1);
    pixelLine(faceX, y + 4 * scale, faceX + direction * 18 * scale, y + 9 * scale, palette.creature, 1);
    ctx.globalAlpha = inspectionOnly ? 1 : traits ? 0.5 + traits.glowStrength * 0.28 : 0.88;
    pixelRect(faceX + direction * 17 * scale, y - 10 * scale, 2, 2, palette.lamp);
    pixelRect(faceX + direction * 19 * scale, y + 9 * scale, 1, 1, palette.plankton);
    pixelRect(faceX + direction * 5 * scale, y, 3, 2, palette.abyss);
    ctx.globalAlpha = 1;
  }

  function drawLeviathans(time, palette, inspectionOnly) {
    for (var i = 0; i < leviathans.length; i += 1) {
      drawLeviathanActor(time, palette, leviathans[i], i, inspectionOnly);
    }
  }

  function backgroundTitanState(time, line, encounter) {
    var local = (time - encounter.start) % encounter.cycle;
    if (local < 0) local += encounter.cycle;
    if (backgroundTitanPreview && backgroundTitanPreview === encounter.type) local = encounter.duration * 0.5;
    if (local > encounter.duration) return null;
    var progress = local / encounter.duration;
    var radiusX = encounter.type === "veilback" ? Math.max(245, width * 0.72) : Math.max(290, width * 0.86);
    var radiusY = encounter.type === "veilback" ? 92 : 76;
    var margin = radiusX * 0.88;
    var x = encounter.direction > 0
      ? -margin + progress * (width + margin * 2)
      : width + margin - progress * (width + margin * 2);
    var y = line + encounter.worldDepth + Math.sin(time * 0.018 + encounter.phase) * 2;
    return { x: x, y: y, radiusX: radiusX, radiusY: radiusY, progress: progress };
  }

  function activeBackgroundTitan(time, line) {
    for (var titanIndex = 0; titanIndex < backgroundTitans.length; titanIndex += 1) {
      var encounter = backgroundTitans[titanIndex];
      var state = backgroundTitanState(time, line, encounter);
      if (state) return { encounter: encounter, state: state, index: titanIndex };
    }
    return null;
  }

  function drawBackgroundTitans(time, palette, line) {
    var active = activeBackgroundTitan(time, line);
    if (!active) return;
    var encounter = active.encounter;
    var state = active.state;
    var x = state.x;
    var y = state.y;
    var radiusX = state.radiusX;
    var radiusY = state.radiusY;
    ctx.save();
    ctx.globalAlpha = encounter.type === "veilback" ? 0.075 : 0.09;
    ctx.fillStyle = palette.abyss;
    for (var bodyX = -Math.round(radiusX); bodyX <= Math.round(radiusX); bodyX += 1) {
      var u = bodyX / radiusX;
      var envelope;
      if (encounter.type === "veilback") {
        envelope = Math.pow(Math.max(0, 1 - Math.abs(u)), 0.42);
        envelope *= 0.52 + Math.sin((u + 1) * Math.PI) * 0.48;
      } else {
        envelope = Math.sqrt(Math.max(0, 1 - u * u));
        envelope *= 0.74 + Math.exp(-Math.pow((u - 0.28) * 2.2, 2)) * 0.26;
      }
      var slowEdge = Math.sin(time * 0.027 + encounter.phase + u * 5.2) * 2.2 * envelope;
      var halfHeight = Math.max(0, Math.round(radiusY * envelope));
      var center = y - Math.round(radiusY * 0.12 * envelope) + slowEdge;
      ctx.fillRect(Math.round(x + bodyX), Math.round(center - halfHeight), 1, Math.max(1, halfHeight * 2));
    }
    ctx.globalAlpha = 0.1;
    var seamCount = encounter.type === "veilback" ? 5 : 8;
    for (var seam = 1; seam < seamCount; seam += 1) {
      var seamAmount = seam / seamCount;
      var seamX = x - radiusX * 0.62 + radiusX * 1.24 * seamAmount;
      var seamHeight = radiusY * (0.34 + Math.sin(seamAmount * Math.PI) * 0.46);
      pixelLine(seamX, y - seamHeight, seamX + Math.sin(time * 0.02 + seam) * 3, y + seamHeight, palette.waterDeep, 2);
    }
    ctx.globalAlpha = 0.09;
    for (var glint = 0; glint < 26; glint += 1) {
      var glintX = x + (hash(active.index * 701 + glint * 31.7) - 0.5) * radiusX * 1.35;
      var glintY = y + (hash(active.index * 919 + glint * 17.1) - 0.5) * radiusY * 0.9;
      pixelRect(glintX, glintY, 1, 1, glint % 7 === 0 ? palette.bubble : palette.steelDark);
    }
    ctx.restore();
  }

  function colossalState(time, line, encounter) {
    var local = (time - encounter.start) % encounter.cycle;
    if (local < 0) local += encounter.cycle;
    if (local > encounter.duration) return null;
    var progress = local / encounter.duration;
    var scale = encounter.scale * (0.97 + Math.sin(time * 0.045 + encounter.phase) * 0.03);
    var margin = 28 + scale * 22;
    var travel = width + margin * 2;
    var x = encounter.direction > 0
      ? -margin + progress * travel
      : width + margin - progress * travel;
    var y = line + encounter.worldDepth + Math.sin(time * 0.055 + encounter.phase) * 2.4;
    return { x: x, y: y, scale: scale, dive: 0, progress: progress };
  }

  function activeColossalEncounter(time, line) {
    for (var encounterIndex = 0; encounterIndex < colossalEncounters.length; encounterIndex += 1) {
      var encounter = colossalEncounters[encounterIndex];
      var state = colossalState(time, line, encounter);
      if (state) return { encounter: encounter, state: state, index: encounterIndex };
    }
    return null;
  }

  function colossalTendrilAnchor(state, encounter, tendrilIndex, tendrilCount) {
    var radiusX = 22 * state.scale;
    var radiusY = 7.5 * state.scale;
    var spread = tendrilCount <= 1 ? 0.5 : tendrilIndex / (tendrilCount - 1);
    return {
      x: state.x + encounter.direction * radiusX * (0.2 + spread * 0.42),
      y: state.y + radiusY * (0.66 + Math.sin(spread * Math.PI) * 0.08)
    };
  }

  function initializeColossalTendrils(encounter, state, encounterIndex) {
    var count = 9;
    encounter.tendrils = [];
    for (var tendril = 0; tendril < count; tendril += 1) {
      var anchor = colossalTendrilAnchor(state, encounter, tendril, count);
      var pointCount = 10 + (tendril % 4) * 2;
      var segmentLength = state.scale * (0.43 + (tendril % 3) * 0.045);
      var chain = {
        points: [],
        previous: [],
        segmentLength: segmentLength,
        phase: encounterIndex * 2.7 + tendril * 1.31
      };
      for (var point = 0; point < pointCount; point += 1) {
        var amount = point / Math.max(1, pointCount - 1);
        var px = anchor.x - encounter.direction * amount * state.scale * (2.4 + tendril * 0.08);
        var py = anchor.y + point * segmentLength * 0.9;
        chain.points.push({ x: px, y: py });
        chain.previous.push({ x: px, y: py });
      }
      encounter.tendrils.push(chain);
    }
  }

  function updateColossalTendrils(dt, time, line) {
    var activeColossal = activeColossalEncounter(time, line);
    for (var encounterIndex = 0; encounterIndex < colossalEncounters.length; encounterIndex += 1) {
      var encounter = colossalEncounters[encounterIndex];
      if (!activeColossal || encounterIndex !== activeColossal.index) {
        encounter.tendrils = [];
        continue;
      }
      var state = activeColossal.state;
      if (!encounter.tendrils.length) initializeColossalTendrils(encounter, state, encounterIndex);
      var firstAnchor = colossalTendrilAnchor(state, encounter, 0, encounter.tendrils.length);
      var root = encounter.tendrils[0].points[0];
      if (Math.abs(root.x - firstAnchor.x) + Math.abs(root.y - firstAnchor.y) > state.scale * 18) {
        initializeColossalTendrils(encounter, state, encounterIndex);
      }

      for (var tendril = 0; tendril < encounter.tendrils.length; tendril += 1) {
        var chain = encounter.tendrils[tendril];
        var anchor = colossalTendrilAnchor(state, encounter, tendril, encounter.tendrils.length);
        chain.segmentLength = state.scale * (0.43 + (tendril % 3) * 0.045);
        chain.points[0].x = anchor.x;
        chain.points[0].y = anchor.y;
        chain.previous[0].x = anchor.x;
        chain.previous[0].y = anchor.y;

        for (var point = 1; point < chain.points.length; point += 1) {
          var current = chain.points[point];
          var previous = chain.previous[point];
          var velocityX = (current.x - previous.x) * 0.991;
          var velocityY = (current.y - previous.y) * 0.991;
          previous.x = current.x;
          previous.y = current.y;
          var localFlow = sampleFluid(current.x, current.y);
          var slowWiggle = Math.sin(time * 0.17 + chain.phase + point * 0.39) * state.scale * 0.055;
          current.x += velocityX + localFlow.x * dt * 0.32 + slowWiggle * dt;
          current.y += velocityY + localFlow.y * dt * 0.28 + state.scale * 0.003 * dt;
        }

        for (var iteration = 0; iteration < 6; iteration += 1) {
          chain.points[0].x = anchor.x;
          chain.points[0].y = anchor.y;
          for (var segment = 0; segment < chain.points.length - 1; segment += 1) {
            var a = chain.points[segment];
            var b = chain.points[segment + 1];
            var dx = b.x - a.x;
            var dy = b.y - a.y;
            var distance = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
            var correction = (distance - chain.segmentLength) / distance;
            if (segment === 0) {
              b.x -= dx * correction;
              b.y -= dy * correction;
            } else {
              a.x += dx * correction * 0.5;
              a.y += dy * correction * 0.5;
              b.x -= dx * correction * 0.5;
              b.y -= dy * correction * 0.5;
            }
          }
        }
      }
    }
  }

  function drawColossalTendrils(palette, encounter, fade, scale, color) {
    var tendrilColor = color || palette.creature;
    ctx.globalAlpha = fade;
    for (var tendril = 0; tendril < encounter.tendrils.length; tendril += 1) {
      var chain = encounter.tendrils[tendril];
      for (var point = 1; point < chain.points.length; point += 1) {
        pixelLine(
          chain.points[point - 1].x,
          chain.points[point - 1].y,
          chain.points[point].x,
          chain.points[point].y,
          tendrilColor,
          Math.max(1, Math.round(scale * 0.16))
        );
      }
      var tip = chain.points[chain.points.length - 1];
      ctx.globalAlpha = fade * 0.34;
      pixelRect(tip.x, tip.y, 1, 1, tendrilColor);
      ctx.globalAlpha = fade;
    }
    ctx.globalAlpha = 1;
  }

  function drawColossalAppendage(startX, startY, direction, reach, bend, wave, time, phase, thickness, color) {
    var previousX = startX;
    var previousY = startY;
    var segments = 7;
    for (var segment = 1; segment <= segments; segment += 1) {
      var amount = segment / segments;
      var softAmount = amount * amount * (3 - 2 * amount);
      var lag = Math.sin(time * 0.105 + phase + amount * 2.4) * wave * Math.pow(amount, 1.35);
      var crossCurrent = Math.sin(time * 0.061 + phase * 1.7 + amount * 4.1) * wave * 0.34 * amount;
      var nextX = startX - direction * reach * amount + crossCurrent;
      var nextY = startY + bend * softAmount + lag;
      var segmentThickness = Math.max(1, Math.round(thickness * (1 - amount * 0.55)));
      pixelLine(previousX, previousY, nextX, nextY, color, segmentThickness);
      previousX = nextX;
      previousY = nextY;
    }
  }

  function drawColossalWhisker(startX, startY, direction, reach, lift, wave, time, phase, thickness, color) {
    var previousX = startX;
    var previousY = startY;
    var segments = 9;
    for (var segment = 1; segment <= segments; segment += 1) {
      var amount = segment / segments;
      var tipFreedom = Math.pow(amount, 1.35);
      var travelingBend = Math.sin(time * 0.14 + phase + amount * 3.4) * wave * tipFreedom;
      var currentBend = Math.sin(time * 0.065 + phase * 1.7 + amount * 5.1) * wave * 0.3 * amount;
      var nextX = startX + direction * reach * amount + currentBend;
      var nextY = startY + lift * amount + travelingBend;
      pixelLine(previousX, previousY, nextX, nextY, color, thickness);
      previousX = nextX;
      previousY = nextY;
    }
  }

  function drawColossalEncounter(time, palette, line, encounter, index, inspectionOnly) {
    var state = colossalState(time, line, encounter);
    if (!state) return;
    var x = state.x;
    var y = state.y;
    var scale = state.scale;
    var direction = encounter.direction;
    var radiusX = Math.max(20, Math.round(22 * scale));
    var radiusY = Math.max(9, Math.round(7.5 * scale));
    var fade = index === 0 ? 0.3 : 0.24;
    var distantColor = inspectionOnly ? palette.creature : palette.waterDeep;
    var distantDetail = inspectionOnly ? palette.creature : palette.steelDark;

    if (!inspectionOnly) {
      for (var halo = 0; halo < 176; halo += 1) {
        var haloSeed = index * 991.7 + halo * 29.1;
        var haloAngle = hash(haloSeed) * Math.PI * 2;
        var haloRadius = 1.03 + hash(haloSeed + 8.4) * 0.3;
        var haloX = x + Math.cos(haloAngle) * radiusX * haloRadius;
        var haloY = y + Math.sin(haloAngle) * radiusY * haloRadius;
        var haloPulse = (Math.sin(time * 0.18 + halo * 0.43 + encounter.phase) + 1) * 0.5;
        ctx.globalAlpha = 0.1 + fade * (0.18 + haloPulse * 0.2);
        pixelRect(haloX, haloY, 1, 1, halo % 5 === 0 ? palette.lamp : palette.bubble);
        if (halo % 9 === 0) pixelRect(haloX + (halo % 2 ? 1 : -1), haloY + 1, 1, 1, palette.bubble);
      }
    }

    ctx.globalAlpha = inspectionOnly ? 1 : fade;
    ctx.fillStyle = distantColor;
    for (var bodyX = -radiusX; bodyX <= radiusX; bodyX += 1) {
      var anatomicalX = bodyX * direction / radiusX;
      var envelope = Math.pow(Math.max(0, 1 - anatomicalX * anatomicalX), 0.56);
      var tailTaper = anatomicalX < -0.46
        ? lerp(0.15, 1, smoothstep(clamp((anatomicalX + 1) / 0.54, 0, 1)))
        : 1;
      var cranialMass = 1 + Math.exp(-Math.pow((anatomicalX - 0.52) * 4.2, 2)) * 0.24;
      var shoulderHump = 1 + Math.exp(-Math.pow((anatomicalX - 0.08) * 3.2, 2)) * 0.18;
      var tailStock = 1 - Math.exp(-Math.pow((anatomicalX + 0.54) * 7.5, 2)) * 0.24;
      var ribNotches = anatomicalX > -0.36 && anatomicalX < 0.42
        ? 1 - Math.pow(Math.max(0, Math.cos((anatomicalX + 0.3) * Math.PI * 4.2)), 6) * 0.055
        : 1;
      var halfHeight = radiusY * envelope * tailTaper * cranialMass * shoulderHump * tailStock * ribNotches;
      var spineArch = -radiusY * (0.12 + Math.exp(-Math.pow((anatomicalX + 0.02) * 2.7, 2)) * 0.12) * envelope;
      var edgeMobility = Math.pow(envelope, 0.7);
      var slowBreath = Math.sin(time * 0.072 + encounter.phase) * scale * 0.15 * edgeMobility;
      var topRipple = Math.sin(time * 0.108 + encounter.phase + anatomicalX * 5.2) * scale * 0.2 * edgeMobility;
      var bottomRipple = Math.sin(time * 0.093 + encounter.phase * 1.4 + anatomicalX * 4.7 + 1.8) * scale * 0.16 * edgeMobility;
      var columnTop = Math.round(y + spineArch - halfHeight - slowBreath + topRipple);
      var columnBottom = Math.round(y + spineArch + halfHeight + slowBreath + bottomRipple);
      ctx.fillRect(Math.round(x + bodyX), columnTop, 1, Math.max(1, columnBottom - columnTop + 1));
    }

    ctx.globalAlpha = inspectionOnly ? 1 : fade * 0.22;
    for (var bodyMark = 0; bodyMark < 38; bodyMark += 1) {
      var bodySeed = index * 401.3 + bodyMark * 37.7;
      var markX = x + (hash(bodySeed) - 0.5) * radiusX * 1.55;
      var markY = y + (hash(bodySeed + 9.2) - 0.5) * radiusY * 1.25;
      var ellipse = Math.pow((markX - x) / radiusX, 2) + Math.pow((markY - y) / radiusY, 2);
      if (ellipse < 0.72) pixelRect(markX, markY, 1, 1, distantDetail);
    }
    ctx.globalAlpha = inspectionOnly ? 1 : fade * 0.28;

    for (var bodySegment = 0; bodySegment < 3; bodySegment += 1) {
      var segmentPosition = [-0.42, 0.02, 0.42][bodySegment];
      var segmentX = x + direction * radiusX * segmentPosition;
      var segmentHalfHeight = radiusY * (0.52 + bodySegment * 0.08);
      for (var segmentY = -segmentHalfHeight; segmentY <= segmentHalfHeight; segmentY += 4) {
        var seamCurve = Math.sin(segmentY * 0.09 + time * 0.055 + bodySegment) * scale * 0.18;
        if ((Math.round(segmentY / 4) + bodySegment) % 2 === 0) {
          pixelRect(segmentX + seamCurve, y + segmentY, 1, 2, distantDetail);
        }
      }
    }

    ctx.globalAlpha = inspectionOnly ? 1 : fade * 0.62;
    var tailBaseX = x - direction * radiusX * 0.82;
    var tailReach = radiusX * 0.58;
    drawColossalAppendage(
      tailBaseX, y - radiusY * 0.08, direction, tailReach, -radiusY * 0.58,
      radiusY * 0.19, time, encounter.phase + 0.6,
      Math.max(2, scale * 0.44), distantColor
    );
    drawColossalAppendage(
      tailBaseX, y + radiusY * 0.08, direction, tailReach, radiusY * 0.58,
      radiusY * 0.19, time, encounter.phase + 3.2,
      Math.max(2, scale * 0.44), distantColor
    );
    var lowerFinX = x - direction * radiusX * 0.05;
    drawColossalAppendage(
      lowerFinX, y + radiusY * 0.48, direction, radiusX * 0.24, radiusY * 0.82,
      radiusY * 0.14, time, encounter.phase + 5.1,
      Math.max(2, scale * 0.34), distantColor
    );
    var dorsalFinX = x - direction * radiusX * 0.08;
    drawColossalAppendage(
      dorsalFinX, y - radiusY * 0.72, direction, radiusX * 0.18, -radiusY * 0.48,
      radiusY * 0.1, time, encounter.phase + 1.9,
      Math.max(2, scale * 0.3), distantColor
    );

    var faceX = x + direction * radiusX * 0.78;
    var eyeY = y - radiusY * 0.12;
    var eyeRadius = Math.max(2, Math.round(scale * 0.46));
    ctx.globalAlpha = inspectionOnly ? 1 : 0.025;
    drawPixelDisc(faceX, eyeY, eyeRadius + Math.max(2, Math.round(scale * 0.7)), palette.bubble);
    ctx.globalAlpha = inspectionOnly ? 1 : 0.16;
    drawPixelDisc(faceX, eyeY, eyeRadius, palette.kelp);
    drawPixelDisc(faceX + direction, eyeY, Math.max(1, Math.round(eyeRadius * 0.38)), palette.abyss);

    ctx.globalAlpha = inspectionOnly ? 1 : fade * 0.32;
    for (var antenna = 0; antenna < 5; antenna += 1) {
      var antennaBaseY = y + (antenna - 2) * radiusY * 0.19;
      drawColossalWhisker(
        faceX,
        antennaBaseY,
        direction,
        radiusX * (0.22 + antenna * 0.035),
        (antenna - 2) * scale * 0.9,
        scale * (0.42 + antenna * 0.055),
        time,
        encounter.phase + antenna * 1.27,
        Math.max(1, Math.round(scale * 0.14)),
        distantColor
      );
    }

    ctx.globalAlpha = inspectionOnly ? 1 : fade * 0.22;
    for (var marking = 0; marking < 42; marking += 1) {
      var markingAmount = marking / 41;
      var markingX = x - direction * radiusX * 0.58 + direction * radiusX * 1.14 * markingAmount;
      var markingY = y - radiusY * (0.52 + Math.sin(markingAmount * Math.PI * 3) * 0.08);
      if (marking % 6 !== 1) pixelRect(markingX, markingY, 1, 1, distantDetail);
    }

    drawColossalTendrils(palette, encounter, inspectionOnly ? 1 : fade * 0.5, scale, distantColor);
    ctx.globalAlpha = 1;
  }

  function drawColossalEncounters(time, palette, line) {
    var activeColossal = activeColossalEncounter(time, line);
    if (!activeColossal) return;
    drawColossalEncounter(time, palette, line, activeColossal.encounter, activeColossal.index);
  }

  function updateDeepBodyDescriptors(time, geometry) {
    deepBodyDescriptors.length = 0;
    for (var i = 0; i < leviathans.length; i += 1) {
      var leviathan = leviathans[i];
      deepBodyDescriptors.push({
        x: leviathan.x,
        y: leviathan.y,
        radiusX: 34 * leviathan.scale,
        radiusY: 11 * leviathan.scale,
        direction: leviathan.direction,
        wakeLength: 70 * leviathan.scale,
        opacity: 0.78,
        glow: 0.16
      });
    }
    var activeColossal = activeColossalEncounter(time, geometry.line);
    if (activeColossal) {
      deepBodyDescriptors.push({
        x: activeColossal.state.x,
        y: activeColossal.state.y,
        radiusX: 28 * activeColossal.state.scale,
        radiusY: 10 * activeColossal.state.scale,
        direction: activeColossal.encounter.direction,
        wakeLength: 72 * activeColossal.state.scale,
        opacity: 0.94,
        glow: 0.1
      });
    }
    if (ecologyEvent && ecologyEvent.active && ecologyEvent.type === "shadowPassage") {
      var shadowTravel = ecologyEvent.direction > 0 ? ecologyEvent.phase : 1 - ecologyEvent.phase;
      deepBodyDescriptors.push({
        x: lerp(-90, width + 90, shadowTravel),
        y: geometry.line + (height - geometry.line) * ecologyEvent.depth,
        radiusX: 72,
        radiusY: 18,
        direction: ecologyEvent.direction,
        wakeLength: 150,
        opacity: ecologyEvent.intensity * 0.88,
        glow: 0.04
      });
    }
  }

  function planktonVisibilityAt(x, y) {
    if (!AmbientLife || !deepBodyDescriptors.length) return 1;
    return AmbientLife.sampleBodyField(
      x, y, deepBodyDescriptors, deepBodyDescriptors.length, bodyFieldSample
    ).planktonMultiplier;
  }

  function drawCaustics(time, palette, geometry) {
    if (!AmbientLife || environment.storm > 0.86) return;
    var density = clamp(visualDensity() * 0.42, 0.18, 0.72);
    ctx.globalAlpha = clamp(0.18 - environment.storm * 0.11, 0.035, 0.18);
    for (var y = geometry.line + 8; y < Math.min(height, geometry.line + 86); y += 3) {
      for (var x = (y % 5); x < width; x += 3) {
        if (!AmbientLife.causticPixelVisible(x, y, time, geometry.line, environment.storm, cameraX, density)) continue;
        if (planktonVisibilityAt(x, y) < 0.32) continue;
        pixelRect(x, y, hash(x * 3.1 + y * 7.7) > 0.74 ? 2 : 1, 1, palette.bubble);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRareEcology(time, palette, geometry, typeFilter) {
    if (!ecologyEvent || !ecologyEvent.active) return;
    if (typeFilter && ecologyEvent.type !== typeFilter) return;
    var intensity = ecologyEvent.intensity;
    var eventX = ecologyEvent.x * width;
    if (ecologyEvent.type === "jellyBloom") {
      var jellyCount = Math.floor((12 + width / 34) * intensity * visualDensity());
      ctx.globalAlpha = 0.22 + intensity * 0.38;
      for (var jelly = 0; jelly < jellyCount; jelly += 1) {
        var jellySeed = ecologyEvent.seed * 911 + jelly * 17.3;
        var jellyX = wrapWorldX(screenToWorldX(eventX) + (hash(jellySeed) - 0.5) * width * 0.72);
        jellyX = worldToScreenX(jellyX);
        var jellyY = geometry.line + 12 + hash(jellySeed + 4.1) * Math.max(16, (height - geometry.line) * 0.5);
        var pulse = Math.sin(time * (0.52 + hash(jellySeed + 7) * 0.5) + jellySeed);
        drawPixelMask(
          jellyX - 2,
          jellyY + Math.round(pulse),
          pulse > 0 ? [" 111 ", "11111", "1 1 1"] : [" 111 ", "11 11", " 1 1 "],
          { "1": hash(jellySeed + 9) > 0.72 ? palette.lamp : palette.bubble },
          false
        );
      }
      ctx.globalAlpha = 1;
    } else if (ecologyEvent.type === "migration") {
      var migrationCount = Math.floor((10 + width / 28) * intensity);
      ctx.globalAlpha = 0.28 + intensity * 0.32;
      for (var migrant = 0; migrant < migrationCount; migrant += 1) {
        var lane = migrant % 5;
        var travel = (ecologyEvent.phase * 1.45 + hash(migrant * 13.7 + ecologyEvent.seed)) % 1;
        if (ecologyEvent.direction < 0) travel = 1 - travel;
        var migrantX = travel * (width + 50) - 25;
        var migrantY = geometry.line + (height - geometry.line) * clamp(ecologyEvent.depth + (lane - 2) * 0.035, 0.18, 0.76);
        drawPixelMask(migrantX - 3, migrantY, ["1    ", " 1111", "1    "], { "1": palette.bubble }, ecologyEvent.direction < 0);
      }
      ctx.globalAlpha = 1;
    } else if (ecologyEvent.type === "distantBreach") {
      var breachPhase = ecologyEvent.phase;
      var rise = Math.sin(breachPhase * Math.PI);
      var breachY = geometry.line - rise * 29;
      ctx.globalAlpha = intensity * 0.52;
      pixelLine(eventX - 12, breachY + 7, eventX, breachY, palette.steelDark, 5);
      pixelLine(eventX, breachY, eventX + 17, breachY + 10, palette.steelDark, 4);
      pixelLine(eventX - 4, breachY + 3, eventX - 12, breachY - 5, palette.steelDark, 2);
      pixelLine(eventX + 4, breachY + 4, eventX + 12, breachY - 2, palette.steelDark, 2);
      for (var spray = 0; spray < 11; spray += 1) {
        var sprayX = eventX + (hash(spray * 7.1 + ecologyEvent.seed) - 0.5) * 34;
        var sprayY = geometry.line - hash(spray * 11.3 + ecologyEvent.seed) * rise * 16;
        pixelRect(sprayX, sprayY, 1, 1, palette.foam);
      }
      ctx.globalAlpha = 1;
    } else if (ecologyEvent.type === "shadowPassage") {
      var direction = ecologyEvent.direction;
      var shadowX = lerp(-90, width + 90, direction > 0 ? ecologyEvent.phase : 1 - ecologyEvent.phase);
      var shadowY = geometry.line + (height - geometry.line) * ecologyEvent.depth;
      ctx.globalAlpha = intensity * 0.22;
      for (var segment = -5; segment <= 6; segment += 1) {
        var segmentX = shadowX + segment * 11 * direction;
        var radius = 7 + Math.round((1 - Math.abs(segment) / 7) * 7);
        drawPixelDisc(segmentX, shadowY + Math.sin(time * 0.12 + segment * 0.5) * 2, radius, palette.abyss);
      }
      pixelLine(shadowX - direction * 48, shadowY, shadowX - direction * 77, shadowY - 16, palette.abyss, 4);
      pixelLine(shadowX - direction * 48, shadowY, shadowX - direction * 76, shadowY + 14, palette.abyss, 4);
      pixelLine(shadowX + direction * 8, shadowY, shadowX + direction * 23, shadowY - 21, palette.abyss, 4);
      ctx.globalAlpha = 1;
    }
  }

  function drawFluidMaterial(palette) {
    if (!fluid) return;
    for (var row = 0; row < fluid.rows; row += 1) {
      for (var col = 0; col < fluid.cols; col += 1) {
        var index = fluidIndex(col, row);
        var dye = fluid.dye[index];
        var plankton = fluid.plankton[index];
        if (fluid.solid[index]) continue;
        var x = col * FLUID_CELL;
        var y = fluid.line + row * FLUID_CELL;
        var velocityX = fluid.u[index];
        var velocityY = fluid.v[index];
        if (dye >= 0.035) {
          ctx.globalAlpha = clamp(dye * 0.44, 0.06, 0.44);
          var materialColor = velocityY < -0.08 ? palette.bubble : palette.timberLight;
          var pointCount = 1 + Math.floor(clamp(dye, 0, 1.3) * 5);
          for (var point = 0; point < pointCount; point += 1) {
            var pointSeed = index * 17.3 + point * 29.7;
            var driftX = (hash(pointSeed) - 0.5) * 7 + clamp(velocityX, -1, 1) * point * 0.7;
            var driftY = (hash(pointSeed + 8.1) - 0.5) * 7 + clamp(velocityY, -1, 1) * point * 0.7;
            pixelRect(x + driftX, y + driftY, 1, 1, materialColor);
          }
        }
        if (
          plankton > 0.17 &&
          hash(col * 19.1 + row * 31.7) < (plankton - 0.12) * 0.42 * planktonVisibilityAt(x, y)
        ) {
          ctx.globalAlpha = clamp(0.08 + plankton * 0.3, 0.08, 0.46);
          ctx.fillStyle = plankton > 0.48 ? palette.lamp : palette.plankton;
          ctx.fillRect(Math.floor(x + hash(index * 3.9) * 4), Math.floor(y + hash(index * 7.1) * 4), 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function swimmerPalette(swimmer, palette, traits, out) {
    var result = out || {};
    var variant = traits ? traits.paletteVariant : Math.floor(swimmer.seed * 4);
    var colors = [palette.android, palette.bubble, palette.plankton, palette.kelp];
    if (swimmer.kind === "seaGiant") colors = [palette.steelDark, palette.creature, palette.steel, palette.abyss];
    if (swimmer.kind === "shark") colors = [palette.android, palette.plankton, palette.bubble, palette.planetLight];
    result.base = colors[variant % colors.length];
    result.pattern = colors[(variant + 1) % colors.length];
    result.dark = swimmer.kind === "seaGiant" ? palette.abyss : palette.steelDark;
    result.glow = traits && traits.glowPattern > 0 ? palette.lamp : colors[(variant + 2) % colors.length];
    return result;
  }

  function variedPixelColor(traits, localX, localY, colors) {
    if (!CreatureVariation || !traits) return colors.base;
    var marking = CreatureVariation.patternAt(traits, localX, localY);
    if (marking === 3) return colors.glow;
    if (marking === 2) return colors.dark;
    if (marking === 1) return colors.pattern;
    return colors.base;
  }

  function drawVariedSwimmer(swimmer, time, palette) {
    var traits = swimmer.variation;
    if (!traits && CreatureVariation) {
      traits = CreatureVariation.createTraits(swimmer.kind, swimmer.seed, swimmer.size);
      swimmer.variation = traits;
    }
    if (!traits || !CreatureVariation) return false;

    var speed = Math.sqrt(swimmer.vx * swimmer.vx + swimmer.vy * swimmer.vy);
    var movementDrive = clamp(speed / Math.max(0.55, swimmer.size * 1.1), 0, 1);
    var animationRate = clamp(swimmer.behaviorAnimationRate || 0.72, 0.3, MAX_CREATURE_ANIMATION_RATE) *
      lerp(0.52, 1, movementDrive);
    if (swimmer.kind === "eel") animationRate *= 0.32;
    var pose = CreatureVariation.poseAt(traits, time * animationRate, speed, variationPose);
    var colors = swimmerPalette(swimmer, palette, traits, variationColors);
    var x = Math.round(swimmer.x);
    var y = Math.round(swimmer.y + pose.bob);
    var facing = swimmer.direction < 0 ? -1 : 1;
    var bodyLength = traits.bodyLength;
    var halfLength = Math.floor(bodyLength * 0.5);

    if (swimmer.kind === "jelly") {
      var bellWidth = Math.max(4, bodyLength);
      var bellHeight = Math.max(2, Math.round(traits.bodyHeight * pose.pulse));
      for (var bellX = -Math.floor(bellWidth / 2); bellX <= Math.floor(bellWidth / 2); bellX += 1) {
        var bellU = bellX / Math.max(1, bellWidth * 0.5);
        var bellTop = -Math.round(Math.sqrt(Math.max(0, 1 - bellU * bellU)) * bellHeight);
        for (var bellY = bellTop; bellY <= 0; bellY += 1) {
          pixelRect(x + bellX, y + bellY, 1, 1, variedPixelColor(traits, bellX, bellY, colors));
        }
      }
      if (swimmer.tentacles && swimmer.tentacles.length) {
        for (var jellyLeg = 0; jellyLeg < swimmer.tentacles.length; jellyLeg += 1) {
          var jellyChain = swimmer.tentacles[jellyLeg].points;
          for (var jellyPointIndex = 1; jellyPointIndex < jellyChain.length; jellyPointIndex += 1) {
            pixelLine(
              jellyChain[jellyPointIndex - 1].x, jellyChain[jellyPointIndex - 1].y,
              jellyChain[jellyPointIndex].x, jellyChain[jellyPointIndex].y,
              colors.base, 1
            );
          }
        }
      } else {
        for (var fallbackLeg = 0; fallbackLeg < traits.tentacleCount; fallbackLeg += 1) {
          var fallbackRootX = x + Math.round((fallbackLeg / Math.max(1, traits.tentacleCount - 1) - 0.5) * bellWidth * 0.72);
          pixelLine(fallbackRootX, y, fallbackRootX + Math.sin(time * 0.24 + fallbackLeg) * 2, y + traits.tentacleLength, colors.base, 1);
        }
      }
      return true;
    }

    if (swimmer.kind === "hectapus") {
      var mantleWidth = Math.max(5, Math.round(bodyLength * 0.72));
      var mantleHalf = Math.floor(mantleWidth / 2);
      for (var mantleX = -mantleHalf; mantleX <= mantleHalf; mantleX += 1) {
        var mantleU = mantleX / Math.max(1, mantleHalf);
        var mantleHeight = Math.max(1, Math.round(Math.sqrt(Math.max(0, 1 - mantleU * mantleU)) * traits.bodyHeight * 0.5));
        for (var mantleY = -mantleHeight; mantleY <= mantleHeight; mantleY += 1) {
          pixelRect(x + mantleX * facing, y + mantleY - 1, 1, 1, variedPixelColor(traits, mantleX, mantleY, colors));
        }
      }
      if (swimmer.tentacles && swimmer.tentacles.length) {
        for (var arm = 0; arm < swimmer.tentacles.length; arm += 1) {
          var armChain = swimmer.tentacles[arm].points;
          for (var armPointIndex = 1; armPointIndex < armChain.length; armPointIndex += 1) {
            pixelLine(
              armChain[armPointIndex - 1].x, armChain[armPointIndex - 1].y,
              armChain[armPointIndex].x, armChain[armPointIndex].y,
              colors.base, 1
            );
          }
        }
      }
      pixelRect(x + facing * Math.max(1, mantleHalf - 1), y - 2, 1, 1, colors.glow);
      return true;
    }

    if (swimmer.kind === "eel") {
      var eelLength = Math.max(9, bodyLength + traits.tailLength);
      var eelPriorX = x + facing * Math.floor(eelLength * 0.45);
      var eelPriorY = y;
      for (var eelSegment = 0; eelSegment <= eelLength; eelSegment += 1) {
        var eelAmount = eelSegment / eelLength;
        var eelX = x + facing * Math.round(eelLength * (0.45 - eelAmount));
        var eelWave = Math.sin(pose.phase - eelAmount * Math.PI * 2.2) * (0.4 + eelAmount * 1.7);
        var eelY = y + Math.round(eelWave);
        pixelLine(eelPriorX, eelPriorY, eelX, eelY, eelSegment < bodyLength * 0.62 ? colors.base : colors.pattern, eelAmount < 0.46 ? 2 : 1);
        eelPriorX = eelX;
        eelPriorY = eelY;
      }
      pixelRect(x + facing * Math.floor(eelLength * 0.39), y - 1, 1, 1, colors.glow);
      pixelRect(x + facing * Math.floor(eelLength * 0.18), y + 1, 2, 1, colors.pattern);
      return true;
    }

    if (swimmer.kind === "ray") {
      var rayHalf = Math.max(4, Math.floor(bodyLength * 0.5));
      var rayWing = Math.max(3, Math.round(traits.finSpan * 0.82));
      for (var rayX = -rayHalf; rayX <= rayHalf; rayX += 1) {
        var rayEnvelope = 1 - Math.abs(rayX) / Math.max(1, rayHalf);
        var rayHalfHeight = Math.max(1, Math.round(rayEnvelope * rayWing));
        var rayCenterY = Math.round(Math.sin(pose.phase + rayX * 0.22) * 0.45);
        for (var rayY = -rayHalfHeight; rayY <= rayHalfHeight; rayY += 1) {
          var rayEdge = Math.abs(rayY) === rayHalfHeight;
          pixelRect(x + facing * rayX, y + rayCenterY + rayY, 1, 1, rayEdge ? colors.pattern : colors.base);
        }
      }
      var rayTailRoot = x - facing * rayHalf;
      pixelLine(rayTailRoot, y, rayTailRoot - facing * traits.tailLength, y + Math.round(pose.tail * 0.25), colors.base, 1);
      pixelRect(x + facing * Math.max(1, rayHalf - 2), y - 1, 1, 1, colors.glow);
      return true;
    }

    if (swimmer.kind === "fish") {
      var fishHalf = Math.max(3, Math.floor(bodyLength * 0.5));
      var fishHeight = Math.max(2, Math.floor(traits.bodyHeight * 0.5));
      for (var fishX = -fishHalf; fishX <= fishHalf; fishX += 1) {
        var fishEnvelope = Math.sqrt(Math.max(0, 1 - Math.pow(fishX / Math.max(1, fishHalf), 2)));
        var fishHalfHeight = Math.max(0, Math.floor(fishEnvelope * fishHeight));
        for (var fishY = -fishHalfHeight; fishY <= fishHalfHeight; fishY += 1) {
          var fishStripe = fishX === 0 || fishX === -1;
          pixelRect(x + facing * fishX, y + fishY, 1, 1, fishStripe ? colors.pattern : colors.base);
        }
      }
      var fishTailRoot = x - facing * fishHalf;
      var fishTailTip = fishTailRoot - facing * Math.max(2, traits.tailLength);
      pixelLine(fishTailRoot, y, fishTailTip, y - Math.max(1, traits.tailSpan), colors.pattern, 1);
      pixelLine(fishTailRoot, y, fishTailTip, y + Math.max(1, traits.tailSpan), colors.pattern, 1);
      pixelRect(x + facing * Math.max(1, fishHalf - 1), y - 1, 1, 1, colors.glow);
      return true;
    }

    if (swimmer.kind === "shark") {
      var sharkHalf = Math.max(6, Math.floor(bodyLength * 0.5));
      var sharkHeight = Math.max(2, Math.floor(traits.bodyHeight * 0.5));
      for (var sharkX = -sharkHalf; sharkX <= sharkHalf; sharkX += 1) {
        var sharkU = sharkX / sharkHalf;
        var sharkTaper = sharkU < -0.3 ? clamp((sharkU + 1) / 0.7, 0.15, 1) : 1;
        var sharkEnvelope = Math.sqrt(Math.max(0, 1 - sharkU * sharkU)) * sharkTaper;
        var sharkHalfHeight = Math.max(0, Math.floor(sharkEnvelope * sharkHeight));
        for (var sharkY = -sharkHalfHeight; sharkY <= sharkHalfHeight; sharkY += 1) {
          pixelRect(x + facing * sharkX, y + sharkY, 1, 1, sharkY === sharkHalfHeight ? colors.pattern : colors.base);
        }
      }
      var sharkTailRoot = x - facing * sharkHalf;
      var sharkTailTip = sharkTailRoot - facing * traits.tailLength;
      pixelLine(sharkTailRoot, y, sharkTailTip, y - traits.tailSpan, colors.base, 2);
      pixelLine(sharkTailRoot, y, sharkTailTip, y + traits.tailSpan, colors.base, 2);
      var sharkDorsalX = x - facing * 1;
      pixelLine(sharkDorsalX, y - 1, sharkDorsalX - facing * 2, y - traits.dorsalHeight, colors.base, 1);
      pixelRect(x + facing * Math.max(2, sharkHalf - 2), y - 1, 1, 1, colors.glow);
      return true;
    }

    for (var bodyX = 0; bodyX <= bodyLength; bodyX += 1) {
      var bodyU = bodyX / Math.max(1, bodyLength) * 2 - 1;
      var profile = CreatureVariation.bodyProfileAt(traits, pose, bodyU, variationBody);
      var bodyScreenX = x + facing * (bodyX - halfLength);
      var bodyCenterY = y + Math.round(profile.center);
      var bodyHalfHeight = Math.max(1, Math.round(profile.halfHeight));
      if (swimmer.kind === "ray") bodyHalfHeight = Math.max(1, Math.round(bodyHalfHeight * 0.5));
      for (var bodyY = -bodyHalfHeight; bodyY <= bodyHalfHeight; bodyY += 1) {
        pixelRect(bodyScreenX, bodyCenterY + bodyY, 1, 1, variedPixelColor(traits, bodyX, bodyY, colors));
      }
    }

    var tailRootX = x - facing * halfLength;
    var tailTipX = tailRootX - facing * traits.tailLength;
    var tailTipY = y + Math.round(pose.tail * 0.65);
    if (traits.tailLength > 0) {
      pixelLine(tailRootX, y, tailTipX, tailTipY, colors.base, swimmer.kind === "seaGiant" ? 2 : 1);
      pixelLine(tailTipX, tailTipY, tailTipX - facing * Math.max(1, traits.tailSpan), tailTipY - traits.tailSpan, colors.base, 1);
      pixelLine(tailTipX, tailTipY, tailTipX - facing * Math.max(1, traits.tailSpan), tailTipY + traits.tailSpan, colors.base, 1);
    }

    if (traits.finSpan > 0) {
      var finRootX = x + facing * Math.round(bodyLength * 0.08);
      var finReach = Math.max(1, Math.round(traits.finSpan * (0.72 + Math.abs(pose.fin) * 0.24)));
      if (swimmer.kind === "ray") finReach = Math.max(finReach, traits.finSpan);
      pixelLine(finRootX, y, finRootX - facing * Math.round(finReach * 0.28), y - finReach, colors.pattern, 1);
      pixelLine(finRootX, y, finRootX - facing * Math.round(finReach * 0.28), y + finReach, colors.pattern, 1);
    }
    if (traits.dorsalHeight > 0 && swimmer.kind !== "eel" && swimmer.kind !== "ray") {
      var dorsalX = x - facing * Math.round(bodyLength * 0.08);
      pixelLine(dorsalX, y - 1, dorsalX - facing * Math.round(traits.dorsalHeight * 0.5), y - traits.dorsalHeight, colors.dark, 1);
    }

    var eyeX = x + facing * Math.max(1, halfLength - 1);
    pixelRect(eyeX, y - 1, 1, 1, colors.glow);
    if (traits.scarCount > 0) {
      for (var scar = 0; scar < traits.scarCount; scar += 1) {
        var scarX = x + facing * Math.round((scar / Math.max(1, traits.scarCount) - 0.25) * bodyLength * 0.5);
        pixelRect(scarX, y + (scar % 2 ? 1 : -1), 1, 1, colors.dark);
      }
    }
    return true;
  }

  function drawSwimmers(time, palette, kindFilter) {
    for (var i = 0; i < swimmers.length; i += 1) {
      var swimmer = swimmers[i];
      if (kindFilter && swimmer.kind !== kindFilter) continue;
      var glow = (swimmer.behaviorGlowBoost || 0) + (swimmer.variation ? swimmer.variation.glowStrength * 0.18 : 0);
      var visibility = 0.76;
      if (AmbientLife) {
        visibility = AmbientLife.sampleDepth(
          swimmer.y, waterlineY(), height, environment.storm, glow, depthSample
        ).visibility * (swimmer.eventVisibilityScale || 1);
      }
      ctx.globalAlpha = clamp(visibility, 0.18, 0.9);
      if (!drawVariedSwimmer(swimmer, time, palette)) {
        drawPixelMask(
          Math.floor(swimmer.x) - 2,
          Math.floor(swimmer.y) - 1,
          ["1   ", " 111", "1   "],
          { "1": palette.bubble },
          swimmer.direction < 0
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawWeather(time, palette, line) {
    var storm = environment.storm;
    if (storm < 0.18) return;
    var cloudMasks = [
      ["1111", "111 ", " 11 "],
      [" 111", "1111", "11  "],
      ["11  ", "1111", " 111"]
    ];
    var cloudCell = 3;
    var frontDrift = Math.floor(time * environment.wind * 0.42);
    var density = visualDensity();
    ctx.globalAlpha = clamp((storm - 0.11) * 0.76, 0, 0.68);
    for (var cloudX = -cloudCell * 2; cloudX < width + cloudCell * 2; cloudX += cloudCell) {
      var cloudWorldX = Math.floor(screenToWorldX(cloudX) + frontDrift);
      var broadShape = Math.sin(cloudWorldX * 0.041) * 4 + Math.sin(cloudWorldX * 0.017 + 1.9) * 5;
      var cloudBase = Math.floor(8 + storm * 27 + broadShape);
      for (var cloudY = 2; cloudY < cloudBase; cloudY += cloudCell) {
        var cellX = Math.floor(cloudWorldX / cloudCell);
        var cellY = Math.floor(cloudY / cloudCell);
        var grain = hash(cellX * 19.17 + cellY * 47.31);
        var edgeDepth = cloudBase - cloudY;
        var threshold = edgeDepth < 7 ? 0.56 - edgeDepth * 0.045 : 0.16;
        var densityWeather = clamp((density - DENSITY_PROFILES.A) / (DENSITY_PROFILES.C - DENSITY_PROFILES.A), 0, 1);
        threshold += lerp(0.14, -0.08, densityWeather);
        if (grain < threshold) continue;
        var cloudColor = edgeDepth < 8 && hash(cellX * 7.3 + cellY) > 0.42
          ? palette.steel
          : palette.steelDark;
        var maskIndex = Math.abs(cellX + cellY) % cloudMasks.length;
        drawPixelMask(
          cloudX,
          cloudY,
          cloudMasks[maskIndex],
          { "1": cloudColor },
          (cellX + Math.floor(density * 10)) % 2 === 0
        );
      }
    }
    if (storm > 0.82 && hash(Math.floor(time * 1.7) * 13.1) > 0.965) {
      ctx.globalAlpha = 0.3;
      pixelRect(0, 0, width, line, palette.foam);
      ctx.globalAlpha = 0.92;
      var boltX = worldToScreenX(
        WORLD_WRAP_LEFT + hash(Math.floor(time * 1.7) * 29.3) * (WORLD_WRAP_RIGHT - WORLD_WRAP_LEFT)
      );
      var boltY = 13;
      var boltSegment = 0;
      while (boltY < line - 8) {
        var nextBoltY = Math.min(line - 8, boltY + 4 + Math.floor(hash(boltSegment * 13.7 + time) * 5));
        var nextBoltX = boltX + Math.floor((hash(boltSegment * 31.3 + time) - 0.5) * 7);
        pixelLine(boltX, boltY, nextBoltX, nextBoltY, palette.foam, 1);
        boltX = nextBoltX;
        boltY = nextBoltY;
        boltSegment += 1;
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(palette, kindFilter) {
    var eventParticleScale = 1;
    if (ecologyEvent && ecologyEvent.active && ecologyEvent.type === "deepQuiet") {
      eventParticleScale = 1 - ecologyEvent.intensity * 0.62;
    }
    for (var i = 0; i < particles.length; i += 1) {
      var particle = particles[i];
      if (kindFilter && particle.kind !== kindFilter) continue;
      var absence = particle.kind === "plankton" ? planktonVisibilityAt(particle.x, particle.y) : 1;
      if (particle.kind === "plankton" && hash(particle.seed * 991) > absence * eventParticleScale) continue;
      if (particle.kind === "bubble") {
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = palette.bubble;
      } else if (particle.kind === "silt") {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = particle.seed > 0.52 ? palette.timberLight : palette.kelp;
      } else {
        ctx.globalAlpha = (0.3 + particle.seed * 0.2) * absence * eventParticleScale;
        ctx.fillStyle = particle.seed > 0.9 ? palette.lamp : palette.plankton;
      }
      pixelRect(particle.x, particle.y, 1, 1, ctx.fillStyle);
      if (particle.kind === "bubble" && particle.seed > 0.72) {
        pixelRect(particle.x + 1, particle.y - 1, 1, 1, palette.bubble);
      } else if (particle.kind === "plankton" && particle.seed > 0.965) {
        pixelRect(particle.x + 1, particle.y, 1, 1, ctx.fillStyle);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawSurface(time, palette, line, raftX) {
    var foamMasks = [
      [" 11 ", "1  1"],
      ["1 1", " 2 "],
      [" 1 ", "1 1"]
    ];
    var densityAmount = clamp((visualDensity() - 0.3) / 1.5, 0, 1);
    var crestSpacing = Math.round(lerp(14, 5, densityAmount));
    var crestThreshold = lerp(0.64, 0.34, densityAmount);
    var lastCrest = -20;
    for (var x = 1; x < width - 1; x += 1) {
      var centerY = surfaceY(x, time, line, raftX);
      var top = Math.round(centerY);
      var leftY = surfaceY(x - 2, time, line, raftX);
      var rightY = surfaceY(x + 2, time, line, raftX);
      var slope = rightY - leftY;
      var curvature = leftY + rightY - centerY * 2;
      var worldX = Math.round(screenToWorldX(x));

      var isCrest = top <= leftY && top <= rightY && curvature > 0.08;
      var energetic = Math.abs(slope) > 0.48 || environment.storm > 0.42;
      if (
        x - lastCrest > crestSpacing &&
        (isCrest || energetic) &&
        hash(worldX * 0.73) > crestThreshold
      ) {
        var maskIndex = Math.abs(worldX) % foamMasks.length;
        drawPixelMask(
          x - 2,
          top - 1,
          foamMasks[maskIndex],
          { "1": palette.foam, "2": palette.bubble },
          slope > 0
        );
        lastCrest = x;
      }
    }

    ctx.globalAlpha = 0.62;
    for (var i = 0; i < ripples.length; i += 1) {
      var ripple = ripples[i];
      var radius = ripple.age * 8;
      var sides = [-1, 1];
      for (var side = 0; side < sides.length; side += 1) {
        var rippleX = ripple.x + radius * sides[side];
        if (rippleX < -5 || rippleX > width + 5) continue;
        drawPixelMask(
          rippleX - 2,
          surfaceY(rippleX, time, line, raftX),
          [" 1 1 ", "1 2 1"],
          { "1": palette.bubble, "2": palette.foam },
          sides[side] < 0
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawPlatformMotion(time, palette, geometry, left, span, deck, towerX) {
    var activity = tuning.platformActivity;
    var events = platformLife && platformLife.events;
    var cartTravel = Math.max(30, span - 78);
    var cartX = left + 24 + (time * 2.3 * activity) % cartTravel;
    drawPixelMask(
      cartX,
      deck - 5,
      [" 1111 ", "122221", " 3  3 "],
      { "1": palette.timberLight, "2": palette.steel, "3": palette.abyss },
      false
    );

    var liftPylon = geometry.pylons[Math.min(4, geometry.pylons.length - 1)];
    var liftAmount = (Math.sin(time * 0.43 * activity) + 1) * 0.5;
    var liftY = lerp(deck - 2, deck + 10, liftAmount);
    drawPixelMask(
      liftPylon - 3,
      liftY,
      ["11111", "1 2 1", "11111"],
      { "1": palette.steel, "2": palette.lamp },
      false
    );

    var craneX = left + Math.floor(span * 0.16);
    var hookAmount = events && events.craneActive
      ? events.craneHook
      : (Math.sin(time * 0.7 * activity) + 1) * 0.5;
    var hookY = deck - 31 + Math.round(hookAmount * 10);
    for (var ropeY = deck - 46; ropeY < hookY; ropeY += 3) {
      pixelRect(craneX, ropeY, 1, 1, palette.steel);
    }
    drawPixelMask(
      craneX - 2,
      hookY,
      ["1 1", " 1 ", "111"],
      { "1": palette.lamp },
      false
    );

    var steamX = left + Math.floor(span * 0.43);
    for (var puff = 0; puff < 7; puff += 1) {
      var puffAge = (time * 0.75 * activity + puff * 0.73) % 6;
      var puffDrift = Math.sin(time * 0.4 + puff * 2.1) * puffAge * 0.45;
      ctx.globalAlpha = clamp(0.62 - puffAge * 0.085, 0.08, 0.62);
      pixelRect(steamX + puffDrift, deck - 59 - puffAge * 2, 1, 1, palette.bubble);
      if (puffAge > 2.5) pixelRect(steamX + puffDrift + 2, deck - 60 - puffAge * 2, 1, 1, palette.foam);
    }
    ctx.globalAlpha = 1;

    var flagFrame = Math.floor(time * 4 * activity) % 3;
    var flagMasks = [
      ["11   ", "1111 ", "11   "],
      ["111  ", " 1111", "111  "],
      ["1111 ", "11 11", "1111 "]
    ];
    drawPixelMask(
      towerX + 5,
      deck - 101,
      flagMasks[flagFrame] || flagMasks[0],
      { "1": palette.planetLight },
      false
    );

    var beaconPhase = events ? (events.beacon ? Math.floor(time * 5) % 3 : 9) : Math.floor(time * 3 * activity) % 8;
    if (beaconPhase < 3) {
      pixelRect(towerX + 3 + beaconPhase - 1, deck - 99 - Math.abs(beaconPhase - 1), 1, 1, palette.lamp);
    }
    if (events) {
      var doorX = left + events.doorX * span;
      var doorHeight = Math.max(1, Math.round(events.doorOpen * 5));
      pixelRect(doorX, deck - 7, 5, 7, palette.steelDark);
      if (doorHeight > 1) pixelRect(doorX + 1, deck - doorHeight, 3, doorHeight, palette.abyss);

      if (events.fishingActive) {
        var fishingX = left + events.fishingX * span;
        var fishingEndY = geometry.line + events.fishingDepth * Math.max(18, geometry.foundationTop - geometry.line);
        var previousFishingX = fishingX;
        var previousFishingY = deck - 1;
        for (var lineStep = 1; lineStep <= 9; lineStep += 1) {
          var lineAmount = lineStep / 9;
          var nextFishingX = fishingX + Math.sin(time * 0.31 + lineAmount * 2.8) * events.fishingSway * 10 * lineAmount;
          var nextFishingY = lerp(deck - 1, fishingEndY, lineAmount);
          pixelLine(previousFishingX, previousFishingY, nextFishingX, nextFishingY, palette.steel, 1);
          previousFishingX = nextFishingX;
          previousFishingY = nextFishingY;
        }
        pixelRect(previousFishingX, previousFishingY, 1, 1, palette.lamp);
      }
    }
  }

  function drawBuildingWindow(x, y, lit, palette, seed) {
    var damaged = hash(seed * 3.17) > 0.89;
    drawPixelMask(
      x - 1,
      y - 1,
      damaged
        ? ["111111111", "1222122 1", "12 212221", "133313331", "1111 1111"]
        : ["111111111", "122212221", "122212221", "133313331", "111111111"],
      {
        "1": palette.steel,
        "2": lit ? palette.lamp : palette.abyss,
        "3": palette.steelDark
      },
      false
    );
  }

  function drawPlatformDistress(time, palette, geometry, left, right, deck, blockLeft, mainBlockWidth, upperBlockLeft, upperBlockWidth, towerX) {
    var scars = [
      { x: blockLeft + 18, y: deck - 33, mask: ["1  1 ", " 11 1", "1   1"] },
      { x: blockLeft + Math.floor(mainBlockWidth * 0.54), y: deck - 15, mask: [" 1 1", "1 1 ", "  1 "] },
      { x: upperBlockLeft + Math.floor(upperBlockWidth * 0.38), y: deck - 52, mask: ["1  1", " 11 ", "1  1"] }
    ];
    for (var scar = 0; scar < scars.length; scar += 1) {
      drawPixelMask(scars[scar].x, scars[scar].y, scars[scar].mask, { "1": palette.abyss }, scar % 2 === 1);
    }

    drawPixelMask(
      blockLeft + Math.floor(mainBlockWidth * 0.72),
      deck - 32,
      ["1111111", "1222221", "1211121", "1222221", "1111111"],
      { "1": palette.steelDark, "2": palette.steel },
      false
    );
    drawPixelMask(
      upperBlockLeft + upperBlockWidth - 18,
      deck - 50,
      ["111111", "12  21", "122221", "1 11 1", "111111"],
      { "1": palette.timberLight, "2": palette.steelDark },
      false
    );

    for (var roofX = blockLeft + 3; roofX < right - 9; roofX += 7) {
      var roofDent = hash(roofX * 0.71) > 0.78 ? 1 : 0;
      drawPixelMask(
        roofX,
        deck - 40 + roofDent,
        roofDent ? ["111  ", " 1111"] : ["11111", " 2 2 "],
        { "1": palette.steel, "2": palette.steelDark },
        false
      );
    }

    for (var p = 0; p < geometry.pylons.length; p += 3) {
      var rustY = deck + 13 + (p * 17) % Math.max(8, geometry.line - deck - 18);
      drawPixelMask(
        geometry.pylons[p] - 2,
        rustY,
        ["1  ", " 1 ", "  1", " 1 "],
        { "1": palette.planetDark },
        p % 2 === 1
      );
    }

    var dishSweep = -0.8 + Math.sin(time * 0.19) * 0.28;
    pixelLine(towerX + 3, deck - 39, towerX + 3, deck - 47, palette.steel, 1);
    pixelArc(towerX + 3, deck - 47, 6, dishSweep, dishSweep + Math.PI * 0.72, palette.steel, 1);
    pixelRect(towerX + 3, deck - 47, 1, 1, palette.lamp);

    drawPixelMask(
      left + 13,
      deck - 46,
      ["1     1", " 11 11 ", "  111  ", " 2   2 "],
      { "1": palette.steelDark, "2": palette.timberLight },
      false
    );
  }

  function drawPlatform(time, palette, geometry) {
    ctx.save();
    ctx.translate(Math.round(structure.sway), Math.round(structure.sag));
    var left = geometry.left;
    var right = geometry.right;
    var deck = geometry.deck;
    var span = right - left;

    moduleSpan(left, deck, span, 9, palette.timber, palette.timberLight, palette.steelDark, 211, 10);
    moduleSpan(left - 3, deck - 2, span + 3, 3, palette.timberLight, palette.foam, palette.timber, 223, 8);

    for (var p = 0; p < geometry.pylons.length; p += 1) {
      var px = Math.floor(geometry.pylons[p]);
      ctx.fillStyle = palette.steelDark;
      ctx.fillRect(px - 2, deck + 8, 6, geometry.line - deck - 7);
      ctx.fillStyle = palette.steel;
      ctx.fillRect(px - 1, deck + 9, 2, geometry.line - deck - 8);
    }

    var blockLeft = left + Math.floor(span * 0.28);
    var mainBlockWidth = Math.floor(span - (blockLeft - left) - 7);
    var upperBlockLeft = left + Math.floor(span * 0.48);
    var upperBlockWidth = Math.floor(span * 0.31);
    panelBlock(
      blockLeft, deck - 35, mainBlockWidth, 35,
      palette.timber, palette.timberLight, palette.steelDark, 241
    );
    panelBlock(
      upperBlockLeft, deck - 54, upperBlockWidth, 20,
      palette.timber, palette.timberLight, palette.steelDark, 251
    );
    moduleSpan(
      blockLeft - 2, deck - 38, mainBlockWidth + 4, 4,
      palette.timberLight, palette.foam, palette.timber, 257, 9
    );
    moduleSpan(
      upperBlockLeft - 2, deck - 57, upperBlockWidth + 4, 4,
      palette.timberLight, palette.foam, palette.timber, 263, 9
    );

    var roomIndex = 0;
    for (var floor = 0; floor < 3; floor += 1) {
      var wy = deck - 29 + floor * 10;
      for (var wx = blockLeft + 7; wx < right - 12; wx += 14) {
        var lit = hash(wx * 0.13 + floor * 9 + Math.floor(time / 55)) > 0.23;
        if (platformLife && AmbientLife) {
          var roomOffset = (roomIndex % platformLife.roomCount) * AmbientLife.ROOM_STRIDE;
          lit = platformLife.rooms[roomOffset + AmbientLife.ROOM_FIELDS.lit] > 0.5 &&
            platformLife.rooms[roomOffset + AmbientLife.ROOM_FIELDS.flicker] < 0.5;
        }
        if (
          structure.stress > 0.72 &&
          hash(wx * 0.37 + floor * 13 + Math.floor(time / 6)) < (structure.stress - 0.72) * 0.18
        ) lit = false;
        drawBuildingWindow(wx, wy, lit, palette, wx + floor * 31);
        roomIndex += 1;
      }
    }

    var towerX = left + Math.floor(span * 0.62);
    moduleSpan(towerX, deck - 86, 7, 31, palette.steel, palette.timberLight, palette.steelDark, 271, 7);
    moduleSpan(towerX - 18, deck - 84, 42, 3, palette.steel, palette.timberLight, palette.steelDark, 277, 7);
    pixelLine(towerX + 3, deck - 91, towerX + 3, deck - 85, palette.steel, 2);
    moduleSpan(towerX - 15, deck - 94, 36, 3, palette.steel, palette.timberLight, palette.steelDark, 281, 6);
    pixelRect(towerX + 2, deck - 96, 2, 2, palette.lamp);

    var padY = deck - 48;
    moduleSpan(
      left + 6, padY, Math.floor(span * 0.24), 3,
      palette.steel, palette.timberLight, palette.steelDark, 293, 8
    );
    pixelLine(left + 10, padY + 3, left + 10, deck - 1, palette.steelDark, 3);
    moduleSpan(
      left + Math.floor(span * 0.79), deck - 68, Math.floor(span * 0.2), 3,
      palette.steel, palette.timberLight, palette.steelDark, 307, 8
    );

    drawPlatformDistress(
      time, palette, geometry, left, right, deck,
      blockLeft, mainBlockWidth, upperBlockLeft, upperBlockWidth, towerX
    );

    var platformPeople = platformResidentCount();
    var residentPose = {};
    for (var i = 0; i < platformPeople; i += 1) {
      platformResidentPose(i, time, geometry, residentPose);
      drawResidentFlashlight(residentPose, palette, geometry, time);
      drawPerson(
        residentPose.x,
        residentPose.deck,
        residentPose.phase,
        i % 3 === 0 ? palette.kelp : palette.foam,
        residentPose.direction,
        residentPose.role,
        residentPose.action
      );
    }
    if (structure.integrity < 0.985) {
      ctx.fillStyle = palette.lamp;
      ctx.fillRect(Math.floor(left + span * 0.58 + 4), deck - 1, 2, 1);
    }
    drawPlatformMotion(time, palette, geometry, left, span, deck, towerX);
    ctx.restore();
  }

  function updateRaft(dt, time, line) {
    if (!raft.y) raft.y = surfaceY(raft.x + 14, time, line, raft.x) - 4;
    var localFlow = sampleFluid(raft.x + 14, line + 7);
    var currentInfluence = clamp(localFlow.x - 0.25, -1.2, 1.2) * 0.08;
    var targetVelocity = clamp(0.8 + currentInfluence + environment.wind * 0.018, 0.68, 0.94);
    raft.vx += (targetVelocity - raft.vx) * dt * 0.32;
    raft.x += raft.vx * dt;

    var targetY = surfaceY(raft.x + 14, time, line, raft.x) - 4;
    var lift = (targetY - raft.y) * 5.2 - raft.vy * 3.1;
    raft.vy += lift * dt;
    raft.y += raft.vy * dt;

    var slope = (
      surfaceY(raft.x + 27, time, line, raft.x) -
      surfaceY(raft.x, time, line, raft.x)
    ) / 27;
    var angleForce = (slope - raft.angle) * 3.2 - raft.angularVelocity * 2.5;
    raft.angularVelocity += angleForce * dt;
    raft.angle += raft.angularVelocity * dt;
    disturbSurface(raft.x + 27, -raft.vx * dt * 0.38 - raft.vy * dt * 0.22, 8);
    disturbSurface(raft.x + 1, raft.vx * dt * 0.24, 7);

    if (screenToWorldX(raft.x) > activeWorldRight() + 62) {
      raft.x = worldToScreenX(activeWorldLeft() - 58);
      raft.y = surfaceY(raft.x + 14, time, line, raft.x) - 4;
      raft.vy = 0;
      raft.angle = 0;
    }
  }

  function raftPose() {
    var centerX = Math.round(raft.x + 14);
    var centerY = Math.round(raft.y + 2);
    var steppedAngle = Math.round(clamp(raft.angle, -0.16, 0.16) * 12) / 12;
    var leftY = centerY - Math.round(steppedAngle * 14);
    var rightY = centerY + Math.round(steppedAngle * 15);
    return { centerX: centerX, centerY: centerY, leftY: leftY, rightY: rightY };
  }

  function raftYAt(pose, offset) {
    return Math.round(lerp(pose.leftY, pose.rightY, (offset + 14) / 29));
  }

  function drawRaftUnder(palette) {
    var pose = raftPose();
    for (var offset = -15; offset <= 15; offset += 1) {
      var edge = Math.abs(offset);
      var hullDepth = edge > 13 ? 2 : edge > 10 ? 3 : 4;
      var hullY = raftYAt(pose, offset);
      var hullColor = offset % 5 === 0 ? palette.timberLight : palette.timber;
      pixelRect(pose.centerX + offset, hullY, 1, hullDepth, hullColor);
      if (hullDepth > 2 && (offset + 15) % 6 === 0) {
        pixelRect(pose.centerX + offset, hullY + hullDepth - 1, 1, 1, palette.steelDark);
      }
    }
    pixelLine(pose.centerX - 11, raftYAt(pose, -11) + 3, pose.centerX + 11, raftYAt(pose, 11) + 3, palette.steelDark, 1);
  }

  function drawRaftWake(time, palette, line) {
    var pose = raftPose();
    var sternX = pose.centerX - 16;
    var sternSurfaceY = surfaceY(sternX, time, line, raft.x);
    ctx.globalAlpha = 0.58;
    pixelRect(sternX - 1, sternSurfaceY - 1, 1, 1, palette.foam);
    pixelRect(sternX - 2, sternSurfaceY, 1, 1, palette.bubble);
    pixelRect(sternX - 4, surfaceY(sternX - 4, time, line, raft.x), 1, 1, palette.foam);

    for (var bubble = 0; bubble < 4; bubble += 1) {
      var age = (time * (0.12 + bubble * 0.008) + bubble * 0.237) % 1;
      var bubbleX = sternX - 2 - age * (7 + bubble * 2);
      var wakeSurfaceY = surfaceY(bubbleX, time, line, raft.x);
      var bubbleY = wakeSurfaceY + 2 + age * (2 + bubble * 0.55) +
        Math.sin(time * 0.32 + bubble * 1.9) * 0.45;
      ctx.globalAlpha = (1 - age) * 0.34;
      pixelRect(bubbleX, bubbleY, 1, 1, palette.bubble);
    }
    ctx.globalAlpha = 1;
  }

  function drawRaftAbove(time, palette) {
    var pose = raftPose();
    for (var deckOffset = -15; deckOffset <= 15; deckOffset += 1) {
      var deckY = raftYAt(pose, deckOffset);
      pixelRect(
        pose.centerX + deckOffset,
        deckY - 1,
        1,
        2,
        deckOffset % 5 === 0 ? palette.timber : palette.timberLight
      );
    }
    drawPixelMask(
      pose.centerX - 16,
      raftYAt(pose, -15) - 1,
      [" 11", "111"],
      { "1": palette.timberLight },
      false
    );
    drawPixelMask(
      pose.centerX + 14,
      raftYAt(pose, 15) - 1,
      ["11 ", "111"],
      { "1": palette.timberLight },
      false
    );
    var tieOffsets = [-11, -4, 3, 10, 14];
    for (var tie = 0; tie < tieOffsets.length; tie += 1) {
      var tieOffset = tieOffsets[tie];
      pixelRect(pose.centerX + tieOffset, raftYAt(pose, tieOffset) - 1, 1, 2, palette.foam);
    }
    var mastY = raftYAt(pose, 4);
    pixelLine(pose.centerX + 4, mastY, pose.centerX + 4, mastY - 11, palette.timber, 1);
    drawPixelMask(
      pose.centerX + 5,
      mastY - 11,
      ["1      ", "111    ", "11111  ", "1111111", "  2  2 "],
      { "1": palette.foam, "2": palette.steel },
      false
    );
    var people = [
      { offset: -5, phase: time * 0.82, color: palette.foam, facing: 1, role: "guest" },
      { offset: 7, phase: time * 0.72 + 2, color: palette.android, facing: -1, role: "worker" }
    ];
    for (var i = 0; i < people.length; i += 1) {
      var person = people[i];
      drawPerson(
        pose.centerX + person.offset,
        raftYAt(pose, person.offset) - 1,
        person.phase,
        person.color,
        person.facing,
        person.role
      );
    }
  }

  function updateCarpet(dt, time, line) {
    var targetY = line - 52 + Math.sin(time * 0.45) * 5 + environment.wind * 0.7;
    if (time < carpet.waitingUntil) {
      carpet.x = worldToScreenX(activeWorldRight() + 120);
      carpet.y = targetY;
      carpet.vx = 0;
      carpet.vy = 0;
      return;
    }
    var targetSpeed = -3.2 * tuning.carpetSpeed - environment.wind * 0.34;
    carpet.vx += (targetSpeed - carpet.vx) * dt * 1.4;
    carpet.vy += (targetY - carpet.y) * dt * 1.8 - carpet.vy * dt * 1.5;
    carpet.x += carpet.vx * dt;
    carpet.y += carpet.vy * dt;
    if (screenToWorldX(carpet.x) < activeWorldLeft() - 65) {
      carpet.passIndex += 1;
      carpet.waitingUntil = time + 18 + hash(carpet.passIndex * 17.3 + 4.8) * 25;
      carpet.x = worldToScreenX(activeWorldRight() + 120);
      carpet.y = targetY;
      carpet.vx = 0;
      carpet.vy = 0;
    }
  }

  function drawCarpet(time, palette, line) {
    var x = carpet.x;
    var y = carpet.y;
    drawPixelMask(
      x,
      y,
      [
        "  111111111111111111111  ",
        "112222322223222232222211",
        "  111111111111111111111  ",
        " 4 4 4 4 4 4 4 4 4 4 4 "
      ],
      { "1": palette.planetLight, "2": palette.kelp, "3": palette.lamp, "4": palette.plankton },
      false
    );

    var raulX = x + 9;
    var raulStep = Math.sin(time * 1.2) > 0 ? 1 : -1;
    pixelRect(raulX, y - 6, 2, 2, palette.foam);
    pixelRect(raulX, y - 4, 2, 3, palette.foam);
    pixelRect(raulX - raulStep, y - 1, 1, 3, palette.foam);
    pixelRect(raulX + 1 + raulStep, y - 1, 1, 3, palette.foam);
    pixelRect(raulX, y - 5, 1, 1, palette.abyss);

    ctx.globalAlpha = 0.55;
    for (var i = 0; i < 8; i += 1) {
      pixelRect(x + 25 + i * 2, y + 1 + Math.sin(i + time * 1.2) * 2, 1, 1, palette.plankton);
    }
    ctx.globalAlpha = 1;
  }

  function drawPortal(time, palette, line) {
    var x = Math.floor(worldToScreenX(48));
    var gateY = line + 5;
    ctx.globalAlpha = 0.52;
    pixelArc(x, gateY, 58, Math.PI, Math.PI * 2, palette.steelDark, 5);
    ctx.globalAlpha = 0.64;
    pixelArc(x, gateY, 55, Math.PI, Math.PI * 2, palette.steel, 2);
    ctx.globalAlpha = 0.36 + Math.sin(time * 0.3) * 0.08;
    pixelArc(x, gateY, 47, Math.PI, Math.PI * 2, palette.bubble, 1);
    for (var marker = 0; marker < 13; marker += 1) {
      var angle = Math.PI + (marker / 12) * Math.PI;
      var pulse = (Math.sin(time * 0.82 + marker * 0.91) + 1) * 0.5;
      ctx.globalAlpha = 0.16 + pulse * 0.46;
      pixelRect(x + Math.cos(angle) * 52, gateY + Math.sin(angle) * 52, 1, 1, palette.foam);
    }
    ctx.globalAlpha = 1;
  }

  function drawWorld(time, dt) {
    var palette = PALETTES[mode];
    var geometry = platformGeometry();
    if (ecology) ecologyEvent = ecologyPreviewEvent || ecology.updateEvents(time);
    updateEnvironment(dt, time);
    updateSurface(dt, time);
    updateRain(dt, time, geometry);
    updateRaft(dt, time, geometry.line);
    updateLeviathans(dt, time, geometry);
    updateColossalTendrils(dt, time, geometry.line);
    updateCarpet(dt, time, geometry.line);
    var actors = {
      raftX: raft.x,
      raftY: raft.y,
      raftVX: raft.vx,
      raftVY: raft.vy,
      leviathans: leviathans,
      swimmers: swimmers
    };

    updateDeepBodyDescriptors(time, geometry);
    if (platformLife && AmbientLife) {
      var raftProximity = clamp(1 - Math.abs((raft.x + 14) - geometry.left) / 190, 0, 1);
      var raulProximity = clamp(1 - Math.abs((carpet.x + 12) - geometry.left) / 180, 0, 1);
      var creatureProximity = 0;
      for (var platformCreature = 0; platformCreature < leviathans.length; platformCreature += 1) {
        creatureProximity = Math.max(
          creatureProximity,
          clamp(1 - Math.abs(leviathans[platformCreature].x - geometry.left) / 220, 0, 1) *
            clamp(1 - Math.abs(leviathans[platformCreature].y - geometry.line) / 170, 0, 1)
        );
      }
      if (ecologyEvent && ecologyEvent.active && ecologyEvent.type === "shadowPassage") {
        creatureProximity = Math.max(creatureProximity, ecologyEvent.intensity * 0.9);
      }
      AmbientLife.updatePlatformState(platformLife, time, {
        activity: tuning.platformActivity,
        storm: environment.storm,
        night: 0.82,
        raftProximity: raftProximity,
        raulProximity: raulProximity,
        creatureProximity: creatureProximity,
        structureStress: structure.stress
      });
    }

    updateFluid(dt, time, geometry, actors);
    updateStructure(dt, geometry);
    updateMooring(dt, time, geometry);
    updateSediment(dt, geometry);
    updateSwimmers(dt, time, geometry, actors);
    updateParticles(dt, time, geometry, actors);
    drawSky(time, palette, geometry.line);
    drawWeather(time, palette, geometry.line);
    drawRainDrops(palette);
    drawPortal(time, palette, geometry.line);
    drawWater(time, palette, geometry.line, raft.x);
    drawCaustics(time, palette, geometry);
    drawBackgroundTitans(time, palette, geometry.line);
    drawRareEcology(time, palette, geometry);
    drawColossalEncounters(time, palette, geometry.line);
    drawSubstructure(time, palette, geometry);
    drawLeviathans(time, palette);
    drawFluidMaterial(palette);
    drawSwimmers(time, palette);
    drawParticles(palette);
    drawMooringUnder(palette);
    drawRaftUnder(palette);
    drawSurface(time, palette, geometry.line, raft.x);
    drawRainSplashes(time, palette, geometry);
    drawRaftWake(time, palette, geometry.line);
    drawMooringAbove(palette);
    drawPlatform(time, palette, geometry);
    drawRaftAbove(time, palette);
    drawCarpet(time, palette, geometry.line);
  }

  function resize() {
    resizeRequest = 0;
    var nextWidth = Math.max(1, Math.ceil(window.innerWidth / ART_PIXEL));
    var nextHeight = Math.max(1, Math.ceil(window.innerHeight / ART_PIXEL));
    if (nextWidth === width && nextHeight === height && canvas.width === width && canvas.height === height) return;
    var oldCameraX = cameraX;
    var oldWidth = width;
    var oldHeight = height;
    var oldLine = fluid ? fluid.line : waterlineY();
    var oldFluid = fluid;
    var oldSurface = surface;
    var oldParticles = particles;
    var oldSwimmers = swimmers;
    var oldDeposits = deposits;
    var hadWorld = !!fluid;

    width = nextWidth;
    height = nextHeight;
    cameraX = (REFERENCE_WIDTH - width) * 0.5;
    var xShift = oldCameraX - cameraX;
    var newLine = waterlineY();
    var yShift = newLine - oldLine;
    canvas.width = width;
    canvas.height = height;
    inspectMaskCanvas.width = width;
    inspectMaskCanvas.height = height;
    inspectionOutlineCache.ready = false;
    canvas.style.width = width * ART_PIXEL + "px";
    canvas.style.height = height * ART_PIXEL + "px";
    ctx.imageSmoothingEnabled = false;
    buildWaterTexture(PALETTES[mode], newLine);
    createSurface();
    if (oldSurface) {
      for (var surfaceCol = 0; surfaceCol < surface.cols; surfaceCol += 1) {
        var newScreenX = surfaceCol * SURFACE_CELL;
        var oldScreenX = newScreenX + cameraX - oldCameraX;
        var oldGridX = oldScreenX / SURFACE_CELL;
        if (oldGridX < 0 || oldGridX > oldSurface.cols - 1) continue;
        surface.height[surfaceCol] = sampleGridArray(
          oldSurface.height,
          oldSurface.cols,
          1,
          oldGridX,
          0
        );
        surface.velocity[surfaceCol] = sampleGridArray(
          oldSurface.velocity,
          oldSurface.cols,
          1,
          oldGridX,
          0
        );
      }
    }

    createFluid(platformGeometry());
    if (oldFluid) {
      var fields = ["u", "v", "dye", "nutrient", "plankton"];
      for (var row = 0; row < fluid.rows; row += 1) {
        for (var col = 0; col < fluid.cols; col += 1) {
          var index = fluidIndex(col, row);
          if (fluid.solid[index]) continue;
          var oldFluidScreenX = col * FLUID_CELL + cameraX - oldCameraX;
          var oldFluidGridX = oldFluidScreenX / FLUID_CELL;
          if (row > oldFluid.rows - 1 || oldFluidGridX < 0 || oldFluidGridX > oldFluid.cols - 1) continue;
          for (var field = 0; field < fields.length; field += 1) {
            var fieldName = fields[field];
            fluid[fieldName][index] = sampleGridArray(
              oldFluid[fieldName],
              oldFluid.cols,
              oldFluid.rows,
              oldFluidGridX,
              row
            );
          }
        }
      }
    }

    createParticles();
    if (oldParticles && oldParticles.length) {
      for (var particle = 0; particle < Math.min(particles.length, oldParticles.length); particle += 1) {
        particles[particle] = oldParticles[particle];
        particles[particle].x += xShift;
        particles[particle].y += yShift;
      }
    }
    if (hadWorld && (width > oldWidth || height > oldHeight)) {
      var particleBandWidth = Math.max(0, (width - oldWidth) * 0.5);
      var particleBandTop = oldLine + oldHeight - oldLine + yShift;
      for (var newParticle = oldParticles.length; newParticle < particles.length; newParticle += 1) {
        if (particleBandWidth > 0 && (height <= oldHeight || newParticle % 3 !== 0)) {
          var particleOnLeft = newParticle % 2 === 0;
          particles[newParticle].x = particleOnLeft
            ? hash(newParticle * 7.7) * particleBandWidth
            : width - particleBandWidth + hash(newParticle * 11.3) * particleBandWidth;
        } else if (height > oldHeight) {
          particles[newParticle].x = hash(newParticle * 7.7) * width;
          particles[newParticle].y = clamp(
            particleBandTop + hash(newParticle * 13.9) * (height - particleBandTop),
            newLine + 6,
            height - 5
          );
        }
      }
    }
    createSwimmers();
    if (oldSwimmers && oldSwimmers.length) {
      for (var swimmer = 0; swimmer < Math.min(swimmers.length, oldSwimmers.length); swimmer += 1) {
        swimmers[swimmer] = oldSwimmers[swimmer];
        swimmers[swimmer].x += xShift;
        swimmers[swimmer].y += yShift;
        if (swimmers[swimmer].tentacles) {
          swimmers[swimmer].tentacles.forEach(function (chain) {
            chain.points.forEach(function (point) {
              point.x += xShift;
              point.y += yShift;
            });
            chain.previous.forEach(function (point) {
              point.x += xShift;
              point.y += yShift;
            });
          });
        }
      }
    }
    if (hadWorld && (width > oldWidth || height > oldHeight)) {
      var swimmerBandWidth = Math.max(0, (width - oldWidth) * 0.5);
      var swimmerBandTop = oldHeight + yShift;
      for (var newSwimmer = oldSwimmers.length; newSwimmer < swimmers.length; newSwimmer += 1) {
        if (swimmerBandWidth > 0 && (height <= oldHeight || newSwimmer % 3 !== 0)) {
          var swimmerOnLeft = newSwimmer % 2 === 0;
          swimmers[newSwimmer].x = swimmerOnLeft
            ? hash(newSwimmer * 5.9) * swimmerBandWidth
            : width - swimmerBandWidth + hash(newSwimmer * 9.7) * swimmerBandWidth;
        } else if (height > oldHeight) {
          swimmers[newSwimmer].x = hash(newSwimmer * 5.9) * width;
          swimmers[newSwimmer].y = clamp(
            swimmerBandTop + hash(newSwimmer * 12.1) * (height - swimmerBandTop),
            newLine + 12,
            height - 6
          );
        }
      }
    }
    createDeposits();
    if (oldDeposits) {
      for (var deposit = 0; deposit < deposits.length; deposit += 1) {
        var oldDepositScreenX = deposit * 2 + cameraX - oldCameraX;
        var oldDepositGridX = oldDepositScreenX / 2;
        if (oldDepositGridX < 0 || oldDepositGridX > oldDeposits.length - 1) continue;
        deposits[deposit] = sampleGridArray(
          oldDeposits,
          oldDeposits.length,
          1,
          oldDepositGridX,
          0
        );
      }
    }

    if (hadWorld) {
      raft.x += xShift;
      raft.y += yShift;
      for (var leviathanIndex = 0; leviathanIndex < leviathans.length; leviathanIndex += 1) {
        leviathans[leviathanIndex].x += xShift;
        leviathans[leviathanIndex].y += yShift;
      }
      carpet.x += xShift;
      carpet.y += yShift;
      mooring.buoyX += xShift;
      mooring.buoyY += yShift;
      for (var point = 0; point < mooring.points.length; point += 1) {
        mooring.points[point].x += xShift;
        mooring.points[point].y += yShift;
        mooring.previous[point].x += xShift;
        mooring.previous[point].y += yShift;
      }
    } else {
      mooring.initialized = false;
      raft.x = worldToScreenX(-42);
      carpet.x = worldToScreenX(470);
      for (var initialLeviathan = 0; initialLeviathan < leviathans.length; initialLeviathan += 1) {
        leviathans[initialLeviathan].x = worldToScreenX(leviathans[initialLeviathan].worldStart);
        leviathans[initialLeviathan].y = newLine + (height - newLine) * leviathans[initialLeviathan].depth;
      }
      raft.y = surfaceY(raft.x + 14, 0, newLine, raft.x) - 4;
      carpet.y = newLine - 52;
    }
    if (window.__mareDebug) {
      canvas.dataset.worldState = JSON.stringify(window.__mareDebug.snapshot());
    }
    if (glossaryOpen && glossaryPosition) {
      positionGlossary(glossaryPosition.left, glossaryPosition.top, false);
    }
  }

  function scheduleResize() {
    if (resizeRequest) return;
    resizeRequest = window.requestAnimationFrame(resize);
  }

  function setMode(nextMode) {
    if (!PALETTES[nextMode]) return;
    mode = nextMode;
    buildWaterTexture(PALETTES[mode], waterlineY());
    shell.classList.remove("mode-a", "mode-b", "mode-c");
    shell.classList.add("mode-" + nextMode.toLowerCase());
    document.querySelectorAll("[data-mode]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.mode === nextMode);
    });
    setTuning("density", DENSITY_PROFILES[nextMode]);
  }

  function rebalanceSeaLife() {
    var previousParticles = particles;
    var previousSwimmers = swimmers;
    createParticles();
    for (var particle = 0; particle < Math.min(particles.length, previousParticles.length); particle += 1) {
      particles[particle] = previousParticles[particle];
    }
    createSwimmers();
    for (var swimmer = 0; swimmer < Math.min(swimmers.length, previousSwimmers.length); swimmer += 1) {
      swimmers[swimmer] = previousSwimmers[swimmer];
    }
  }

  function setTuning(name, value) {
    if (!Object.prototype.hasOwnProperty.call(tuning, name)) return;
    var nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    var previousValue = tuning[name];
    tuning[name] = nextValue;
    if (name === "seaLife" || name === "density") rebalanceSeaLife();
    if (name === "waveEnergy" && surface && previousValue > 0) {
      var scale = nextValue / previousValue;
      for (var i = 0; i < surface.height.length; i += 1) {
        surface.height[i] = clamp(surface.height[i] * scale, -8.5, 8.5);
        surface.velocity[i] *= clamp(scale, 0.6, 1.7);
      }
    }
    var output = document.querySelector('[data-tuning-output="' + name + '"]');
    if (output) {
      output.textContent = (name === "density" ? nextValue.toFixed(2).replace(/0$/, "") : nextValue.toFixed(1)) + "×";
    }
    var input = document.querySelector('[data-tuning="' + name + '"]');
    if (input) {
      if (Number(input.value) !== nextValue) input.value = String(nextValue);
      input.setAttribute("aria-valuetext", output ? output.textContent : String(nextValue));
    }
  }

  function showInterface() {
    if (screensaverMode) {
      shell.classList.add("ui-hidden");
      return;
    }
    shell.classList.remove("ui-hidden");
    window.clearTimeout(uiTimer);
    uiTimer = window.setTimeout(function () {
      if (!glossaryOpen && !inspectHeld) shell.classList.add("ui-hidden");
    }, 5500);
  }

  function pointerPosition(event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height
    };
  }

  function trackPointer(event, position) {
    var nextPosition = position || pointerPosition(event);
    pointer.x = nextPosition.x;
    pointer.y = nextPosition.y;
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.inside = true;
  }

  function stirWater(event, firstContact) {
    var position = pointerPosition(event);
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.inside = true;
    var line = waterlineY();
    if (position.y < line - 5) {
      pointer.x = position.x;
      pointer.y = position.y;
      return;
    }
    var dx = firstContact ? 0 : position.x - pointer.x;
    var dy = firstContact ? 0 : position.y - pointer.y;
    injectFluid(
      position.x,
      Math.max(line + 1, position.y),
      clamp(dx * 0.7, -3.4, 3.4),
      clamp(dy * 0.7, -3.4, 3.4),
      firstContact ? 18 : 27,
      firstContact ? 0.72 : 0.28
    );
    if (Math.abs(position.y - surfaceY(position.x, 0, line, raft.x)) < 24) {
      disturbSurface(position.x, firstContact ? -1.25 : clamp(dy * 0.12, -1.8, 1.8), firstContact ? 13 : 9);
    }
    if (firstContact && Math.abs(position.y - line) < 20 && ripples.length < 18) {
      ripples.push({ x: position.x, age: 0, amp: 1.45 });
    }
    pointer.x = position.x;
    pointer.y = position.y;
  }

  function render(now) {
    frameRequest = 0;
    var dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    simulationTime += dt;
    drawWorld(simulationTime, dt);
    drawInspectionOutline(simulationTime);
    updateInspector(simulationTime);
    scheduleFrame();
  }

  function scheduleFrame() {
    if (frameRequest || document.hidden) return;
    frameRequest = window.requestAnimationFrame(render);
  }

  function pauseRendering() {
    if (frameRequest) window.cancelAnimationFrame(frameRequest);
    frameRequest = 0;
  }

  function resumeRendering() {
    lastFrame = performance.now();
    scheduleFrame();
  }

  if (glossaryToggle) {
    glossaryToggle.addEventListener("click", function () {
      setGlossaryOpen(!glossaryOpen);
    });
  }
  if (welcomeOpen) {
    welcomeOpen.addEventListener("click", function () {
      setWelcomeOpen(true, false);
    });
  }
  if (welcomeEnter) {
    welcomeEnter.addEventListener("click", function () {
      setWelcomeOpen(false, true);
    });
  }
  if (glossaryPin) {
    glossaryPin.addEventListener("click", function () {
      setGlossaryPinned(!glossaryPinned);
      showInterface();
    });
  }
  if (glossaryHeader) {
    glossaryHeader.addEventListener("pointerdown", beginGlossaryDrag);
    glossaryHeader.addEventListener("pointermove", moveGlossary);
    glossaryHeader.addEventListener("pointerup", endGlossaryDrag);
    glossaryHeader.addEventListener("pointercancel", endGlossaryDrag);
  }
  var glossaryClose = document.querySelector("[data-glossary-close]");
  if (glossaryClose) {
    glossaryClose.addEventListener("click", function () {
      setGlossaryOpen(false);
      if (glossaryToggle) glossaryToggle.focus({ preventScroll: true });
    });
  }

  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      setMode(button.dataset.mode);
      showInterface();
    });
  });

  document.querySelectorAll("[data-tuning]").forEach(function (input) {
    input.addEventListener("input", function () {
      if (screensaverMode) return;
      setTuning(input.dataset.tuning, input.value);
      showInterface();
    });
  });

  window.addEventListener("keydown", function (event) {
    if (screensaverMode) return;
    var key = event.key.toUpperCase();
    var interactive = event.target && event.target.closest &&
      event.target.closest("input, textarea, select, button, [contenteditable='true'], [role='button']");
    if (welcome && !welcome.hidden && key === "TAB") {
      event.preventDefault();
      if (welcomeEnter) welcomeEnter.focus({ preventScroll: true });
      return;
    }
    if (event.key === "Control" && !interactive) {
      inspectHeld = true;
      shell.classList.add("is-inspecting");
      showInterface();
    }
    if (key === "G" && !interactive && !event.repeat) {
      setGlossaryOpen(!glossaryOpen);
      event.preventDefault();
    }
    if (key === "ESCAPE" && welcome && !welcome.hidden) {
      setWelcomeOpen(false, true);
      event.preventDefault();
    } else if (key === "ESCAPE" && glossaryOpen) {
      setGlossaryOpen(false);
      if (glossaryToggle) glossaryToggle.focus({ preventScroll: true });
    }
    if (!interactive && (key === "A" || key === "B" || key === "C")) setMode(key);
    if (!interactive && key === "F") document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    if (!interactive && key === "H") shell.classList.toggle("ui-hidden");
    if (!interactive && key === "S") environment.forcedStorm = 12;
  });
  window.addEventListener("keyup", function (event) {
    if (event.key !== "Control") return;
    inspectHeld = false;
    shell.classList.remove("is-inspecting");
    hideInspector();
    showInterface();
  });
  window.addEventListener("blur", function () {
    inspectHeld = false;
    pointer.down = false;
    shell.classList.remove("is-inspecting");
    hideInspector();
  });
  function clearTouchInspection() {
    var wasTouchLatched = touchInspectLatched;
    window.clearTimeout(touchInspectTimer);
    window.clearTimeout(touchInspectReleaseTimer);
    touchInspectTimer = 0;
    touchInspectReleaseTimer = 0;
    touchInspectLatched = false;
    if (wasTouchLatched) inspectHeld = false;
    touchInspectStart = null;
    if (!inspectHeld) shell.classList.remove("is-inspecting");
    hideInspector();
  }
  canvas.addEventListener("pointerdown", function (event) {
    if (screensaverMode) return;
    if (event.pointerType !== "mouse") {
      if (touchInspectLatched) {
        inspectHeld = false;
        clearTouchInspection();
        return;
      }
      trackPointer(event);
      touchInspectStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      window.clearTimeout(touchInspectTimer);
      touchInspectTimer = window.setTimeout(function () {
        touchInspectLatched = true;
        inspectHeld = true;
        pointer.down = false;
        shell.classList.add("is-inspecting");
        showInterface();
      }, 520);
    }
    pointer.down = true;
    canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
    stirWater(event, true);
  });
  canvas.addEventListener("pointermove", function (event) {
    if (screensaverMode) return;
    if (touchInspectStart && !touchInspectLatched) {
      var touchDx = event.clientX - touchInspectStart.x;
      var touchDy = event.clientY - touchInspectStart.y;
      if (touchDx * touchDx + touchDy * touchDy > 64) {
        window.clearTimeout(touchInspectTimer);
        touchInspectTimer = 0;
        touchInspectStart = null;
      }
    }
    if (event.ctrlKey && !inspectHeld) {
      inspectHeld = true;
      shell.classList.add("is-inspecting");
    }
    if (pointer.down) stirWater(event, false);
    else trackPointer(event);
  });
  canvas.addEventListener("pointerenter", function (event) {
    if (screensaverMode) return;
    trackPointer(event);
  });
  canvas.addEventListener("pointerleave", function () {
    if (pointer.down) return;
    pointer.inside = false;
    hideInspector();
  });
  canvas.addEventListener("pointerup", function (event) {
    pointer.down = false;
    window.clearTimeout(touchInspectTimer);
    touchInspectTimer = 0;
    touchInspectStart = null;
    if (touchInspectLatched && event.pointerType !== "mouse") {
      touchInspectReleaseTimer = window.setTimeout(clearTouchInspection, 5000);
    }
  });
  canvas.addEventListener("pointercancel", function () {
    pointer.down = false;
    clearTouchInspection();
  });
  canvas.addEventListener("lostpointercapture", function () { pointer.down = false; });
  window.addEventListener("resize", scheduleResize);
  window.addEventListener("pointermove", showInterface, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pauseRendering();
    else resumeRendering();
  });
  window.addEventListener("pagehide", pauseRendering);
  window.addEventListener("pageshow", resumeRendering);

  if (debugMode) window.__mareDebug = {
    identifyAt: function (x, y) {
      var id = inspectionTargetAt(Number(x), Number(y), simulationTime);
      return id ? Object.assign({}, BESTIARY_BY_ID[id]) : null;
    },
    glossaryCount: BESTIARY.length,
    previewRareEvent: function (type, intensity) {
      var allowed = ["jellyBloom", "migration", "feedingFrenzy", "deepQuiet", "distantBreach", "shadowPassage"];
      if (allowed.indexOf(type) < 0) return false;
      ecologyPreviewEvent = {
        active: true,
        type: type,
        name: type,
        intensity: clamp(Number(intensity) || 1, 0, 1),
        phase: 0.5,
        direction: 1,
        x: 0.42,
        depth: type === "shadowPassage" ? 0.72 : 0.42,
        seed: 0.326,
        startedAt: 0,
        endsAt: Infinity
      };
      return true;
    },
    clearRareEventPreview: function () {
      ecologyPreviewEvent = null;
    },
    previewBackgroundTitan: function (type) {
      if (["mountainback", "veilback"].indexOf(type) < 0) return false;
      backgroundTitanPreview = type;
      return true;
    },
    clearBackgroundTitanPreview: function () {
      backgroundTitanPreview = "";
    },
    snapshot: function () {
      var geometry = platformGeometry();
      var dyeMass = 0;
      var planktonMass = 0;
      if (fluid) {
        for (var i = 0; i < fluid.dye.length; i += 1) {
          dyeMass += fluid.dye[i];
          planktonMass += fluid.plankton[i];
        }
      }
      return {
        time: simulationTime,
        viewport: [width, height],
        cameraX: cameraX,
        waterline: geometry.line,
        platformWorldLeft: screenToWorldX(geometry.left),
        platformWidth: geometry.right - geometry.left,
        raftWorldX: screenToWorldX(raft.x),
        raul: {
          worldX: screenToWorldX(carpet.x),
          waiting: simulationTime < carpet.waitingUntil,
          nextPassIn: Math.max(0, carpet.waitingUntil - simulationTime)
        },
        leviathanWorldX: screenToWorldX(leviathans[0].x),
        leviathanWorldXs: leviathans.map(function (leviathan) {
          return screenToWorldX(leviathan.x);
        }),
        density: visualDensity(),
        platformResidents: Array.from({ length: platformResidentCount() }, function (_, residentIndex) {
          return Object.assign({}, platformResidentPose(residentIndex, simulationTime, geometry, {}));
        }),
        swimmerCount: swimmers.length,
        swimmerSamples: swimmers.slice(0, 24).map(function (swimmer) {
          return {
            kind: swimmer.kind,
            x: swimmer.x,
            y: swimmer.y,
            direction: swimmer.direction,
            behavior: swimmer.behaviorName || "uninitialized"
          };
        }),
        swimmersIntersectingStructure: swimmers.reduce(function (count, swimmer) {
          return count + (swimmerCollidesAt(swimmer, swimmer.x, swimmer.y, geometry) ? 1 : 0);
        }, 0),
        intersectingSwimmers: swimmers.filter(function (swimmer) {
          return swimmerCollidesAt(swimmer, swimmer.x, swimmer.y, geometry);
        }).slice(0, 8).map(function (swimmer) {
          var extents = swimmerCollisionExtents(swimmer, {});
          return { kind: swimmer.kind, x: swimmer.x, y: swimmer.y, radiusX: extents.x, radiusY: extents.y, vx: swimmer.vx, vy: swimmer.vy };
        }),
        behaviorCounts: swimmers.reduce(function (counts, swimmer) {
          var state = swimmer.behaviorName || "uninitialized";
          counts[state] = (counts[state] || 0) + 1;
          return counts;
        }, {}),
        rareEvent: ecologyEvent ? {
          active: ecologyEvent.active,
          type: ecologyEvent.type,
          intensity: ecologyEvent.intensity
        } : null,
        backgroundTitan: (function () {
          var active = activeBackgroundTitan(simulationTime, geometry.line);
          return active ? {
            type: active.encounter.type,
            x: active.state.x,
            y: active.state.y,
            radiusX: active.state.radiusX,
            radiusY: active.state.radiusY
          } : null;
        }()),
        rain: { drops: rainDrops.length, splashes: rainSplashes.length },
        particleCount: particles.length,
        particleWorldX: particles.slice(0, 6).map(function (particle) {
          return screenToWorldX(particle.x);
        }),
        dyeMass: dyeMass,
        planktonMass: planktonMass
      };
    }
  };
  else if (Object.prototype.hasOwnProperty.call(window, "__mareDebug")) delete window.__mareDebug;

  if (!screensaverMode) {
    renderGlossary();
    try {
      var storedGlossaryPosition = JSON.parse(window.localStorage.getItem("mare-glossary-position") || "null");
      if (storedGlossaryPosition && Number.isFinite(storedGlossaryPosition.left) && Number.isFinite(storedGlossaryPosition.top)) {
        glossaryPosition = storedGlossaryPosition;
      }
      if (window.localStorage.getItem("mare-glossary-pinned") === "1") setGlossaryPinned(true);
    } catch (error) {
      // The glossary still works without persistent storage.
    }
  }
  Object.keys(tuning).forEach(function (name) { setTuning(name, tuning[name]); });
  resize();
  showInterface();
  if (!screensaverMode) {
    try {
      if (window.localStorage.getItem("mare-welcome-seen-v1") !== "1") setWelcomeOpen(true, false);
    } catch (error) {
      setWelcomeOpen(true, false);
    }
  }
  scheduleFrame();
}());
