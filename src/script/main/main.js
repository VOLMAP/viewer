import { initializeComponents } from "./components.js";
import { MeshRenderer } from "../classes/renderer/MeshRenderer.js";
import { MeshRendererController } from "../classes/renderer/MeshRendererController.js";
import { MeshMapper } from "../classes/mapper/MeshMapper.js";
import { MeshMapperController } from "../classes/mapper/MeshMapperController.js";

await initializeComponents();

const n = 2;
const renderers = [];

for (let i = 1; i <= n; i++) {
  const rendererContainer = document.getElementById(`mesh${i}_renderer`);
  const renderer = new MeshRenderer(rendererContainer);

  const settingsContainer = document.getElementById(`mesh${i}_settings`);
  new MeshRendererController(renderer, settingsContainer);

  renderers.push(renderer);
}

const mapper = new MeshMapper(renderers);

const mapSettingsContainer = document.getElementById(`map_settings`);
new MeshMapperController(mapper, mapSettingsContainer);

export { renderers, mapper };
