import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./style.css";

const RESOURCES = ["wood", "stone", "wheat", "gold"];

const BUILDINGS = {
  farm: {
    label: "Farm",
    workerType: "farmer",
    outputResource: "wheat",
    outputPerWorker: 5,
    cost: { wood: 30, stone: 30 },
    color: 0xf6f1c6
  },
  quarry: {
    label: "Quarry",
    workerType: "mason",
    outputResource: "stone",
    outputPerWorker: 5,
    cost: { wood: 30, wheat: 30 },
    color: 0xd5d8dd
  },
  mine: {
    label: "Mine",
    workerType: "miner",
    outputResource: "gold",
    outputPerWorker: 5,
    cost: { wood: 30, stone: 30 },
    color: 0xc5c1b8
  },
  lumberyard: {
    label: "Lumberyard",
    workerType: "lumberjack",
    outputResource: "wood",
    outputPerWorker: 5,
    cost: { stone: 30, wheat: 30 },
    color: 0xd8c9a7
  }
};

const WORKER_COST = { gold: 20, wheat: 20 };
const MAX_WORKERS_PER_BUILDING = 4;
const GRID_SIZE = 8;
const CYCLE_MS = 6000;

const STARTING_RESOURCES = {
  wood: 140,
  stone: 60,
  wheat: 220,
  gold: 160
};

const state = {
  resources: { ...STARTING_RESOURCES },
  workers: {
    farmer: 0,
    mason: 0,
    miner: 0,
    lumberjack: 0
  },
  grid: Array.from({ length: GRID_SIZE * GRID_SIZE }, () => null),
  selectedIndex: null
};

const canAfford = (resources, cost) =>
  Object.entries(cost).every(([key, value]) => resources[key] >= value);

const subtractCost = (resources, cost) => {
  const next = { ...resources };
  Object.entries(cost).forEach(([key, value]) => {
    next[key] -= value;
  });
  return next;
};

const addResources = (resources, gains) => {
  const next = { ...resources };
  Object.entries(gains).forEach(([key, value]) => {
    next[key] += value;
  });
  return next;
};

const getProductionTotals = () => {
  const totals = Object.fromEntries(RESOURCES.map((key) => [key, 0]));
  state.grid.forEach((cell) => {
    if (!cell) return;
    const config = BUILDINGS[cell.type];
    totals[config.outputResource] += cell.workers * config.outputPerWorker;
  });
  return totals;
};

const buildOnSelected = (type) => {
  if (state.selectedIndex === null) return;
  if (state.grid[state.selectedIndex]) return;
  const config = BUILDINGS[type];
  if (!canAfford(state.resources, config.cost)) return;
  state.resources = subtractCost(state.resources, config.cost);
  state.grid[state.selectedIndex] = { type, workers: 1 };
  state.workers[config.workerType] += 1;
  renderAll();
};

const hireAndAssign = () => {
  if (state.selectedIndex === null) return;
  const cell = state.grid[state.selectedIndex];
  if (!cell) return;
  if (cell.workers >= MAX_WORKERS_PER_BUILDING) return;
  if (!canAfford(state.resources, WORKER_COST)) return;
  const workerType = BUILDINGS[cell.type].workerType;
  state.resources = subtractCost(state.resources, WORKER_COST);
  state.workers[workerType] += 1;
  cell.workers += 1;
  renderAll();
};

const selectCell = (index) => {
  state.selectedIndex = state.selectedIndex === index ? null : index;
  renderAll();
};

const cycleEl = document.getElementById("cycle");
const resourcesEl = document.getElementById("resources");
const buildPanelEl = document.getElementById("build-panel");
const selectionEl = document.getElementById("selection");

const renderResources = () => {
  resourcesEl.innerHTML = RESOURCES.map(
    (key) => `
      <div class="resource">
        <span class="label">${key}</span>
        <span class="value">${state.resources[key]}</span>
      </div>
    `
  ).join("");
};

const renderBuildPanel = () => {
  const selectedCell =
    state.selectedIndex !== null ? state.grid[state.selectedIndex] : null;
  if (state.selectedIndex === null || selectedCell) {
    buildPanelEl.innerHTML =
      "<p>Select an empty tile to see building options.</p>";
    return;
  }

  buildPanelEl.innerHTML = Object.entries(BUILDINGS)
    .map(([key, config]) => {
      const affordable = canAfford(state.resources, config.cost);
      const costText = Object.entries(config.cost)
        .map(([res, value]) => `${value} ${res}`)
        .join(", ");
      return `
        <button class="tile-button" data-build="${key}" ${
          affordable ? "" : "disabled"
        }>
          <span>${config.label}</span>
          <small>Cost: ${costText}</small>
        </button>
      `;
    })
    .join("");

  buildPanelEl.querySelectorAll("[data-build]").forEach((button) => {
    button.addEventListener("click", () => {
      buildOnSelected(button.dataset.build);
    });
  });
};

