# VOLMAP Viewer

![VOLMAP Viewer Teaser](teaser.png)

**VOLMAP Viewer** is a **web-based** tool for the visual assessment and analysis of **maps** between **tetrahedral meshes**.  
Users can load models directly in the browser and manage them with data structures optimized for interactive visualization.
You can display and interact in real-time with both source and target domains, check map validity, and compute map quality according to a variety of popular distortion metrics.

> [!IMPORTANT]
> **VOLMAP Viewer** is now available **ONLINE**!  
> You can try it at [volmap.github.io/viewer](https://volmap.github.io/viewer)

---

> ### **Table of Contents**
>
> 1. [Features](#features)
> 1. [Setup and Launch](#setup-and-launch)
> 1. [Usage](#usage)
> 1. [Citing us](#citing-us)
> 1. [Acknowledgements](#acknowledgements)

---

## Features
VOLMAP Viewer offers the following features:
- **Web-based**: no installation required, works on any modern browser.
- **Interactive Visualization**: real-time rendering and interaction with tetrahedral meshes.
- **Map Validity Checking**: tools to verify the correctness of maps between meshes.
- **Distortion Metrics**: compute and visualize various distortion metrics to assess map quality.
- **User-Friendly Interface**: intuitive controls for loading, visualizing, and analyzing meshes and maps.

## Setup and Launch for local usage

This tool can be used **locally without any build tool or external dependency**, but due to browser's CORS (Cross-Origin Resource Sharing) and file access restrictions, it must be launched through a **local server**.

Below are three easy ways to start a local server: **Node.js**, **Python**, or **VS Code Live Server**.

#### 🟢 Using Node.js

If you have Node.js installed, run:

```bash
npx serve
```

Then open the URL shown in the terminal (usually `http://localhost:3000` or `http://127.0.0.1:8080`).

#### 🐍 Using Python

If you have Python installed, you can run:

```bash
python -m http.server 8000
```

Then visit:

```
http://localhost:8000
```

#### 💡 Using VS Code Live Server Extension

1. Install the **Live Server** extension in VS Code (by Ritwick Dey).
2. Open your project folder in VS Code.
3. Right-click on `index.html` and click **"Open with Live Server"**.
4. The app will open automatically in your browser at a local address (e.g. `http://127.0.0.1:5500`).

## Usage

We've prepared a tutorial on how to use VOLMAP Viewer. You can find it at [this link](./tutorial.md)!

## Citing us

If you use VOLMAP Viewer in your academic projects, please consider citing the library using the following
BibTeX entry:

```bibtex
@article{
  title = {VOLMAP Viewer: a Web-Based Interactive Visual Tool to Explore Volume Maps},
  author = {Giacalone, Alberto and Mulas, Dylan and Meloni, Federico and Cherchi, Gianmarco and Livesu, Marco},
  booktitle = {Smart Tools and Applications in Graphics},
  year = {2025},
  publisher = {The Eurographics Association},
  issn = {},
  doi = {}
}
```

## Acknowledgements

This work was supported by project “FIATLUCS - Favorire l’Inclusione e l’Accessibilità per i Trasferimenti Locali Urbani a Cagliari e Sobborghi” funded by the PNRR RAISE Liguria, Spoke 01, project “Tecnologie innovative e abilitanti per l’innovazione della pubblica amministrazione”, founded by PNRR, DM 118/2022, project “RAISE - Robotics and AI for Socio-economic Empowerment” (ECS00000035) funded by the European Union - NextGenerationEU and by the Ministry of University and Research (MUR), National Recovery and Resilience Plan (NRRP), Mission 4, Component 2, Investment 1.5, and INdAM (Istituto Nazionale di Alta Matematica “Francesco Severi”) for partially supporting his research.
