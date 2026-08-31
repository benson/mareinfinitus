(function (root) {
  "use strict";

  var masks = Object.freeze({
    shrike: [
      "      1      ",
      "   1 111 1   ",
      "  111121111  ",
      "1111122211111",
      "  111222111  ",
      "   1122211   ",
      "  11 222 11  ",
      " 11  2 2  11 ",
      "1    2 2    1"
    ],
    pilgrim: [" 11 ", " 11 ", "1111", " 11 ", "1111", "1  1", "1  1"],
    sphinxWing: ["       1", "     111", "   11111", " 1111111", "11111111", " 1111111", "   11111"],
    thornTree: ["   1  1", " 1 111 ", "1111111", "  111 1", " 11111 ", "1 111 1", "  111  ", "   1   "]
  });

  function get(name) { return masks[name] || null; }
  function bounds(mask) {
    if (!mask) return { width: 0, height: 0 };
    return { width: mask.reduce(function (max, row) { return Math.max(max, row.length); }, 0), height: mask.length };
  }
  function selfCheck() { return bounds(masks.shrike).width === 13 && bounds(masks.pilgrim).height === 7; }

  root.LivingSilhouettes = Object.freeze({ version: "1.0.0", get: get, bounds: bounds, selfCheck: selfCheck });
})(typeof window !== "undefined" ? window : globalThis);
