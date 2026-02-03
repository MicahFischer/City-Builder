import Phaser from "phaser";
import "./style.css";

const RESOURCES = ["wood", "stone", "wheat", "gold"];

const BUILDINGS = {
  farm: {
    label: "Farm",
    workerType: "farmer",
    outputResource: "wheat",
    outputPerWorker: 5,
    cost: { wood: 30, stone: 30 },
    colors: {
      top: 0xf6f1c6,
      left: 0xe6dba9,
      right: 0xd8ca8c
    }
  },
  quarry: {
    label: "Quarry",
    workerType: "mason",
    outputResource: "stone",
    outputPerWorker: 5,
    cost: { wood: 30, wheat: 30 },
    colors: {
      top: 0xd5d8dd,
      left: 0xc3c7cf,
      right: 0xb3b8c2
    }
  },
  mine: {
    label: "Mine",
    workerType: "miner",
    outputResource: "gold",
    outputPerWorker: 5,
    cost: { wood: 30, stone: 30 },
    colors: {
      top: 0xc5c1b8,
      left: 0xb0aaa0,
      right: 0x9e978c
    }
  },
  lumberyard: {
    label: "Lumberyard",
    workerType: "lumberjack",
    outputResource: "wood",
    outputPerWorker: 5,
    cost: { stone: 30, wheat: 30 },
    colors: {
      top: 0xd8c9a7,
      left: 0xc7b58f,
      right: 0xb8a67f
    }
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
        <button class="tile-button" data-build="${key}" $${
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
  drawGrid();
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

const TILE_WIDTH = 72;
const TILE_HEIGHT = 36;
const GRID_ORIGIN = { x: 360, y: 120 };
const COLORS = {
  empty: 0xf7f1e6,
  outline: 0xb69769,
  selected: 0x81572a
};

let graphics;
let sceneRef;
let workerTexts = [];
let labelTexts = [];

const isoToScreen = (col, row) => {
  return {
    x: (col - row) * (TILE_WIDTH / 2) + GRID_ORIGIN.x,
    y: (col + row) * (TILE_HEIGHT / 2) + GRID_ORIGIN.y
  };
};

const screenToIso = (x, y) => {
  const dx = x - GRID_ORIGIN.x;
  const dy = y - GRID_ORIGIN.y;
  const col = Math.floor((dx / (TILE_WIDTH / 2) + dy / (TILE_HEIGHT / 2)) / 2);
  const row = Math.floor((dy / (TILE_HEIGHT / 2) - dx / (TILE_WIDTH / 2)) / 2);
  return { col, row };
};

const drawDiamond = (x, y, fill, stroke, thickness = 2) => {
  graphics.fillStyle(fill, 1);
  graphics.beginPath();
  graphics.moveTo(x, y - TILE_HEIGHT / 2);
  graphics.lineTo(x + TILE_WIDTH / 2, y);
  graphics.lineTo(x, y + TILE_HEIGHT / 2);
  graphics.lineTo(x - TILE_WIDTH / 2, y);
  graphics.closePath();
  graphics.fillPath();
  graphics.lineStyle(thickness, stroke, 1);
  graphics.strokePath();
};

const drawIsoBlock = (x, y, colors, stroke) => {
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;
  const height = TILE_HEIGHT;

  // Top
  graphics.fillStyle(colors.top, 1);
  graphics.beginPath();
  graphics.moveTo(x, y - halfH - height);
  graphics.lineTo(x + halfW, y - height);
  graphics.lineTo(x, y + halfH - height);
  graphics.lineTo(x - halfW, y - height);
  graphics.closePath();
  graphics.fillPath();

  // Left
  graphics.fillStyle(colors.left, 1);
  graphics.beginPath();
  graphics.moveTo(x - halfW, y - height);
  graphics.lineTo(x, y + halfH - height);
  graphics.lineTo(x, y + halfH);
  graphics.lineTo(x - halfW, y);
  graphics.closePath();
  graphics.fillPath();

  // Right
  graphics.fillStyle(colors.right, 1);
  graphics.beginPath();
  graphics.moveTo(x + halfW, y - height);
  graphics.lineTo(x, y + halfH - height);
  graphics.lineTo(x, y + halfH);
  graphics.lineTo(x + halfW, y);
  graphics.closePath();
  graphics.fillPath();

  // Outline top
  graphics.lineStyle(2, stroke, 1);
  graphics.beginPath();
  graphics.moveTo(x, y - halfH - height);
  graphics.lineTo(x + halfW, y - height);
  graphics.lineTo(x, y + halfH - height);
  graphics.lineTo(x - halfW, y - height);
  graphics.closePath();
  graphics.strokePath();
};

const clearWorkerTexts = () => {
  workerTexts.forEach((text) => text.destroy());
  workerTexts = [];
};

const clearLabelTexts = () => {
  labelTexts.forEach((text) => text.destroy());
  labelTexts = [];
};

const drawGrid = () => {
  if (!graphics) return;
  graphics.clear();
  clearWorkerTexts();
  clearLabelTexts();

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const index = row * GRID_SIZE + col;
      const cell = state.grid[index];
      const { x, y } = isoToScreen(col, row);
      const isSelected = state.selectedIndex === index;
      drawDiamond(
        x,
        y,
        COLORS.empty,
        isSelected ? COLORS.selected : COLORS.outline
      );
      if (cell) {
        const colors = BUILDINGS[cell.type].colors;
        drawIsoBlock(x, y, colors, COLORS.outline);
        const label = sceneRef.add.text(x - 8, y - 28, configLabel(cell.type), {
          fontSize: "12px",
          color: "#1f1a12",
          fontStyle: "bold"
        });
        labelTexts.push(label);
        const text = sceneRef.add.text(x - 6, y - 8, `${cell.workers}`, {
          fontSize: "12px",
          color: "#1f1a12"
        });
        workerTexts.push(text);
      }
    }
  }
};

const configLabel = (type) => {
  const label = BUILDINGS[type]?.label ?? "?";
  return label.charAt(0).toUpperCase();
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 720,
  height: 580,
  parent: "game",
  backgroundColor: "#efe4d2",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: {
    create() {
      sceneRef = this;
      graphics = this.add.graphics();
      drawGrid();
      this.input.on("pointerdown", (pointer) => {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const { col, row } = screenToIso(worldPoint.x, worldPoint.y);
        if (col < 0 || row < 0 || col >= GRID_SIZE || row >= GRID_SIZE) return;
        const index = row * GRID_SIZE + col;
        selectCell(index);
      });
    }
  }
});

renderAll();
