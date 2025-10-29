import { VolumeMesh } from "../wrappers/VolumeMesh.js";
import * as utils from "../../main/utils.js";
import * as Distortion from "../../main/distortion.js";
import * as THREE from "../../../libs/three/three.module.js";

export class MeshMapper {
  controller = null;
  meshRenderers = [];

  isMap = null;
  isMapActive = false;

  energy = "CONFORMAL";
  polygonsDistortion = null;
  clampedPolygonsDistortion = null;
  polygonsColor = null;

  gradientStart = utils.white;
  gradientEnd = utils.red;

  lastPickedPolygonIndex = null;
  lastPickedPolygonColor = null;

  isMappingReversed = false;
  clampStart = 1;
  clampEnd = 12;

  degenerateColor = utils.hexToRGB(0xffff00);
  degenerateToggle = false;

  constructor(meshRenderers) {
    this.meshRenderers = meshRenderers;

    meshRenderers.forEach((meshRenderer) => {
      meshRenderer.setMeshMapper(this);
    });
  }

  checkMap() {
    const mesh1 = this.meshRenderers[0].getMesh();
    const mesh2 = this.meshRenderers[1].getMesh();

    if (mesh1 == null || mesh2 == null) {
      console.log("mesh1 or mesh2 is null");
      return false;
    } else if (
      !(mesh1 instanceof VolumeMesh) ||
      !(mesh2 instanceof VolumeMesh)
    ) {
      console.log("mesh1 or mesh2 not instanceof VolumeMesh");
      return false;
    } else {
      const vertices1 = mesh1.getMesh().geometry.userData.vertices;
      const vertices2 = mesh2.getMesh().geometry.userData.vertices;
      const tetrahedras1 = mesh1.getMesh().geometry.userData.tetrahedras;
      const tetrahedras2 = mesh2.getMesh().geometry.userData.tetrahedras;

      if (vertices1.length != vertices2.length) {
        console.log("vertLen");
        return false;
      } else if (tetrahedras1.length != tetrahedras2.length) {
        console.log("polyLen");
        return false;
      } else {
        for (let i = 0; i < tetrahedras1.length; i += 4) {
          if (
            tetrahedras1[i] != tetrahedras2[i] ||
            tetrahedras1[i + 1] != tetrahedras2[i + 1] ||
            tetrahedras1[i + 2] != tetrahedras2[i + 2] ||
            tetrahedras1[i + 3] != tetrahedras2[i + 3]
          ) {
            console.log("polyIndex");
            return false;
          }
        }
        return true;
      }
    }
  }

  calculateDistorsion() {
    this.polygonsDistortion = new Array();
    this.degeneratePolyhedra = 0;

    let mesh1 = this.meshRenderers[0].getMesh().getMesh();
    let mesh2 = this.meshRenderers[1].getMesh().getMesh();

    if (this.isMappingReversed) {
      const temp = mesh1;
      mesh1 = mesh2;
      mesh2 = temp;
    }

    const vertices1 = mesh1.geometry.userData.vertices;
    const vertices2 = mesh2.geometry.userData.vertices;
    const tetrahedras = mesh1.geometry.userData.tetrahedras;

    for (let i = 0; i < tetrahedras.length; i += 4) {
      const tetraVertices1 = new Array();
      const tetraVertices2 = new Array();

      for (let j = 0; j <= 3; j++) {
        const vIndex = tetrahedras[i + j];

        const v1 = {
          x: vertices1[vIndex * 3],
          y: vertices1[vIndex * 3 + 1],
          z: vertices1[vIndex * 3 + 2],
        };

        const v2 = {
          x: vertices2[vIndex * 3],
          y: vertices2[vIndex * 3 + 1],
          z: vertices2[vIndex * 3 + 2],
        };

        tetraVertices1.push(v1);
        tetraVertices2.push(v2);
      }

      let distortion = null;

      try {
        const J = Distortion.jacobianMatrix(
          tetraVertices1[0],
          tetraVertices1[1],
          tetraVertices1[2],
          tetraVertices1[3],
          tetraVertices2[0],
          tetraVertices2[1],
          tetraVertices2[2],
          tetraVertices2[3]
        );

        const S = Distortion.computeSingularValues(J);

        distortion = Distortion.computeDistortion(
          S[0],
          S[1],
          S[2],
          this.energy
        );
      } catch (error) {
        if (
          error.message === "Tetraedro degenere - determinante nullo o negativo"
        ) {
          distortion = NaN; // Degeneri
          this.degeneratePolyhedra++;
        } else {
          throw error;
        }
      }

      this.polygonsDistortion.push(distortion);
    }

    mesh1.geometry.userData.polygonsDistortion =
      this.polygonsDistortion.slice();
    mesh2.geometry.userData.polygonsDistortion =
      this.polygonsDistortion.slice();

    console.log(`Degenerate polyhedra: ${this.degeneratePolyhedra}`);

    this.resetClamping();
    this.clampDistorsion();
  }