const renderSelection = () => {
  if (state.selectedIndex === null) {
    selectionEl.innerHTML = "<p>Select a tile to manage it.</p>";
    return;
  }

  const cell = state.grid[state.selectedIndex];
  if (!cell) {
    selectionEl.innerHTML = "<p>Choose a building to place on this tile.</p>";
    return;
  }

  const config = BUILDINGS[cell.type];
  const full = cell.workers >= MAX_WORKERS_PER_BUILDING;
  const canHire = canAfford(state.resources, WORKER_COST);

  selectionEl.innerHTML = `
    <div class="selection">
      <div class="selection-title">${config.label}</div>
      <div>Worker type: ${config.workerType}</div>
      <div>Workers: ${cell.workers} / ${MAX_WORKERS_PER_BUILDING}</div>
      <div>Output: ${config.outputPerWorker} ${config.outputResource} per worker</div>
      <div>Hire cost: 20 gold + 20 wheat</div>
      <div class="selection-actions">
        <button id="assign-btn" ${full || !canHire ? "disabled" : ""}>Assign</button>
      </div>
    </div>
  `;

  const assignBtn = document.getElementById("assign-btn");
  if (assignBtn) {
    assignBtn.addEventListener("click", hireAndAssign);
  }
};

const renderAll = () => {
  renderResources();
  renderBuildPanel();
  renderSelection();
  updateTiles();
};

let nextCycleAt = Date.now() + CYCLE_MS;
setInterval(() => {
  const production = getProductionTotals();
  state.resources = addResources(state.resources, production);
  nextCycleAt = Date.now() + CYCLE_MS;
  renderResources();
}, CYCLE_MS);

setInterval(() => {
  const remaining = Math.max(0, nextCycleAt - Date.now());
  cycleEl.textContent = `Next cycle in: ${(remaining / 1000).toFixed(1)}s`;
}, 200);

const gameEl = document.getElementById("game");
const tooltip = document.createElement("div");
tooltip.className = "tooltip";
tooltip.style.position = "absolute";
tooltip.style.pointerEvents = "none";
tooltip.style.display = "none";
const gameWrap = gameEl.parentElement;
if (gameWrap) {
  gameWrap.style.position = "relative";
  gameWrap.appendChild(tooltip);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xefe4d2);

const camera = new THREE.PerspectiveCamera(
  45,
  gameEl.clientWidth / gameEl.clientHeight,
  0.1,
  1000
);

camera.position.set(8, 10, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(gameEl.clientWidth, gameEl.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
gameEl.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 6;
controls.maxDistance = 20;
controls.target.set(0, 0, 0);
controls.update();

const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(10, 20, 10);
scene.add(dir);

const gridGroup = new THREE.Group();
scene.add(gridGroup);

const tileSize = 1;
const tileGeom = new THREE.PlaneGeometry(tileSize, tileSize);

tileGeom.rotateX(-Math.PI / 2);

const tileMeshes = [];
const buildingMeshes = [];

for (let row = 0; row < GRID_SIZE; row += 1) {
  for (let col = 0; col < GRID_SIZE; col += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: 0xf7f1e6,
      roughness: 0.9,
      metalness: 0.0
    });
    const mesh = new THREE.Mesh(tileGeom, material);
    mesh.position.set(
      (col - (GRID_SIZE - 1) / 2) * tileSize,
      0,
      (row - (GRID_SIZE - 1) / 2) * tileSize
    );
    mesh.userData = { index: row * GRID_SIZE + col };
    gridGroup.add(mesh);
    tileMeshes.push(mesh);

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(tileSize * 0.6, tileSize * 0.6, tileSize * 0.6),
      new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    building.position.copy(mesh.position);
    building.position.y = tileSize * 0.3;
    building.visible = false;
    gridGroup.add(building);
    buildingMeshes.push(building);
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const updateTiles = () => {
  tileMeshes.forEach((mesh) => {
    mesh.material.color.set(0xf7f1e6);
  });
  buildingMeshes.forEach((mesh) => {
    mesh.visible = false;
  });

  state.grid.forEach((cell, index) => {
    if (!cell) return;
    const config = BUILDINGS[cell.type];
    const building = buildingMeshes[index];
    building.material.color.set(config.color);
    building.visible = true;
  });

  if (state.selectedIndex !== null) {
    tileMeshes[state.selectedIndex].material.color.set(0xf0d6a6);
  }
};

const onPointerMove = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(tileMeshes);
  if (intersects.length === 0) {
    tooltip.style.display = "none";
    return;
  }
  const index = intersects[0].object.userData.index;
  const cell = state.grid[index];
  if (!cell) {
    tooltip.style.display = "none";
    return;
  }
  const config = BUILDINGS[cell.type];
  tooltip.textContent = `${config.label} (${cell.workers}/${MAX_WORKERS_PER_BUILDING})`;
  tooltip.style.left = `${event.clientX - rect.left + 12}px`;
  tooltip.style.top = `${event.clientY - rect.top + 12}px`;
  tooltip.style.display = "block";
};

const onPointerDown = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(tileMeshes);
  if (intersects.length === 0) return;
  const index = intersects[0].object.userData.index;
  selectCell(index);
};

renderer.domElement.addEventListener("pointermove", onPointerMove);
renderer.domElement.addEventListener("pointerdown", onPointerDown);

const onResize = () => {
  const width = gameEl.clientWidth;
  const height = gameEl.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

window.addEventListener("resize", onResize);

const animate = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

renderAll();
animate();
