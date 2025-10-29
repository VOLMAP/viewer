async function loadComponent(file, i = null) {
  const folder = "./src/components/";
  const path = folder + file;

  const res = await fetch(path);
  let template = await res.text();

  if (i) {
    const regex = new RegExp(`{{\\s*i\\s*}}`, "g");
    template = template.replace(regex, i);
  }

  return template;
}

async function initializeComponents() {
  const menu = document.getElementById("menu");
  const canvas = document.getElementById("canvas");
  const info = document.getElementById("info");

  const meshSettings1 = await loadComponent("meshSettings.html", 1);
  const mapSettings = await loadComponent("mapSettings.html");
  const meshSettings2 = await loadComponent("meshSettings.html", 2);
  const meshRenderer1 = await loadComponent("meshRenderer.html", 1);
  const meshRenderer2 = await loadComponent("meshRenderer.html", 2);
  const infoPanel = await loadComponent("infoPanel.html");

  menu.innerHTML = meshSettings1 + mapSettings + meshSettings2;
  canvas.innerHTML = meshRenderer1 + meshRenderer2;
  info.innerHTML = infoPanel;
}

export { initializeComponents };