  resetClamping() {
    if (this.energy == "CONFORMAL") {
      this.clampStart = 1;
      this.clampEnd = 12;
    } else if (this.energy == "DIRICHLET") {
      this.clampStart = 2;
      this.clampEnd = 8;
    } else if (this.energy == "SYMMETRIC-DIRICHLET") {
      this.clampStart = 3;
      this.clampEnd = 12;
    } else if (this.energy == "ARAP") {
      this.clampStart = 0;
      this.clampEnd = 2;
    } else if (this.energy == "MIPS3D") {
      this.clampStart = 1;
      this.clampEnd = 12;
    } else {
      console.log("Unknown energy type");
    }

    this.controller.updateClamping(this.clampStart, this.clampEnd);
    this.controller.updateClampInfo(this.clampStart, this.clampEnd);
  }

  clampDistorsion() {
    this.clampedPolygonsDistortion = this.polygonsDistortion.slice();
    utils.clampArray(
      this.clampedPolygonsDistortion,
      this.clampStart,
      this.clampEnd
    );

    this.meshRenderers[0]
      .getMesh()
      .slicer.setPolyhedraByDistortion(this.clampedPolygonsDistortion);
    this.meshRenderers[1]
      .getMesh()
      .slicer.setPolyhedraByDistortion(this.clampedPolygonsDistortion);
  }

  calculateColor() {
    this.color = new Array();

    const mesh1 = this.meshRenderers[0].getMesh().getMesh();
    const mesh2 = this.meshRenderers[1].getMesh().getMesh();

    const tetrahedras = mesh1.geometry.userData.tetrahedras;

    for (var i = 0; i < tetrahedras.length / 4; i++) {
      var color = null;

      if (isNaN(this.polygonsDistortion[i])) {
        if (this.degenerateToggle) {
          color = this.degenerateColor;
        } else {
          color = utils.hexToRGB(this.gradientEnd);
        }
      } else {
        color = utils.interpolateColor(
          utils.hexToRGB(this.gradientStart),
          utils.hexToRGB(this.gradientEnd),
          this.clampedPolygonsDistortion[i]
        );
      }

      this.color.push(color);
    }

    mesh1.geometry.userData.polygonsColor = this.color;
    mesh2.geometry.userData.polygonsColor = this.color;
  }

  toggleMap(flag) {
    if (this.isMap == null) {
      this.isMap = this.checkMap();
      if (this.isMap) {
        this.calculateDistorsion();
        this.calculateColor();

        const verticesCount =
          this.meshRenderers[0].getMesh().getMesh().geometry.userData.vertices
            .length / 3;
        const facesCount = this.meshRenderers[0].getMesh().getMesh().geometry
          .userData.adjacencyMap.size;
        const polyhedraCount =
          this.meshRenderers[0].getMesh().getMesh().geometry.userData
            .tetrahedras.length / 4;
        this.controller.updateModelInfo(
          verticesCount,
          facesCount,
          polyhedraCount
        );
      } else {
        alert("The meshes are not compatible for mapping.");
      }
    }

    if (this.isMap) {
      this.isMapActive = flag;

      this.togglePicker(this, this.meshRenderers, this.isMapActive);
      this.meshRenderers[0].getMesh().applyMapColor(this.isMapActive);
      this.meshRenderers[1].getMesh().applyMapColor(this.isMapActive);

      this.controller.updateMapInfo(
        this.energy,
        this.gradientStart,
        this.gradientEnd,
        this.gradientStart != utils.white && this.gradientEnd != utils.white,
        this.clampStart,
        this.clampEnd
      );
      return true;
    } else {
      return false;
    }
  }

