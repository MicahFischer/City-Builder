import { useEffect, useMemo, useState } from "react";
import {
  BUILDINGS,
  CYCLE_MS,
  GRID_SIZE,
  MAX_WORKERS_PER_BUILDING,
  RESOURCES,
  WORKER_COST,
  WORKER_TYPES
} from "./game.js";
import "./App.css";

const STARTING_RESOURCES = {
  wood: 120,
  stone: 60,
  wheat: 80,
  gold: 40
};

const emptyGrid = () => Array.from({ length: GRID_SIZE * GRID_SIZE }, () => null);

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

const getAssignedByType = (grid) => {
  const totals = Object.fromEntries(WORKER_TYPES.map((type) => [type, 0]));
  grid.forEach((cell) => {
    if (!cell) return;
    const workerType = BUILDINGS[cell.type].workerType;
    totals[workerType] += cell.workers;
  });
  return totals;
};

const getProductionTotals = (grid) => {
  const totals = Object.fromEntries(RESOURCES.map((key) => [key, 0]));
  grid.forEach((cell) => {
    if (!cell) return;
    const config = BUILDINGS[cell.type];
    totals[config.outputResource] += cell.workers * config.outputPerWorker;
  });
  return totals;
};

export default function App() {
  const [resources, setResources] = useState(STARTING_RESOURCES);
  const [grid, setGrid] = useState(emptyGrid);
  const [selectedBuild, setSelectedBuild] = useState("farm");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [workers, setWorkers] = useState(
    Object.fromEntries(WORKER_TYPES.map((type) => [type, 0]))
  );

  const assignedByType = useMemo(() => getAssignedByType(grid), [grid]);
  const availableWorkers = useMemo(() => {
    const result = {};
    WORKER_TYPES.forEach((type) => {
      result[type] = workers[type] - assignedByType[type];
    });
    return result;
  }, [workers, assignedByType]);

  const productionTotals = useMemo(() => getProductionTotals(grid), [grid]);

  useEffect(() => {
    const id = setInterval(() => {
      setResources((current) => addResources(current, productionTotals));
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [productionTotals]);

  const handleCellClick = (index) => {
    const cell = grid[index];
    if (cell) {
      setSelectedIndex(index);
      return;
    }
    if (!selectedBuild) return;

    const config = BUILDINGS[selectedBuild];
    if (!canAfford(resources, config.cost)) return;

    const nextGrid = [...grid];
    nextGrid[index] = { type: selectedBuild, workers: 0 };
    setGrid(nextGrid);
    setResources((current) => subtractCost(current, config.cost));
    setSelectedIndex(index);
  };

  const adjustWorkers = (delta) => {
    if (selectedIndex === null) return;
    const cell = grid[selectedIndex];
    if (!cell) return;

    const workerType = BUILDINGS[cell.type].workerType;
    if (delta > 0 && availableWorkers[workerType] <= 0) return;
    if (delta < 0 && cell.workers <= 0) return;

    const nextGrid = [...grid];
    const nextWorkers = Math.min(
      MAX_WORKERS_PER_BUILDING,
      Math.max(0, cell.workers + delta)
    );
    nextGrid[selectedIndex] = { ...cell, workers: nextWorkers };
    setGrid(nextGrid);
  };

  const hireWorker = (type) => {
    if (!canAfford(resources, WORKER_COST)) return;
    setResources((current) => subtractCost(current, WORKER_COST));
    setWorkers((current) => ({
      ...current,
      [type]: current[type] + 1
    }));
  };

  const selectedCell = selectedIndex !== null ? grid[selectedIndex] : null;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>City Builder MVP</h1>
          <p>Medieval resource management prototype</p>
        </div>
        <div className="cycle">Cycle: {CYCLE_MS / 1000}s</div>
      </header>

      <section className="resources">
        {RESOURCES.map((key) => (
          <div key={key} className="resource">
            <span className="label">{key}</span>
            <span className="value">{resources[key]}</span>
          </div>
        ))}
      </section>

      <main className="layout">
        <section className="panel">
          <h2>Build</h2>
          <div className="build-list">
            {Object.entries(BUILDINGS).map(([key, config]) => {
              const affordable = canAfford(resources, config.cost);
              const isActive = selectedBuild === key;
              return (
                <button
                  key={key}
                  className={`tile-button ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedBuild(key)}
                  disabled={!affordable}
                >
                  <span>{config.label}</span>
                  <small>
                    Cost: {Object.entries(config.cost)
                      .map(([res, value]) => `${value} ${res}`)
                      .join(", ")}
                  </small>
                </button>
              );
            })}
          </div>

          <h2>Hire Workers</h2>
          <div className="worker-list">
            {WORKER_TYPES.map((type) => (
              <button
                key={type}
                className="tile-button"
                onClick={() => hireWorker(type)}
                disabled={!canAfford(resources, WORKER_COST)}
              >
                <span>{type}</span>
                <small>
                  Total: {workers[type]} | Available: {availableWorkers[type]}
                </small>
              </button>
            ))}
            <div className="worker-cost">
              Hire cost: 20 gold + 20 wheat
            </div>
          </div>
        </section>

        <section className="grid">
          {grid.map((cell, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={index}
                className={`cell ${cell ? cell.type : "empty"} ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => handleCellClick(index)}
              >
                {cell ? BUILDINGS[cell.type].label : ""}
                {cell && <span className="cell-workers">{cell.workers}</span>}
              </button>
            );
          })}
        </section>

        <section className="panel">
          <h2>Selection</h2>
          {selectedCell ? (
            <div className="selection">
              <div className="selection-title">
                {BUILDINGS[selectedCell.type].label}
              </div>
              <div className="selection-detail">
                Workers: {selectedCell.workers} / {MAX_WORKERS_PER_BUILDING}
              </div>
              <div className="selection-detail">
                Output: {BUILDINGS[selectedCell.type].outputPerWorker} {" "}
                {BUILDINGS[selectedCell.type].outputResource} per worker
              </div>
              <div className="selection-actions">
                <button onClick={() => adjustWorkers(-1)}>-</button>
                <button onClick={() => adjustWorkers(1)}>+</button>
              </div>
            </div>
          ) : (
            <p>Select a structure to manage workers.</p>
          )}

          <h2>Production / Cycle</h2>
          <div className="production">
            {RESOURCES.map((key) => (
              <div key={key}>
                +{productionTotals[key]} {key}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
