export type Point = { x: number; y: number };
export type Percept = 'Breeze' | 'Stench' | 'None';
export type CellState = 'Safe' | 'Unknown' | 'Pit' | 'Wumpus';

export class KnowledgeBase {
  clauses: string[][] = [];
  inferenceSteps: number = 0;

  // Add clauses to the KB (CNF format)
  tell(newClauses: string[][]) {
    for (const clause of newClauses) {
      // Sort and deduplicate to keep KB clean
      const sortedClause = Array.from(new Set(clause)).sort();
      const clauseStr = JSON.stringify(sortedClause);
      if (!this.clauses.some((c) => JSON.stringify(c) === clauseStr)) {
        this.clauses.push(sortedClause);
      }
    }
  }

  // Ask the KB if a query is true using Resolution Refutation
  ask(query: string): boolean {
    this.inferenceSteps = 0;
    const negatedQuery = query.startsWith('~') ? query.slice(1) : `~${query}`;
    
    // Create a working set of clauses (KB + negated query)
    const clauses = [...this.clauses.map(c => [...c]), [negatedQuery]];
    const newClauses: string[][] = [];

    let loopCount = 0;
    const MAX_STEPS = 500; // Prevent infinite loops in browser

    while (loopCount < MAX_STEPS) {
      loopCount++;
      const currentSize = clauses.length;
      let pairsResolved = 0;

      for (let i = 0; i < currentSize; i++) {
        for (let j = i + 1; j < currentSize; j++) {
          this.inferenceSteps++;
          const resolvents = this.resolve(clauses[i], clauses[j]);
          
          for (const resolvent of resolvents) {
            // Contradiction found! Empty clause derived.
            if (resolvent.length === 0) return true; 

            const resStr = JSON.stringify(resolvent);
            if (!clauses.some(c => JSON.stringify(c) === resStr) && 
                !newClauses.some(c => JSON.stringify(c) === resStr)) {
              newClauses.push(resolvent);
            }
          }
        }
      }

      if (newClauses.length === 0) return false; // No new inferences
      
      // Add new clauses to our working set
      clauses.push(...newClauses);
      newClauses.length = 0; 
    }
    return false; // Timeout/Max steps reached
  }

  // Standard Propositional Resolution Step
  private resolve(c1: string[], c2: string[]): string[][] {
    const resolvents: string[][] = [];
    for (const lit1 of c1) {
      const negLit1 = lit1.startsWith('~') ? lit1.slice(1) : `~${lit1}`;
      if (c2.includes(negLit1)) {
        // Resolve on this literal
        const newC = [
          ...c1.filter((l) => l !== lit1),
          ...c2.filter((l) => l !== negLit1),
        ];
        // Remove duplicates and tautologies
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

// Helper to generate CNF rules for percepts
export function generatePerceptRules(x: number, y: number, rows: number, cols: number) {
  const adjacent = [];
  if (x > 0) adjacent.push(`${x - 1}_${y}`);
  if (x < rows - 1) adjacent.push(`${x + 1}_${y}`);
  if (y > 0) adjacent.push(`${x}_${y - 1}`);
  if (y < cols - 1) adjacent.push(`${x}_${y + 1}`);

  const rules: string[][] = [];

  // B_x,y <=> P_adj1 v P_adj2 ...
  // CNF 1: ~B_x,y v P_adj1 v P_adj2 ...
  rules.push([`~B_${x}_${y}`, ...adjacent.map(a => `P_${a}`)]);
  // CNF 2: B_x,y v ~P_adj (for all adjacent)
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