  changeEnergy(energy) {
    this.energy = energy;

    if (this.isMap) {
      this.calculateDistorsion();
      this.calculateColor();
      if (this.isMapActive) {
        this.meshRenderers[0].getMesh().applyMapColor(true);
        this.meshRenderers[1].getMesh().applyMapColor(true);
      }
    }

    this.controller.updateEnergy(this.energy);
  }

  reverse(flag) {
    this.isMappingReversed = flag;

    if (this.isMap) {
      this.calculateDistorsion();
      this.calculateColor();
      if (this.isMapActive) {
        this.meshRenderers[0].getMesh().applyMapColor(true);
        this.meshRenderers[1].getMesh().applyMapColor(true);
      }
    }
  }

  changeGradientStart(color) {
    color = parseInt(color.replace("#", ""), 16);

    if (color != this.gradientEnd) {
      this.gradientStart = color;
      if (this.isMap) {
        this.calculateColor();
        if (this.isMapActive) {
          this.meshRenderers[0].getMesh().applyMapColor(true);
          this.meshRenderers[1].getMesh().applyMapColor(true);
        }
      }

      this.controller.updateGradient(
        this.gradientStart,
        this.gradientEnd,
        this.gradientStart != utils.white && this.gradientEnd != utils.white
      );
      return true;
    } else {
      alert("Invalid color value.");
      return false;
    }
  }

  changeGradientEnd(color) {
    color = parseInt(color.replace("#", ""), 16);

    if (color != this.gradientStart) {
      this.gradientEnd = color;
      if (this.isMap) {
        this.calculateColor();
        if (this.isMapActive) {
          this.meshRenderers[0].getMesh().applyMapColor(true);
          this.meshRenderers[1].getMesh().applyMapColor(true);
        }
      }

      this.controller.updateGradient(
        this.gradientStart,
        this.gradientEnd,
        this.gradientStart != utils.white && this.gradientEnd != utils.white
      );
      return true;
    } else {
      alert("Invalid color value.");
      return false;
    }
  }

  changeClampStart(value) {
    if (value < this.clampEnd) {
      this.clampStart = value;
      if (this.isMap) {
        this.clampDistorsion();
        this.calculateColor();
        if (this.isMapActive) {
          this.meshRenderers[0].getMesh().applyMapColor(true);
          this.meshRenderers[1].getMesh().applyMapColor(true);
        }
      }

      this.controller.updateClampInfo(this.clampStart, this.clampEnd);
      return true;
    } else {
      alert("Invalid clamp start value.");
      return false;
    }
  }

  changeClampEnd(value) {
    if (value > this.clampStart) {
      this.clampEnd = value;
      if (this.isMap) {
        this.clampDistorsion();
        this.calculateColor();
        if (this.isMapActive) {
          this.meshRenderers[0].getMesh().applyMapColor(true);
          this.meshRenderers[1].getMesh().applyMapColor(true);
        }
      }

      this.controller.updateClampInfo(this.clampStart, this.clampEnd);
      return true;
    } else {
      alert("Invalid clamp end value.");
      return false;
    }
  }

