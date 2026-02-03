export const RESOURCES = ["wood", "stone", "wheat", "gold"];

export const BUILDINGS = {
  farm: {
    label: "Farm",
    workerType: "farmer",
    outputResource: "wheat",
    outputPerWorker: 5,
    cost: { wood: 30, stone: 20 }
  },
  quarry: {
    label: "Quarry",
    workerType: "mason",
    outputResource: "stone",
    outputPerWorker: 5,
    cost: { wood: 30, wheat: 30 }
  },
  mine: {
    label: "Mine",
    workerType: "miner",
    outputResource: "gold",
    outputPerWorker: 5,
    cost: { wood: 40, stone: 40, wheat: 30 }
  },
  lumberyard: {
    label: "Lumberyard",
    workerType: "lumberjack",
    outputResource: "wood",
    outputPerWorker: 5,
    cost: { wood: 40 }
  }
};

export const WORKER_TYPES = ["farmer", "mason", "miner", "lumberjack"];

export const WORKER_COST = { gold: 20, wheat: 20 };

export const MAX_WORKERS_PER_BUILDING = 4;

export const GRID_SIZE = 8;

export const CYCLE_MS = 6000;
