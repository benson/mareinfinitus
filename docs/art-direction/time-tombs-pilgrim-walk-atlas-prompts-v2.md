# Time Tombs pilgrim walk atlas prompts v2

Mode: built-in ImageGen. Both supplied images were generation references, not
runtime assets or edit targets. The selected result is stored beside this file
as `time-tombs-pilgrim-walk-atlas-source-v2.png`.

## Primary atlas generation

Use case: stylized-concept

Asset type: production character animation reference atlas for a late-16-bit
game scene

Input images: Image 1 is the identity, clothing, and proportion reference for
all seven pilgrims. Image 2 is the world palette, lighting, and material
reference. Preserve each character exactly rather than redesigning them.

Primary request: create one rigid animation atlas with exactly 10 columns and
exactly 7 rows. Each row is one character; each column is a sequential frame of
one seamless side-view walking cycle. Rows top to bottom: Brawne Lamia; Sol
Weintraub holding infant Rachel securely throughout every frame; Martin
Silenus; the Consul; Father Lenar Hoyt; Colonel Fedmahn Kassad; Het Masteen.
Columns left to right are contact, recoil, passing, high point, opposite
contact, opposite recoil, opposite passing, opposite high point, settling
contact, and loop bridge. The walk must loop without a jump. Arms, legs, coats,
robes, carried objects, and head bob progress gradually across adjacent frames.

Scene/backdrop: one perfectly flat, uniform saturated magenta background; no
ground, shadows, separators, panels, labels, numbers, guides, scenery, or dust.

Style/medium: clean Sega Genesis-era sprite-design reference; strong authored
silhouettes, deliberate clusters, angular cloth folds, restrained highlights,
and consistent three-quarter side view.

Composition/framing: exact evenly spaced 10-by-7 grid; one full-body figure per
cell, identical scale and baseline within each row, identical cell dimensions,
no overlap, all figures facing right.

Constraints: preserve identity, costume, body proportions, skin color, hair,
props, and lighting across each row; keep Sol and Rachel one coherent carried
silhouette; no text, marks, logos, or watermark.

Avoid: inconsistent identity, duplicate poses, missing or extra limbs,
character drift, antialiasing, painterly texture, stippling, random noise,
gradients, glowing outlines, and chibi proportions.

## Identity correction

Repair character identity consistency only. Preserve the exact grid,
background, spacing, baselines, framing, style, and every correct figure. Each
row must contain only its assigned character: Brawne; Sol and Rachel; Silenus;
the Consul without a clerical cross; Hoyt with his small cross; Kassad in
blue-gray field armor; and Masteen in green-brown hooded robes. Replace every
substituted figure with the correct row character in the corresponding pose.
Keep one full-body right-facing figure per cell and change nothing else.

The compiler additionally replaces four remaining identity-drift cells with an
adjacent correct pose before palette conversion. Generated imagery is treated
as fallible design input; deterministic validation remains authoritative.
