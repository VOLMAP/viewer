async function loadComponent(file, i = null) {
  const folder = "./src/components/";
  const path = folder + file;

  const res = await fetch(path);
  let template = await res.text();

  // Replace index placeholders (with optional spaces like {{i}} or {{ i }}) if needed
  if (i) {
    const regex = new RegExp(`{{\\s*i\\s*}}`, "g");
    template = template.replace(regex, i);
  }

  return template;
}

async function initializeComponents() {
  const mainMenu = document.getElementById("main_menu");
  const doubleCanvas = document.getElementById("double_canvas");
  const statusBar = document.getElementById("status_bar");

  const meshSettings1 = await loadComponent("mesh_settings.html", 1);
  const mapSettings = await loadComponent("map_settings.html");
  const meshSettings2 = await loadComponent("mesh_settings.html", 2);
  const canvas1 = await loadComponent("canvas.html", 1);
  const canvas2 = await loadComponent("canvas.html", 2);
  const statusBarContent = await loadComponent("status_bar.html");

  mainMenu.innerHTML = meshSettings1 + mapSettings + meshSettings2;
  doubleCanvas.innerHTML = canvas1 + canvas2;
  statusBar.innerHTML = statusBarContent;

  const dropdowns = Array.from(mainMenu.getElementsByClassName("dropdown"));

  dropdowns.forEach((dropdown) => {
    const btn = dropdown.querySelector(".dropbtn");
    const content = dropdown.querySelector(".dropcontent");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      // Close all others dropcontents
      document.querySelectorAll(".dropcontent.open").forEach((dc) => {
        if (dc !== content) dc.classList.remove("open");
      });
      // Toggle current dropcontent
      content.classList.toggle("open");
    });
  });
}

export { initializeComponents };
