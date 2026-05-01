'use client';

import { useState, useEffect } from 'react';
import { BrainCircuit, ShieldCheck, Skull, Wind, Settings2, PlayCircle } from 'lucide-react';
import { KnowledgeBase, generatePerceptRules } from '@/lib/wumpus-logic';

type CellData = {
  isPit: boolean;
  isWumpus: boolean;
  isAgent: boolean;
  visited: boolean;
  status: 'Unknown' | 'Safe' | 'Pit' | 'Wumpus';
};

export default function WumpusDashboard() {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [agentPos, setAgentPos] = useState({ x: 0, y: 0 });
  const [activePercepts, setActivePercepts] = useState<string[]>([]);
  const [inferenceSteps, setInferenceSteps] = useState(0);
  const [kb] = useState(() => new KnowledgeBase());
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize Environment
  const initEnvironment = () => {
    kb.clauses = [];
    setInferenceSteps(0);
    setActivePercepts([]);
    
    const newGrid: CellData[][] = Array(rows).fill(null).map(() => 
      Array(cols).fill(null).map(() => ({
        isPit: Math.random() < 0.15, // 15% chance of pit
        isWumpus: false,
        isAgent: false,
        visited: false,
        status: 'Unknown'
      }))
    );

    // Ensure start is safe
    newGrid[0][0].isPit = false;
    newGrid[0][0].isWumpus = false;
    newGrid[0][0].isAgent = true;
    newGrid[0][0].visited = true;
    newGrid[0][0].status = 'Safe';

    // Place exactly 1 Wumpus
    let wx, wy;
    do {
      wx = Math.floor(Math.random() * rows);
      wy = Math.floor(Math.random() * cols);
    } while ((wx === 0 && wy === 0) || newGrid[wx][wy].isPit);
    newGrid[wx][wy].isWumpus = true;

    setGrid(newGrid);
    setAgentPos({ x: 0, y: 0 });
    setIsPlaying(true);
    
    // Initial KB setup
    processCell(0, 0, newGrid);
  };

  const processCell = (x: number, y: number, currentGrid: CellData[][]) => {
    // 1. Determine Percepts for current cell
    const percepts = [];
    const isAdjacentTo = (type: 'isPit' | 'isWumpus') => {
      const adj = [
        {dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}
      ];
      return adj.some(d => {
        const nx = x + d.dx, ny = y + d.dy;
        return nx >= 0 && nx < rows && ny >= 0 && ny < cols && currentGrid[nx][ny][type];
      });
    };

    if (isAdjacentTo('isPit')) percepts.push('Breeze');
    if (isAdjacentTo('isWumpus')) percepts.push('Stench');
    
    setActivePercepts(percepts.length > 0 ? percepts : ['None']);

    // 2. Update KB with known facts
    kb.tell([[`~P_${x}_${y}`]]); // We are alive, so no pit here
    kb.tell([[`~W_${x}_${y}`]]); // We are alive, so no wumpus here
    kb.tell(generatePerceptRules(x, y, rows, cols));

    if (percepts.includes('Breeze')) kb.tell([[`B_${x}_${y}`]]);
    else kb.tell([[`~B_${x}_${y}`]]);

    if (percepts.includes('Stench')) kb.tell([[`S_${x}_${y}`]]);
    else kb.tell([[`~S_${x}_${y}`]]);

    // 3. Inference: Evaluate adjacent unvisited cells
    const adj = [
      {dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}
    ];
    
    let totalSteps = 0;
    const updatedGrid = [...currentGrid];

    adj.forEach(d => {
      const nx = x + d.dx, ny = y + d.dy;
      if (nx >= 0 && nx < rows && ny >= 0 && ny < cols && !updatedGrid[nx][ny].visited) {
        // ASK KB: Is it safe? (Prove ~P ^ ~W)
        const noPit = kb.ask(`~P_${nx}_${ny}`);
        totalSteps += kb.inferenceSteps;
        
        const noWumpus = kb.ask(`~W_${nx}_${ny}`);
        totalSteps += kb.inferenceSteps;

        if (noPit && noWumpus) {
          updatedGrid[nx][ny].status = 'Safe';
        } else if (kb.ask(`P_${nx}_${ny}`)) {
          updatedGrid[nx][ny].status = 'Pit';
        } else if (kb.ask(`W_${nx}_${ny}`)) {
          updatedGrid[nx][ny].status = 'Wumpus';
        }
      }
    });

    setInferenceSteps(prev => prev + totalSteps);
    setGrid(updatedGrid);
  };

  const moveAgent = (dx: number, dy: number) => {
    const nx = agentPos.x + dx;
    const ny = agentPos.y + dy;

    if (nx >= 0 && nx < rows && ny >= 0 && ny < cols) {
      const newGrid = [...grid];
      newGrid[agentPos.x][agentPos.y].isAgent = false;
      
      // Game Over Check
      if (newGrid[nx][ny].isPit || newGrid[nx][ny].isWumpus) {
         alert(`Game Over! You hit a ${newGrid[nx][ny].isPit ? 'Pit' : 'Wumpus'}!`);
         setIsPlaying(false);
      }

      newGrid[nx][ny].isAgent = true;
      newGrid[nx][ny].visited = true;
      newGrid[nx][ny].status = 'Safe';
      
      setAgentPos({ x: nx, y: ny });
      setGrid(newGrid);
      
      if (isPlaying) {
        processCell(nx, ny, newGrid);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key === 'ArrowUp') moveAgent(-1, 0);
      if (e.key === 'ArrowDown') moveAgent(1, 0);
      if (e.key === 'ArrowLeft') moveAgent(0, -1);
      if (e.key === 'ArrowRight') moveAgent(0, 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [agentPos, isPlaying, grid]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans p-8 selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-white/10 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BrainCircuit className="text-indigo-500" size={32} />
              A.R.C.A. Wumpus Agent
            </h1>
            <p className="text-zinc-500 mt-2 text-sm">Dynamic Resolution Refutation Engine</p>
          </div>
          
          <div className="flex gap-4 items-center bg-white/5 p-2 rounded-xl border border-white/10">
            <div className="flex flex-col px-3">
              <label className="text-xs text-zinc-500">Rows</label>
              <input type="number" min="3" max="8" value={rows} onChange={(e) => setRows(Number(e.target.value))} className="bg-transparent text-white outline-none w-12" />
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col px-3">
              <label className="text-xs text-zinc-500">Cols</label>
              <input type="number" min="3" max="8" value={cols} onChange={(e) => setCols(Number(e.target.value))} className="bg-transparent text-white outline-none w-12" />
            </div>
            <button onClick={initEnvironment} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
              <PlayCircle size={18} /> Initialize Episode
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Grid Visualizer */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Environment Matrix</h2>
              <p className="text-xs text-zinc-500">Use arrow keys to navigate</p>
            </div>
            
            {grid.length > 0 ? (
              <div 
                className="grid gap-2" 
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {grid.map((row, i) => row.map((cell, j) => {
                  let bgColor = 'bg-zinc-800/50';
                  let borderColor = 'border-white/5';
                  
                  if (cell.status === 'Safe' && cell.visited) {
                    bgColor = 'bg-emerald-500/10';
                    borderColor = 'border-emerald-500/30';
                  } else if (cell.status === 'Safe' && !cell.visited) {
                    bgColor = 'bg-emerald-500/5';
                    borderColor = 'border-emerald-500/50 border-dashed';
                  } else if (cell.status === 'Pit' || cell.status === 'Wumpus') {
                    bgColor = 'bg-rose-500/10';
                    borderColor = 'border-rose-500/50';
                  }

                  return (
                    <div 
                      key={`${i}-${j}`}
                      className={`aspect-square rounded-xl border ${bgColor} ${borderColor} flex items-center justify-center relative transition-all duration-300`}
                    >
                      <span className="absolute top-2 left-2 text-[10px] text-zinc-600 font-mono">{i},{j}</span>
                      
                      {cell.isAgent && (
                        <div className="absolute inset-0 m-auto w-8 h-8 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center">
                          <div className="w-4 h-4 bg-white rounded-full"></div>
                        </div>
                      )}
                      
                      {!cell.isAgent && cell.status === 'Pit' && <div className="text-rose-500 font-bold opacity-50">PIT</div>}
                      {!cell.isAgent && cell.status === 'Wumpus' && <Skull className="text-rose-500 opacity-50" size={32} />}
                      {!cell.isAgent && cell.status === 'Safe' && !cell.visited && <ShieldCheck className="text-emerald-500/50" size={24} />}
                    </div>
                  );
                }))}
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-zinc-600 flex-col gap-4 border-2 border-dashed border-white/5 rounded-xl">
                <Settings2 size={48} className="opacity-50" />
                <p>Initialize Environment to begin simulation</p>
              </div>
            )}
          </div>

          {/* Metrics Dashboard */}
          <div className="space-y-6">
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Telemetry & Metrics</h3>
              <div className="space-y-4">
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-zinc-500 mb-1">Total Inference Steps</div>
                  <div className="text-3xl font-mono text-indigo-400">{inferenceSteps.toLocaleString()}</div>
                </div>
                
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-zinc-500 mb-3">Active Percepts</div>
                  <div className="flex flex-wrap gap-2">
                    {activePercepts.map((p, i) => (
                      <span key={i} className={`px-3 py-1 text-xs font-medium rounded-full ${
                        p === 'Breeze' ? 'bg-cyan-500/20 text-cyan-400' :
                        p === 'Stench' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {p === 'Breeze' && <Wind size={12} className="inline mr-1" />}
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
               <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Legend</h3>
               <div className="space-y-3 text-sm">
                 <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/30"></div> Safe (Visited)</div>
                 <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-emerald-500/5 border border-dashed border-emerald-500/50"></div> Safe (Deduced)</div>
                 <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-zinc-800/50 border border-white/5"></div> Unknown</div>
                 <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-rose-500/10 border border-rose-500/50"></div> Hazard (Confirmed)</div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
