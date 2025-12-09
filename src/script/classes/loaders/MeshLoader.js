import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";

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
    var tetrahedra = new Array();
    var numTetrahedra = 0;

    var verticesLabels = new Array();
    var trianglesLabels = new Array();
    var tetrahedraLabels = new Array();

    var adjacencyMap = new Map();

    while (!read.done) {
      read = await reader.read();
      buffer += decoder.decode(read.value, { stream: true });

      while (buffer.includes("\n")) {
        var index = buffer.indexOf("\n");
        var line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);

        //Skip empty lines
        if (!line) continue;

        //Split the line into tokens
        var tokens = line.split(/\s+/);

        //Handle keywords and values
        if (!version && tokens[0] === "MeshVersionFormatted") {
          if (tokens.length < 2) {
            //Read the next line for the version number
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
            version = parseInt(tokens[0]);
          } else {
            version = parseInt(tokens[1]);
          }
        } else if (!dimension && tokens[0] === "Dimension") {
          if (tokens.length < 2) {
            //Read the next line for the dimension number
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
            dimension = parseInt(tokens[0]);
          } else {
            dimension = parseInt(tokens[1]);
          }
        } else if (tokens[0] === "Vertices") {
          if (tokens.length < 2) {
            //Read the next line for the number of vertices
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
            numVertices = parseInt(tokens[0]);
          } else {
            numVertices = parseInt(tokens[1]);
          }
          mode = "vertices";
        } else if (tokens[0] === "Tetrahedra") {
          if (tokens.length < 2) {
            //Read the next line for the number of tetrahedra
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
            numTetrahedra = parseInt(tokens[0]);
          } else {
            numTetrahedra = parseInt(tokens[1]);
          }
          mode = "tetrahedra";
        } else if (tokens[0] === "Triangles") {
          if (tokens.length < 2) {
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
            numTriangles = parseInt(tokens[0]);
          } else {
            numTriangles = parseInt(tokens[1]);
          }
          mode = "triangles";
        } else if (mode === "vertices" && tokens.length === 4) {
          for (let i = 0; i < 3; i++) {
            vertices.push(parseFloat(tokens[i]));
          }
          verticesLabels.push(tokens[3]);
        } else if (mode === "tetrahedra" && tokens.length === 5) {
          //Note: converting to zero-based indexing and changing vertex order for correct face orientation
          tetrahedra.push(parseInt(tokens[1]) - 1);
          tetrahedra.push(parseInt(tokens[0]) - 1);
          tetrahedra.push(parseInt(tokens[2]) - 1);
          tetrahedra.push(parseInt(tokens[3]) - 1);
          tetrahedraLabels.push(tokens[4]);
        } else if (mode === "triangles" && tokens.length === 4) {
          for (let i = 0; i < 3; i++) {
            triangles.push(parseInt(tokens[i]));
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

          if (!numTetrahedra) {
            throw new Error("No tetrahedra found in this file.");
          }

          if (vertices.length !== numVertices * 3) {
            throw new Error("Dimension not matching (vertices)");
          }

          if (tetrahedra.length !== numTetrahedra * 4) {
            throw new Error("Dimension not matching (tetrahedra)");
          }

          if (verticesLabels.length !== numVertices || tetrahedraLabels.length !== numTetrahedra) {
            throw new Error("Dimension not matching (labels)");
          }
        }
      }
    }
    //Generate triangles and adjacency map from tetrahedra
    const tmp = this.generateTrianglesAndAdjacencyMap(tetrahedra);
    triangles = tmp.triangles;
    adjacencyMap = tmp.adjacencyMap;
    //Generate triangle soup from vertices and triangles
    var triangleSoup = this.generateTriangleSoup(vertices, triangles);

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(new Float32Array(triangleSoup), 3);
    geometry.setAttribute("position", positionAttribute);

    geometry.userData = {
      vertices: vertices,
      triangles: triangles,
      tetrahedra: tetrahedra,
      triangleSoup: triangleSoup,
      adjacencyMap: adjacencyMap,
      polyCentroids: null,
      polyColor: null,
      polyDistortion: null,
      clampedPolyDistortion: null,
    };

    return new THREE.Mesh(geometry);
  }

  generateTrianglesAndAdjacencyMap(tetrahedra, vertices) {
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

    for (let i = 0; i < tetrahedra.length; i += 4) {
      var v0 = tetrahedra[i],
        v1 = tetrahedra[i + 1],
        v2 = tetrahedra[i + 2],
        v3 = tetrahedra[i + 3];

      var faces = sortedFaces(v0, v1, v2, v3);

      faces.forEach((face) => {
        //Add face to the triangles array
        triangles.push(face[0], face[1], face[2]);
        //Create and adjacency map key for each face and build the map
        const key = [...face].sort((a, b) => a - b).join(",");
        if (!adjacencyMap.has(key)) {
          adjacencyMap.set(key, new Array());
        }
        adjacencyMap.get(key).push({ sortedFace: face, polyIndex: i / 4 });
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
      //Get vertex index
      const v = triangles[i];
      //Push vertex coordinates
      triangleSoup.push(vertices[v * 3], vertices[v * 3 + 1], vertices[v * 3 + 2]);
    }

    return triangleSoup;
  }
}