  reset() {
    this.isMap = null;
    this.isMapActive = false;
    this.polygonsDistortion = null;
    this.clampedPolygonsDistortion = null;
    this.polygonsColor = null;
    this.energy = "CONFORMAL";
    this.gradientStart = utils.white;
    this.gradientEnd = utils.red;
    this.isMappingReversed = false;
    this.degenerateColor = utils.hexToRGB(0xffff00);
    this.degenerateToggle = false;

    this.resetClamping();

    this.togglePicker(this, this.meshRenderers, false);

    const mesh0 = this.meshRenderers[0].getMesh();
    if (mesh0 && mesh0 instanceof VolumeMesh) {
      mesh0.applyMapColor(false);
    }
    const mesh1 = this.meshRenderers[1].getMesh();
    if (mesh1 && mesh1 instanceof VolumeMesh) {
      mesh1.applyMapColor(false);
    }
    this.resetPicker();

    this.controller.reset();

    this.controller.updateModelInfo(0, 0, 0);
    this.controller.updateMapInfo(
      "CONFORMAL",
      utils.white,
      utils.red,
      false,
      1,
      12
    );
    this.controller.updatePickerInfo(-1, -1);
  }

  togglePicker(mapper, renderers, flag) {
    if (flag) {
      renderers[0].renderer.domElement.addEventListener("click", (event) =>
        mapper.pickPolygon(event, renderers[0], renderers[1])
      );
      renderers[1].renderer.domElement.addEventListener("click", (event) =>
        mapper.pickPolygon(event, renderers[1], renderers[0])
      );
    } else {
      renderers[0].renderer.domElement.removeEventListener("click", (event) =>
        mapper.pickPolygon(event, renderers[0], renderers[1])
      );
      renderers[1].renderer.domElement.removeEventListener("click", (event) =>
        mapper.pickPolygon(event, renderers[1], renderers[0])
      );
    }

    /*
    this.meshRenderers[0].distortionContainer.style.visibility = flag
      ? "visible"
      : "hidden";
    this.meshRenderers[1].distortionContainer.style.visibility = flag
      ? "visible"
      : "hidden";
      */
  }

  resetPicker() {
    /*
    this.meshRenderers[0].distortionContainer.getElementsByClassName(
      "polygon-index"
    )[0].innerText = `-1`;
    this.meshRenderers[0].distortionContainer.getElementsByClassName(
      "distortion-value"
    )[0].innerText = `-1`;
    this.meshRenderers[1].distortionContainer.getElementsByClassName(
      "polygon-index"
    )[0].innerText = `-1`;
    this.meshRenderers[1].distortionContainer.getElementsByClassName(
      "distortion-value"
    )[0].innerText = `-1`;
    */

    this.controller.updatePickerInfo(-1, -1);

    this.lastPickedPolygonColor = null;
    this.lastPickedPolygonIndex = null;
  }

  pickPolygon(event, renderer, otherRenderer) {
    if (!event.shiftKey) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rect = renderer.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, renderer.camera);
    const intersects = raycaster.intersectObject(renderer.mesh.getMesh(), true);

    const mesh = renderer.mesh.getMesh();
    const geometry = mesh.geometry;
    const otherMesh = otherRenderer.mesh.getMesh();
    const otherGeometry = otherMesh.geometry;

