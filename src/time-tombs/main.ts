import Phaser from "phaser";
import { TimeTombsScene } from "./TimeTombsScene";
import type { SceneHost } from "./types";
import {VALLEY_SOURCE,VALLEY_EXCERPT} from './book-excerpts.js';

let activeGame: Phaser.Game | null = null;

export function mount(host: SceneHost): Phaser.Game {
  activeGame?.destroy(true);
  host.shell.classList.add("time-tombs-runtime");
  host.shell.classList.toggle("screensaver-runtime",host.screensaverMode);
  host.canvas.setAttribute("aria-label", "A living pixel simulation of the Time Tombs valley on Hyperion");
  document.title = "The Time Tombs — A Living Simulation";
  setText(".ui-dock-meta span", "THE TIME TOMBS");
  setHtml(".pointer-help", '<kbd>CTRL</kbd> IDENTIFY · <button type="button" class="tombs-fullscreen" data-fullscreen aria-pressed="false"><kbd>F</kbd> FULLSCREEN</button>');
  setText("#welcome-title", "The Time Tombs");
  setHtml("#welcome-description", "Step into the valley of the Time Tombs: a living pixel-material scene from Dan Simmons&rsquo;s <em>Hyperion</em>.");
  setText(".welcome-kicker", "HYPERION · THE VALLEY OF THE TIME TOMBS");
  setText(".welcome-warning", "Spoilers ahead.");
  setText("[data-welcome-enter]", "ENTER THE VALLEY");
  setText("#glossary-title", "The Time Tombs field guide");
  setHtml(".glossary-intro", "Hold <kbd>CTRL</kbd> and hover to identify a subject. Hover an entry to highlight it; click to center it. Scroll over the scene for 1×, 2× or 4× zoom. Press <kbd>F</kbd> for fullscreen. Drag or use the arrow keys to explore; middle-click or <kbd>HOME</kbd> returns to the valley. Click a pilgrim to interact, or a tomb for a subtle response. Quoted text is from the novels; artwork and unquoted notes are interpretations.");
  const glossaryKey = document.querySelector<HTMLElement>(".glossary-key");
  if (glossaryKey) glossaryKey.hidden = true;
  const quote = document.querySelector<HTMLElement>(".welcome-dialog blockquote");
  if (quote) {quote.hidden=false;quote.replaceChildren();const p=document.createElement('p'),cite=document.createElement('cite');p.textContent=VALLEY_EXCERPT;cite.textContent=VALLEY_SOURCE;quote.append(p,cite);}
  const settingsButton = document.querySelector<HTMLElement>("[data-settings-toggle]");
  const settingsPanel = document.querySelector<HTMLElement>("#mare-settings");
  if (settingsButton) settingsButton.hidden = true;
  if (settingsPanel) settingsPanel.hidden = true;

  activeGame = new Phaser.Game({
    type: Phaser.WEBGL,
    canvas: host.canvas,
    backgroundColor: "#100f1c",
    transparent: false,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
      powerPreference: "high-performance"
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: Math.max(1, host.shell.clientWidth),
      height: Math.max(1, host.shell.clientHeight)
    },
    fps: { target: 60, min: 30 },
    scene: [new TimeTombsScene(host)]
  });

  return activeGame;
}

function setText(selector: string, value: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

function setHtml(selector: string, value: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.innerHTML = value;
}
