export interface SceneHost {
  canvas: HTMLCanvasElement;
  shell: HTMLElement;
  screensaverMode: boolean;
  debugMode: boolean;
  runtime: unknown;
}

export interface FieldEntry {
  id: string;
  name: string;
  group: string;
  summary: string;
  excerpt?: string;
  source?: string;
  passages?: Array<{excerpt:string;source:string}>;
}