    if (intersects.length > 0) {
      const distortion = geometry.attributes.distortion;
      const poly = geometry.attributes.poly;
      const faceIndex = intersects[0].face.a / 3;
      const polyIndex = poly.array[faceIndex];
      const d = distortion.array[faceIndex];

      // 🔙 Ripristina il colore precedente (se esiste)
      if (this.lastPickedPolygonIndex !== null && this.lastPickedPolygonColor) {
        this._colorPolygon(
          geometry,
          this.lastPickedPolygonIndex,
          this.lastPickedPolygonColor
        );
        this._colorPolygon(
          otherGeometry,
          this.lastPickedPolygonIndex,
          this.lastPickedPolygonColor
        );
      }

      // 💾 Salva il colore originale della prima faccia del nuovo poligono
      let firstFaceIdx = null;
      for (let i = 0; i < poly.array.length; i++) {
        if (poly.array[i] === polyIndex) {
          firstFaceIdx = i;
          break;
        }
      }
      const colorAttr = geometry.attributes.color;
      const i = firstFaceIdx * 9;
      this.lastPickedPolygonColor = {
        r: colorAttr.array[i],
        g: colorAttr.array[i + 1],
        b: colorAttr.array[i + 2],
      };
      this.lastPickedPolygonIndex = polyIndex;

      // Colora tutte le facce del poligono selezionato (complementare)
      this._colorPolygon(geometry, polyIndex, null, true);
      this._colorPolygon(otherGeometry, polyIndex, null, true);

      /*
      renderer.distortionContainer.getElementsByClassName(
        "polygon-index"
      )[0].innerText = `${polyIndex}`;
      renderer.distortionContainer.getElementsByClassName(
        "distortion-value"
      )[0].innerText = `${d}`;
      otherRenderer.distortionContainer.getElementsByClassName(
        "polygon-index"
      )[0].innerText = `${polyIndex}`;
      otherRenderer.distortionContainer.getElementsByClassName(
        "distortion-value"
      )[0].innerText = `${d}`;
      */
      this.controller.updatePickerInfo(polyIndex, d);
    } else {
      // 🔙 Ripristina il colore precedente (se esiste)
      if (this.lastPickedPolygonIndex !== null && this.lastPickedPolygonColor) {
        this._colorPolygon(
          geometry,
          this.lastPickedPolygonIndex,
          this.lastPickedPolygonColor
        );
        this._colorPolygon(
          otherGeometry,
          this.lastPickedPolygonIndex,
          this.lastPickedPolygonColor
        );
      }
      this.lastPickedPolygonIndex = null;
      this.lastPickedPolygonColor = null;
      /*
      renderer.distortionContainer.getElementsByClassName(
        "polygon-index"
      )[0].innerText = `-1`;
      renderer.distortionContainer.getElementsByClassName(
        "distortion-value"
      )[0].innerText = `-1`;
      otherRenderer.distortionContainer.getElementsByClassName(
        "polygon-index"
      )[0].innerText = `-1`;
      otherRenderer.distortionContainer.getElementsByClassName(
        "distortion-value"
      )[0].innerText = `-1`;
      */
      this.controller.updatePickerInfo(-1, -1);
    }
  }

  // Funzione ausiliaria per colorare tutte le facce di un poligono
  _colorPolygon(geometry, polyIndex, colorObj, complementary = false) {
    const poly = geometry.attributes.poly;
    const color = geometry.attributes.color;
    const polygonsColor = geometry.userData.polygonsColor;
    for (let i = 0; i < poly.array.length; i++) {
      if (poly.array[i] === polyIndex) {
        const idx = i * 9;
        for (let j = 0; j < 9; j += 3) {
          if (complementary) {
            color.array[idx + j] = 1.0 - color.array[idx + j];
            color.array[idx + j + 1] = 1.0 - color.array[idx + j + 1];
            color.array[idx + j + 2] = 1.0 - color.array[idx + j + 2];
          } else {
            color.array[idx + j] = colorObj.r;
            color.array[idx + j + 1] = colorObj.g;
            color.array[idx + j + 2] = colorObj.b;
          }
        }
        // Aggiorna il colore del poligono
        polygonsColor[poly.array[i]] = {
          r: color.array[idx],
          g: color.array[idx + 1],
          b: color.array[idx + 2],
        };
      }
    }
    color.needsUpdate = true;
  }

  changeDegenerateToggle(flag) {
    this.degenerateToggle = flag;
    if (this.isMap) {
      this.calculateColor();
      if (this.isMapActive) {
        this.meshRenderers[0].getMesh().applyMapColor(true);
        this.meshRenderers[1].getMesh().applyMapColor(true);
      }
    }
  }

  changeDegenerateColor(color) {
    color = parseInt(color.replace("#", ""), 16);
    this.degenerateColor = utils.hexToRGB(color);
    if (this.isMap) {
      this.calculateColor();
      if (this.isMapActive) {
        this.meshRenderers[0].getMesh().applyMapColor(true);
        this.meshRenderers[1].getMesh().applyMapColor(true);
      }
    }
  }
}
