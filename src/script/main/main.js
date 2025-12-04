import { initializeComponents } from "./components.js";

await initializeComponents();

/*
import { MeshRenderer } from "../classes/renderer/MeshRenderer.js";
import { MeshRendererController } from "../classes/renderer/MeshRendererController.js";
import { MeshMapper } from "../classes/mapper/MeshMapper.js";
import { MeshMapperController } from "../classes/mapper/MeshMapperController.js";
import { MeshLoader } from "../classes/loaders/MeshLoader.js";
*/

/*
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

const domainUrl = "./src/assets/maps/hand_aigerman.mesh";
const codomainUrl = "./src/assets/maps/hand_pc_aigerman.mesh";

const domainFile = await fetch(domainUrl);
const codomainFile = await fetch(codomainUrl);

const domainBlob = await domainFile.blob();
const codomainBlob = await codomainFile.blob();

const loader = new MeshLoader();

const domainMesh = await loader.load(domainBlob);
renderers[0].setMesh(domainMesh);
renderers[0].controller.reset();

const codomainMesh = await loader.load(codomainBlob);
renderers[1].setMesh(codomainMesh);
renderers[1].controller.reset();
*/
