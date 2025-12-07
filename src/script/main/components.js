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
  // Load main menu, canvases, and status bar
  const mainMenu = document.getElementById("main_menu");
  const doubleCanvas = document.getElementById("double_canvas");
  const statusBar = document.getElementById("status_bar");

  const meshSettings1 = await loadComponent("mesh_settings.html", 1);
  const mapSettings = await loadComponent("map_settings.html");
  const meshSettings2 = await loadComponent("mesh_settings.html", 2);
  const canvas1 = await loadComponent("canvas.html", 1);
  const canvas2 = await loadComponent("canvas.html", 2);
  const distortionSlicerSettings = await loadComponent("distortion_slicer_settings.html");
  const statusBarContent = await loadComponent("status_bar.html");

  mainMenu.innerHTML = meshSettings1 + mapSettings + meshSettings2;
  doubleCanvas.innerHTML = canvas1 + distortionSlicerSettings + canvas2;
  statusBar.innerHTML = statusBarContent;
  // Set up dropdown menus
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
  // Set up sample mesh options
  const domainOptions = [
    { value: "hand_aigerman.mesh", label: "Hand Aigerman (Domain)" },
    { value: "max.mesh", label: "Max (Domain)" },
    { value: "bunny_input.mesh", label: "Bunny (Domain)" },
    { value: "duck_input.mesh", label: "Duck (Domain)" },
    { value: "bimba_input.mesh", label: "Bimba (Domain)" },
  ];

  const codomainOptions = [
    { value: "hand_pc_aigerman.mesh", label: "Hand Aigerman (Codomain)" },
    { value: "max_pc.mesh", label: "Max (Codomain)" },
    { value: "bunny_output.mesh", label: "Bunny (Codomain)" },
    { value: "duck_output.mesh", label: "Duck (Codomain)" },
    { value: "bimba_output.mesh", label: "Bimba (Codomain)" },
  ];

  const selects = mainMenu.querySelectorAll(".sample-mesh-input");
  const select1 = selects[0];
  const select2 = selects[1];

  fillSelect(select1, domainOptions);
  fillSelect(select2, codomainOptions);
}

function fillSelect(select, options) {
  select.innerHTML = ""; // clear existing options
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
}

export { initializeComponents };
