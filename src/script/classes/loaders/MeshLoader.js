import * as THREE from "../../../libs/three/three.module.js";
import * as utils from "../../main/utils.js";
import { POLY_TYPES } from "../geometry/Polytypes.js";

export class MeshLoader {
  constructor() { }

  async loadMesh(file) {
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
    var polyhedra = new Array();
    var numPolyhedra = 0;
    var polyType = null;

    var verticesLabels = new Array();
    var trianglesLabels = new Array();
    var polyhedraLabels = new Array();

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
            numPolyhedra = parseInt(tokens[0]);
          } else {
            numPolyhedra = parseInt(tokens[1]);
          }
          polyType = "TETRAHEDRON";
          mode = "tetrahedra";
        } else if (tokens[0] === "Hexahedra") {
          if (tokens.length < 2) {
            line = buffer.slice(0, buffer.indexOf("\n")).trim();
            buffer = buffer.slice(buffer.indexOf("\n") + 1);
            tokens = line.split(/\s+/);
            numPolyhedra = parseInt(tokens[0]);
          } else {
            numPolyhedra = parseInt(tokens[1]);
          }
          polyType = "HEXAHEDRON";
          mode = "hexahedra";
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
          polyhedra.push(parseInt(tokens[1]) - 1);
          polyhedra.push(parseInt(tokens[0]) - 1);
          polyhedra.push(parseInt(tokens[2]) - 1);
          polyhedra.push(parseInt(tokens[3]) - 1);
          polyhedraLabels.push(tokens[4]);
        } else if (mode === "hexahedra" && tokens.length === 9) {
          for (let i = 0; i < 8; i++) {
            polyhedra.push(parseInt(tokens[i]) - 1);
          }

          polyhedraLabels.push(tokens[8]);
        } else if (mode === "triangles" && tokens.length === 4) {
          for (let i = 0; i < 3; i++) {
            triangles.push(parseInt(tokens[i]) - 1);
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
          
          if (!numPolyhedra) {
            throw new Error("No polyhedra found in this file.");
          }

          if (vertices.length !== numVertices * 3) {
            throw new Error("Dimension not matching (vertices)");

          }

          const { vertsPerPoly } = POLY_TYPES[polyType];
          if (polyhedra.length !== numPolyhedra * vertsPerPoly) {
            throw new Error("Dimension not matching (polyhedra)");
          }

          if (verticesLabels.length !== numVertices || polyhedraLabels.length !== numPolyhedra) {
            throw new Error("Dimension not matching (labels)");
          }
        }
      }
    }
    //Generate triangles and adjacency map from tetrahedra
    const tmp = this.generateTrianglesAndAdjacencyMap(polyhedra, polyType);
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
      polyhedra: polyhedra,
      polyType: polyType,
      triangleSoup: triangleSoup,
      adjacencyMap: adjacencyMap,
      polyCentroids: null,
      polyColor: null,
      polyDistortion: null,
      clampedPolyDistortion: null,
    };

    return new THREE.Mesh(geometry);
  }

  async loadOVM(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/);

    let lineIndex = 0;

    let header = null;

    var vertices = new Array();
    var numVertices = 0;
    var edges = new Array();
    var numEdges = 0;
    var faces = new Array();
    var triangles = new Array();
    var numFaces = 0;
    var ovmPolyhedra = new Array();
    var numOvmPolyhedra = 0;
    var polyhedra = new Array();
    var numPolyhedra = 0;
    var polyType = null;

    var adjacencyMap = new Map();

    function nextLine() {
      while (lineIndex < lines.length) {
        const newLine = lines[lineIndex].trim();
        lineIndex++;
        if (newLine.length > 0) {
          return newLine;
        }
      }

      return null;
    }


    header = nextLine();
    if (!header || !header.startsWith("OVM")) {
      throw new Error("Not a valid OVM file");
    }
    if(header.includes("BINARY")){
      throw new Error("OVM binary files are not supported");
    }

    var line;

    while ((line = nextLine()) !== null) {
      //Split the line into tokens
      var tokens = line.split(/\s+/);

      if (tokens[0] === "Vertices") {
        numVertices = parseInt(nextLine());
        for (let i = 0; i < numVertices; i++) {
          const cell = nextLine().split(/\s+/);
          vertices.push(parseFloat(cell[0]));
          vertices.push(parseFloat(cell[1]));
          vertices.push(parseFloat(cell[2]));
        }
      } else if (tokens[0] === "Edges") {
        numEdges = parseInt(nextLine());
        for (let i = 0; i < numEdges; i++) {
          const parts = nextLine().split(/\s+/);
          edges.push([parseInt(parts[0]), parseInt(parts[1])]);
        }
      } else if (tokens[0] === "Faces") {
        numFaces = parseInt(nextLine());
        for (let i = 0; i < numFaces; i++) {
          const parts = nextLine().split(/\s+/);
          const count = parseInt(parts[0]);
          const halfEdges = new Array();
          for (let k = 1; k <= count; k++) {
            halfEdges.push(parseInt(parts[k]));
          }
          faces.push(halfEdges);
        }
      } else if (tokens[0] === "Polyhedra") {
        numOvmPolyhedra = parseInt(nextLine());
        for (let i = 0; i < numOvmPolyhedra; i++) {
          const parts = nextLine().split(/\s+/);
          const count = parseInt(parts[0]);
          const halfFaces = new Array();
          for (let k = 1; k <= count; k++) {
            halfFaces.push(parseInt(parts[k]));
          }
          ovmPolyhedra.push(halfFaces);
        }
      }
    }

    for (let i = 0; i < ovmPolyhedra.length; i++) {
      const halfFaces = ovmPolyhedra[i];

      const vertexSet = new Set();

      for (const hf of halfFaces) {
        const faceIdx = Math.floor(hf / 2);
        const halfEdgeList = faces[faceIdx];

        for (const he of halfEdgeList) {
          const edgeIdx = Math.floor(he / 2);
          const edge = edges[edgeIdx];
          vertexSet.add(edge[0]);
          vertexSet.add(edge[1]);
        }
      }

      if (halfFaces.length === 4 && vertexSet.size === 4) {
        const [v0, v1, v2, v3] = [...vertexSet];
        polyhedra.push(v1, v0, v2, v3);
        if (!polyType) polyType = "TETRAHEDRON";
      } else if (halfFaces.length === 6 && vertexSet.size === 8) {
        const [v0, v1, v2, v3, v4, v5, v6, v7] = [...vertexSet];
        polyhedra.push(v0, v1, v2, v3, v4, v5, v6, v7);
        if (!polyType) polyType = "HEXAHEDRON";
      } else {
        console.warn(`Skipping polyhedron ${i}: unsupported type (${halfFaces.length} half-faces, ${vertexSet.size} vertices)`);
      }
    }

    numPolyhedra = polyhedra.length / POLY_TYPES[polyType].vertsPerPoly;

    if (!numVertices) {
      throw new Error("No vertices found in this file.")
    }
    if (!numPolyhedra) {
      throw new Error("No polyhedra found in this file.");

    }
    if (vertices.length !== numVertices * 3){
      throw new Error("Dimension not matching (vertices)");
    }

    const tmp = this.generateTrianglesAndAdjacencyMap(polyhedra, polyType);
    triangles = tmp.triangles;
    adjacencyMap = tmp.adjacencyMap;

    const triangleSoup = this.generateTriangleSoup(vertices, triangles);

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(
      new Float32Array(triangleSoup), 3
    );
    geometry.setAttribute("position", positionAttribute);

    geometry.userData = {
      vertices,
      triangles,
      polyhedra,
      polyType,
      triangleSoup,
      adjacencyMap,
      polyCentroids: null,
      polyColor: null,
      polyDistortion: null,
      clampedPolyDistortion: null,
    };

    return new THREE.Mesh(geometry);
  
  }

  async loadVTK(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/);

    let lineIndex = 0;

    const VTK_TETRA = 10;
    const VTK_HEXAHEDRON = 12;

    let format = null;

    var vertices = new Array();
    var numVertices = 0;
    var triangles = new Array();
    var polyhedra = new Array();
    var numPolyhedra = 0;
    var polyType = null;

    var cells = new Array();
    var numCells = 0;
    var cellTypes = new Array();
    var numCellTypes = 0;

    var adjacencyMap = new Map();

    function nextLine() {
      while (lineIndex < lines.length) {
        const newLine = lines[lineIndex].trim();
        lineIndex++;
        if (newLine.length > 0) {
          return newLine;
        }
      }

      return null;
    }

    //skip version and title
    lineIndex++;
    lineIndex++;

    format = nextLine();
    if (!format || format !== "ASCII") {
      throw new Error("Only ASCII VTK files supported");
    }

    //skip dataset type
    nextLine();

    var line;

    while ((line = nextLine()) !== null) {
      //Split the line into tokens
      var tokens = line.split(/\s+/);

      if (tokens[0] === "POINTS") {
        numVertices = parseInt(tokens[1]);
        for (let i = 0; i < numVertices; i++) {
          line = nextLine();
          if (line === null) {
            throw new Error("Not enough vertices in this file");
          }
          const vertex = line.split(/\s+/);
          for (let k = 0; k < 3; k++) {
            vertices.push(parseFloat(vertex[k]));
          }
        }
      } else if (tokens[0] === "CELLS") {
        numCells = parseInt(tokens[1]);
        for (let i = 0; i < numCells; i++) {
          line = nextLine();
          if (line === null) {
            throw new Error("Not enough cells in this file");
          }
          const cell = line.split(/\s+/);
          const count = parseInt(cell[0]);
          var ids = new Array();
          for (let k = 1; k <= count; k++) {
            ids.push(parseInt(cell[k]));
          }
          cells.push(ids);
        }
      } else if (tokens[0] === "CELL_TYPES") {
        numCellTypes = parseInt(tokens[1]);
        for (let i = 0; i < numCellTypes; i++) {
          line = nextLine();
          if (line === null) {
            throw new Error("Not enough cell types in this file");
          }
          const cellType = line.split(/\s+/);
          cellTypes.push(parseInt(cellType[0]));
        }
      }
    }

    for (let i = 0; i < cells.length; i++) {
      if (cellTypes[i] === VTK_TETRA) {
        const cell = cells[i];
        polyhedra.push(parseInt(cell[1]));
        polyhedra.push(parseInt(cell[0]));
        polyhedra.push(parseInt(cell[2]));
        polyhedra.push(parseInt(cell[3]));
        if (!polyType) polyType = "TETRAHEDRON";
      } else if (cellTypes[i] === VTK_HEXAHEDRON) {
        const cell = cells[i];
        for (let k = 0; k < 8; k++) {
          polyhedra.push(parseInt(cell[k]));
        }
        if (!polyType) polyType = "HEXAHEDRON";
      }
    }

    numPolyhedra = polyhedra.length / POLY_TYPES[polyType].vertsPerPoly;

    if (!numVertices) {
      throw new Error("No vertices found in this file.");
    }

    if (!numPolyhedra) {
      throw new Error("No polyhedra found in this file.");
    }

    if (vertices.length !== numVertices * 3) {
      throw new Error("Dimension not matching (vertices)");
    }
    //Generate triangles and adjacency map from tetrahedra
    const tmp = this.generateTrianglesAndAdjacencyMap(polyhedra, polyType);
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
      polyhedra: polyhedra,
      polyType: polyType,
      triangleSoup: triangleSoup,
      adjacencyMap: adjacencyMap,
      polyCentroids: null,
      polyColor: null,
      polyDistortion: null,
      clampedPolyDistortion: null,
    };

    return new THREE.Mesh(geometry);
  }

  async loadTxt(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/);

    let lineIndex = 0;

    var vertices = new Array();
    var numVertices = 0;
    var verticesIds = new Array();

    function nextLine() {
      while (lineIndex < lines.length) {
        const newLine = lines[lineIndex].trim();
        lineIndex++;
        if (newLine.length > 0) {
          return newLine;
        }
      }

      return null;
    }

    var line;

    while ((line = nextLine()) !== null) {
      //Split the line into tokens
      var tokens = line.split(/\s+/);

      const id = parseInt(tokens[0]);
      const x = parseFloat(tokens[1]);
      const y = parseFloat(tokens[2]);
      const z = parseFloat(tokens[3]);

      vertices.push(x, y, z);
      numVertices++;
      verticesIds.push(id);

    }

    if (!numVertices) {
      throw new Error("No vertices found in this file.");
    }

    if (vertices.length !== numVertices * 3) {
      throw new Error("Dimension not matching (vertices)");
    }

    if (verticesIds.length !== numVertices ) {
      throw new Error("Dimension not matching (verticesIds)");
    }


    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(new Float32Array(vertices), 3);
    geometry.setAttribute("position", positionAttribute);

    geometry.userData = {
      vertices: vertices,
      verticesIds: verticesIds,
      triangles: null,
      polyhedra: null,
      polyType: null,
      triangleSoup: null,
      adjacencyMap: null,
      polyCentroids: null,
      polyColor: null,
      polyDistortion: null,
      clampedPolyDistortion: null,
    };

    return new THREE.Mesh(geometry);
  }

  generateTrianglesAndAdjacencyMap(polyhedra, polyType = "TETRAHEDRON") {
    const { vertsPerPoly, faces } = POLY_TYPES[polyType];
    const triangles = [];
    const adjacencyMap = new Map();
    const faceKey = (face) => [...face].sort((a, b) => a - b).join(",");

    if (polyType !== "HEXAHEDRON") {
      for (let i = 0; i < polyhedra.length; i += vertsPerPoly) {
        const polyhedronVertices = polyhedra.slice(i, i + vertsPerPoly);
        const polyIndex = i / vertsPerPoly;

        for (const face of faces(polyhedronVertices)) {
          triangles.push(...face);

          const key = faceKey(face);
          if (!adjacencyMap.has(key)) adjacencyMap.set(key, []);
          adjacencyMap.get(key).push({ sortedFace: face, polyIndex });
        }
      }

      return { triangles, adjacencyMap };
    }

    const faceGroups = new Map();

    for (let i = 0; i < polyhedra.length; i += vertsPerPoly) {
      const polyhedronVertices = polyhedra.slice(i, i + vertsPerPoly);
      const polyIndex = i / vertsPerPoly;
      const polyhedronFaces = faces(polyhedronVertices);
      const quads = POLY_TYPES[polyType].quads(polyhedronVertices);

      polyhedronFaces.forEach((face, faceIndex) => {
        triangles.push(...face);

        const quadKey = faceKey(quads[Math.floor(faceIndex / 2)]);
        if (!faceGroups.has(quadKey)) faceGroups.set(quadKey, []);

        let polyhedronEntry = faceGroups.get(quadKey).find(
          entry => entry.polyIndex === polyIndex
        );
        if (!polyhedronEntry) {
          polyhedronEntry = { faces: [], polyIndex };
          faceGroups.get(quadKey).push(polyhedronEntry);
        }
        polyhedronEntry.faces.push(face);
      });
    }

    for (const polyhedraSharingFace of faceGroups.values()) {
      for (const representativeFace of polyhedraSharingFace[0].faces) {
        const key = faceKey(representativeFace);
        adjacencyMap.set(key, polyhedraSharingFace.map(polyhedron => ({
          sortedFace: polyhedron.faces.find(face => faceKey(face) === key) || representativeFace,
          polyIndex: polyhedron.polyIndex,
        })));
      }
    }

    return { triangles, adjacencyMap };
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
