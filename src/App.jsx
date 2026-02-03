import { useEffect, useMemo, useRef, useState } from "react";
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
  wood: 140,
  stone: 60,
  wheat: 220,
  gold: 160
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
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [workers, setWorkers] = useState(
    Object.fromEntries(WORKER_TYPES.map((type) => [type, 0]))
  );
  const [nextCycleAt, setNextCycleAt] = useState(Date.now() + CYCLE_MS);
  const [timeLeftMs, setTimeLeftMs] = useState(CYCLE_MS);

  const assignedByType = useMemo(() => getAssignedByType(grid), [grid]);
  const availableWorkers = useMemo(() => {
    const result = {};
    WORKER_TYPES.forEach((type) => {
      result[type] = workers[type] - assignedByType[type];
    });
    return result;
  }, [workers, assignedByType]);

  const productionTotals = useMemo(() => getProductionTotals(grid), [grid]);

  const productionRef = useRef(productionTotals);

  useEffect(() => {
    productionRef.current = productionTotals;
  }, [productionTotals]);

  useEffect(() => {
    const id = setInterval(() => {
      setResources((current) => addResources(current, productionRef.current));
      setNextCycleAt(Date.now() + CYCLE_MS);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, nextCycleAt - Date.now());
      setTimeLeftMs(remaining);
    }, 200);
    return () => clearInterval(id);
  }, [nextCycleAt]);

  const handleCellClick = (index) => {
    setSelectedIndex((current) => (current === index ? null : index));
  };

  const buildOnSelected = (type) => {
    if (selectedIndex === null) return;
    if (grid[selectedIndex]) return;
    const config = BUILDINGS[type];
    if (!canAfford(resources, config.cost)) return;
    const nextGrid = [...grid];
    nextGrid[selectedIndex] = { type, workers: 1 };
    setGrid(nextGrid);
    setResources((current) => subtractCost(current, config.cost));
    setWorkers((current) => ({
      ...current,
      [config.workerType]: current[config.workerType] + 1
    }));
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

  const hireAndAssign = () => {
    if (selectedIndex === null) return;
    const cell = grid[selectedIndex];
    if (!cell) return;
    if (cell.workers >= MAX_WORKERS_PER_BUILDING) return;
    if (!canAfford(resources, WORKER_COST)) return;
    const workerType = BUILDINGS[cell.type].workerType;
    setResources((current) => subtractCost(current, WORKER_COST));
    setWorkers((current) => ({
      ...current,
      [workerType]: current[workerType] + 1
    }));
    const nextGrid = [...grid];
    nextGrid[selectedIndex] = { ...cell, workers: cell.workers + 1 };
    setGrid(nextGrid);
  };

  const selectedCell = selectedIndex !== null ? grid[selectedIndex] : null;
  const selectedIsEmpty = selectedIndex !== null && !selectedCell;
  const selectedWorkerType = selectedCell
    ? BUILDINGS[selectedCell.type].workerType
    : null;
  const selectedAvailable = selectedWorkerType
    ? availableWorkers[selectedWorkerType]
    : 0;
  const selectedFull = selectedCell
    ? selectedCell.workers >= MAX_WORKERS_PER_BUILDING
    : false;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>City Builder MVP</h1>
          <p>Medieval resource management prototype</p>
        </div>
        <div className="cycle">
          Next cycle in: {(timeLeftMs / 1000).toFixed(1)}s
        </div>
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
          {selectedIsEmpty ? (
            <div className="build-list">
              {Object.entries(BUILDINGS).map(([key, config]) => {
                const affordable = canAfford(resources, config.cost);
                return (
                  <button
                    key={key}
                    className="tile-button"
                    onClick={() => buildOnSelected(key)}
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
          ) : (
            <p>Select an empty tile to see building options.</p>
          )}

          <h2>Workers</h2>
          <p>Hire and assign workers from a selected building.</p>
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
                Worker type: {selectedWorkerType}
              </div>
              <div className="selection-detail">
                Workers: {selectedCell.workers} / {MAX_WORKERS_PER_BUILDING}
              </div>
              <div className="selection-detail">
                Output: {BUILDINGS[selectedCell.type].outputPerWorker} {" "}
                {BUILDINGS[selectedCell.type].outputResource} per worker
              </div>
              <div className="selection-detail">
                Available:{" "}
                {selectedAvailable}
              </div>
              <div className="selection-actions">
                <button onClick={() => adjustWorkers(-1)}>-</button>
                <button
                  onClick={() => adjustWorkers(1)}
                  disabled={selectedFull || selectedAvailable <= 0}
                >
                  Assign
                </button>
                <button
                  onClick={hireAndAssign}
                  disabled={selectedFull || !canAfford(resources, WORKER_COST)}
                >
                  Hire + Assign
                </button>
              </div>
            </div>
          ) : (
            <p>
              {selectedIsEmpty
                ? "Choose a building to place on this tile."
                : "Select a tile to manage it."}
            </p>
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
