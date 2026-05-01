export type Point = { x: number; y: number };
export type Percept = 'Breeze' | 'Stench' | 'None';
export type CellState = 'Safe' | 'Unknown' | 'Pit' | 'Wumpus';

export class KnowledgeBase {
  // Store clauses as stringified arrays for ultra-fast Set lookups (O(1) instead of O(n))
  clauses: Set<string> = new Set();
  inferenceSteps: number = 0;

  tell(newClauses: string[][]) {
    for (const clause of newClauses) {
      const sortedClause = Array.from(new Set(clause)).sort();
      this.clauses.add(JSON.stringify(sortedClause));
    }
  }

  ask(query: string): boolean {
    this.inferenceSteps = 0;
    const negatedQuery = query.startsWith('~') ? query.slice(1) : `~${query}`;
    
    // Setup working set
    const workingClauses: string[][] = Array.from(this.clauses).map(c => JSON.parse(c));
    workingClauses.push([negatedQuery]);
    
    // Fast lookup set specifically for this query run
    const querySet = new Set(this.clauses);
    querySet.add(JSON.stringify([negatedQuery]));

    let loopCount = 0;
    const MAX_STEPS = 30; // Strict limit to prevent browser UI freezing

    while (loopCount < MAX_STEPS) {
      loopCount++;
      const currentSize = workingClauses.length;
      const newClauses: string[][] = [];

      // Limit the inner loop checks to prevent exponential explosion on large grids
      const maxChecks = Math.min(currentSize, 100); 

      for (let i = 0; i < maxChecks; i++) {
        for (let j = i + 1; j < maxChecks; j++) {
          this.inferenceSteps++;
          const resolvents = this.resolve(workingClauses[i], workingClauses[j]);
          
          for (const resolvent of resolvents) {
            if (resolvent.length === 0) return true; // Contradiction found! Prove successful.

            const resStr = JSON.stringify(resolvent);
            if (!querySet.has(resStr)) {
              newClauses.push(resolvent);
              querySet.add(resStr);
            }
          }
        }
      }

      if (newClauses.length === 0) return false; // No new inferences can be made
      
      workingClauses.push(...newClauses);
    }
    return false; // Yield if it gets too deep to save the browser
  }

  private resolve(c1: string[], c2: string[]): string[][] {
    const resolvents: string[][] = [];
    for (const lit1 of c1) {
      const negLit1 = lit1.startsWith('~') ? lit1.slice(1) : `~${lit1}`;
      if (c2.includes(negLit1)) {
        const newC = [
          ...c1.filter((l) => l !== lit1),
          ...c2.filter((l) => l !== negLit1),
        ];
        const uniqueC = Array.from(new Set(newC)).sort();
        if (!this.isTautology(uniqueC)) {
          resolvents.push(uniqueC);
        }
      }
    }
    return resolvents;
  }

  private isTautology(clause: string[]): boolean {
    for (const lit of clause) {
      const negLit = lit.startsWith('~') ? lit.slice(1) : `~${lit}`;
      if (clause.includes(negLit)) return true;
    }
    return false;
  }
}

export function generatePerceptRules(x: number, y: number, rows: number, cols: number) {
  const adjacent = [];
  if (x > 0) adjacent.push(`${x - 1}_${y}`);
  if (x < rows - 1) adjacent.push(`${x + 1}_${y}`);
  if (y > 0) adjacent.push(`${x}_${y - 1}`);
  if (y < cols - 1) adjacent.push(`${x}_${y + 1}`);

  const rules: string[][] = [];

  // B_x,y <=> P_adj1 v P_adj2 ...
  rules.push([`~B_${x}_${y}`, ...adjacent.map(a => `P_${a}`)]);
  for (const a of adjacent) {
    rules.push([`B_${x}_${y}`, `~P_${a}`]);
  }

  // S_x,y <=> W_adj1 v W_adj2 ...
  rules.push([`~S_${x}_${y}`, ...adjacent.map(a => `W_${a}`)]);
  for (const a of adjacent) {
    rules.push([`S_${x}_${y}`, `~W_${a}`]);
  }

  return rules;
}
