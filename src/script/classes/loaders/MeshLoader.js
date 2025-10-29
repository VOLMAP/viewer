import * as THREE from "../../../libs/three/three.module.js";
import { VolumeMesh } from "../wrappers/VolumeMesh.js";

export class MeshLoader {
  constructor() {}

  async load(file) {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();

    let read = { done: false, value: null };
    let buffer = "";

    let mode = null;
    let version = null;
    let dimension = null;

    var vertices = new Array();
    var numVertices = 0;
    var triangles = new Array();
    var numTriangles = 0;
    var tetrahedras = new Array();
    var numTetrahedras = 0;

    var verticesLabels = new Array();
    var trianglesLabels = new Array();
    var tetrahedrasLabels = new Array();

    var adjacencyMap = new Map();

    while (!read.done) {
      read = await reader.read();
      buffer += decoder.decode(read.value, { stream: true });

      while (buffer.includes("\n")) {
        var index = buffer.indexOf("\n");
        var line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);

        if (!line) continue; // Salta linee vuote

        var tokens = line.split(/\s+/); //divide la riga in token

        // Gestione delle keyword e dei valori
        if (!version && tokens[0] === "MeshVersionFormatted") {
          if (tokens.length < 2) {
            // Leggi il valore dalla riga successiva
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
            version = parseInt(tokens[0]);
          } else {
            version = parseInt(tokens[1]);
          }
        } else if (!dimension && tokens[0] === "Dimension") {
          if (tokens.length < 2) {
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
            dimension = parseInt(tokens[0]);
          } else {
            dimension = parseInt(tokens[1]);
          }
        } else if (tokens[0] === "Vertices") {
          if (tokens.length < 2) {
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
          }
          numVertices = parseInt(tokens[0]);
          mode = "vertices";
        } else if (tokens[0] === "Tetrahedra") {
          if (tokens.length < 2) {
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
          }
          numTetrahedras = parseInt(tokens[0]);
          mode = "tetrahedra";
        } else if (tokens[0] === "Triangles") {
          if (tokens.length < 2) {
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
          }
          numTriangles = parseInt(tokens[0]);
          mode = "triangles";
        } else if (mode === "vertices" && tokens.length === 4) {
          for (let i = 0; i < 3; i++) {
            vertices.push(parseFloat(tokens[i]));
          }
          verticesLabels.push(tokens[3]);
        } else if (mode === "tetrahedra" && tokens.length === 5) {
          tetrahedras.push(parseInt(tokens[1]) - 1);
          tetrahedras.push(parseInt(tokens[0]) - 1);
          tetrahedras.push(parseInt(tokens[2]) - 1);
          tetrahedras.push(parseInt(tokens[3]) - 1);
          tetrahedrasLabels.push(tokens[4]);
        } else if (mode === "triangles" && tokens.length === 4) {
          for (let i = 0; i < 3; i++) {
            triangles.push(parseInt(tokens[i])); // Assicurati che i valori siano numeri interi
          }
          trianglesLabels.push(tokens[3]);
        } else if (tokens[0] === "End") {
          if (!version) {
            throw new Error("Version not found");
          }

          if (!dimension) {
            throw new Error("Dimension not found");
          }

          if (!numVertices) {
            throw new Error("No vertices found in this file.");
          }

          if (!numTetrahedras) {
            throw new Error("No tetrahedras found in this file.");
          }

          if (
            vertices.length !== numVertices * 3 ||
            tetrahedras.length !== numTetrahedras * 4
          ) {
            throw new Error("Dimension not matching (vertices/tetrahedras)");
          }

          if (
            verticesLabels.length !== numVertices ||
            tetrahedrasLabels.length !== numTetrahedras
          ) {
            throw new Error("Dimension not matching (labels)");
          }
        }
      }
    }

    const tmp = this.generateTriangles(tetrahedras);
    triangles = tmp.triangles;
    adjacencyMap = tmp.adjacencyMap;

    var triangleSoup = this.generateTriangleSoup(vertices, triangles);

    triangleSoup = new Float32Array(triangleSoup);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(triangleSoup, 3)
    );

    geometry.userData = {
      vertices: vertices,
      triangles: triangles,
      tetrahedras: tetrahedras,
      triangleSoup: triangleSoup,
      adjacencyMap: adjacencyMap,
      polygonsColor: null,
    };

    return new VolumeMesh(geometry);
  }

  generateTriangles(tetrahedras) {
    function sortedFaces(v0, v1, v2, v3) {
      return [
        [v0, v2, v1],
        [v0, v1, v3],
        [v0, v3, v2],
        [v1, v2, v3],
      ];
    }

    var triangles = new Array();
    var adjacencyMap = new Map();

    for (let i = 0; i < tetrahedras.length; i += 4) {
      var v0 = tetrahedras[i],
        v1 = tetrahedras[i + 1],
        v2 = tetrahedras[i + 2],
        v3 = tetrahedras[i + 3];

      var faces = sortedFaces(v0, v1, v2, v3);

      faces.forEach((face) => {
        triangles.push(face[0], face[1], face[2]);

        const key = [...face].sort((a, b) => a - b).join(","); // Converti la faccia in una stringa univoca
        if (!adjacencyMap.has(key)) {
          adjacencyMap.set(key, new Array());
        }
        adjacencyMap.get(key).push({ face: face, poly: i / 4 });
      });
    }

    return {
      triangles: triangles,
      adjacencyMap: adjacencyMap,
    };
  }

  generateTriangleSoup(vertices, triangles) {
    var triangleSoup = new Array();

    for (let i = 0; i < triangles.length; i++) {
      var v = triangles[i];

      triangleSoup.push(
        vertices[v * 3],
        vertices[v * 3 + 1],
        vertices[v * 3 + 2]
      );
    }

    return triangleSoup;
  }
}
