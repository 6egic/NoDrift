/** Graph-based dependency resolution for contract verification. */

import { getLogger } from '../common/logger';
import type { ContractConfig } from '../config/schema';

const logger = getLogger();

export class DependencyGraph {
  private adjacencyList = new Map<string, Set<string>>();
  private inDegree = new Map<string, number>();

  /**
   * Add contract node.
   */
  addNode(contractName: string): void {
    if (!this.adjacencyList.has(contractName)) {
      this.adjacencyList.set(contractName, new Set());
      this.inDegree.set(contractName, 0);
    }
  }

  /**
   * Add dependency edge (from depends on to).
   */
  addEdge(from: string, to: string): void {
    this.addNode(from);
    this.addNode(to);
    
    if (!this.adjacencyList.get(from)!.has(to)) {
      this.adjacencyList.get(from)!.add(to);
      this.inDegree.set(to, this.inDegree.get(to)! + 1);
    }
  }

  /**
   * Topological sort for optimal verification order.
   */
  topologicalSort(): string[] {
    const result: string[] = [];
    const queue: string[] = [];
    const inDegreeCopy = new Map(this.inDegree);

    // Find nodes with no dependencies
    for (const [node, degree] of inDegreeCopy.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      // Reduce in-degree of neighbors
      for (const neighbor of this.adjacencyList.get(node)!) {
        const newDegree = inDegreeCopy.get(neighbor)! - 1;
        inDegreeCopy.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles
    if (result.length !== this.adjacencyList.size) {
      throw new Error('Circular dependency detected');
    }

    return result;
  }

  /**
   * Find strongly connected components (circular dependencies).
   */
  findStronglyConnectedComponents(): string[][] {
    const visited = new Set<string>();
    const stack: string[] = [];
    const components: string[][] = [];

    // First DFS to fill stack
    for (const node of this.adjacencyList.keys()) {
      if (!visited.has(node)) {
        this.dfs(node, visited, stack);
      }
    }

    // Create transpose graph
    const transpose = this.transpose();
    visited.clear();

    // Second DFS on transpose
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (!visited.has(node)) {
        const component: string[] = [];
        transpose.dfsCollect(node, visited, component);
        components.push(component);
      }
    }

    return components;
  }

  private dfs(node: string, visited: Set<string>, stack: string[]): void {
    visited.add(node);
    
    for (const neighbor of this.adjacencyList.get(node)!) {
      if (!visited.has(neighbor)) {
        this.dfs(neighbor, visited, stack);
      }
    }
    
    stack.push(node);
  }

  private dfsCollect(node: string, visited: Set<string>, component: string[]): void {
    visited.add(node);
    component.push(node);
    
    for (const neighbor of this.adjacencyList.get(node)!) {
      if (!visited.has(neighbor)) {
        this.dfsCollect(neighbor, visited, component);
      }
    }
  }

  private transpose(): DependencyGraph {
    const transposed = new DependencyGraph();
    
    for (const [node, neighbors] of this.adjacencyList.entries()) {
      transposed.addNode(node);
      for (const neighbor of neighbors) {
        transposed.addEdge(neighbor, node);
      }
    }
    
    return transposed;
  }

  /**
   * Find critical path (longest path for parallel execution planning).
   */
  findCriticalPath(): { path: string[]; length: number } {
    const sorted = this.topologicalSort();
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();

    // Initialize distances
    for (const node of sorted) {
      distances.set(node, 0);
    }

    // Calculate longest paths
    for (const node of sorted) {
      const currentDist = distances.get(node)!;
      
      for (const neighbor of this.adjacencyList.get(node)!) {
        const newDist = currentDist + 1;
        if (newDist > distances.get(neighbor)!) {
          distances.set(neighbor, newDist);
          predecessors.set(neighbor, node);
        }
      }
    }

    // Find node with maximum distance
    let maxDist = 0;
    let endNode = '';
    for (const [node, dist] of distances.entries()) {
      if (dist > maxDist) {
        maxDist = dist;
        endNode = node;
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | undefined = endNode;
    while (current) {
      path.unshift(current);
      current = predecessors.get(current);
    }

    return { path, length: maxDist };
  }

  /**
   * Get parallel execution batches.
   */
  getParallelBatches(): string[][] {
    const sorted = this.topologicalSort();
    const levels = new Map<string, number>();
    const batches: string[][] = [];

    // Calculate level for each node
    for (const node of sorted) {
      let maxLevel = 0;
      
      // Check all nodes that depend on this node
      for (const [other, neighbors] of this.adjacencyList.entries()) {
        if (neighbors.has(node)) {
          maxLevel = Math.max(maxLevel, (levels.get(other) || 0) + 1);
        }
      }
      
      levels.set(node, maxLevel);
    }

    // Group by level
    for (const [node, level] of levels.entries()) {
      if (!batches[level]) {
        batches[level] = [];
      }
      batches[level].push(node);
    }

    return batches;
  }
}

// Smart Verification Scheduler
export class SmartVerificationScheduler {
  private graph = new DependencyGraph();

  /**
   * Build dependency graph from contracts.
   */
  buildGraph(contracts: Map<string, ContractConfig>): void {
    // Add all contracts as nodes
    for (const [name] of contracts.entries()) {
      this.graph.addNode(name);
    }

    // Add edges based on cross-contract dependencies
    for (const [name, config] of contracts.entries()) {
      if (config.state) {
        for (const stateEntry of Object.values(config.state)) {
          if (stateEntry.type === 'cross_contract' && stateEntry.source_contract) {
            this.graph.addEdge(name, stateEntry.source_contract);
          }
        }
      }
    }
  }

  /**
   * Get optimal verification order.
   */
  getOptimalOrder(): string[] {
    try {
      return this.graph.topologicalSort();
    } catch (error) {
      logger.error('Failed to compute optimal order, using default order');
      return [];
    }
  }

  /**
   * Get parallel execution batches.
   */
  getParallelBatches(): string[][] {
    try {
      return this.graph.getParallelBatches();
    } catch (error) {
      logger.error('Failed to compute parallel batches, using sequential order');
      return [];
    }
  }

  /**
   * Detect circular dependencies.
   */
  detectCircularDependencies(): string[][] {
    try {
      return this.graph.findStronglyConnectedComponents()
        .filter(component => component.length > 1);
    } catch (error) {
      logger.error('Failed to detect circular dependencies');
      return [];
    }
  }

  /**
   * Get critical path.
   */
  getCriticalPath(): { path: string[]; length: number } {
    try {
      return this.graph.findCriticalPath();
    } catch (error) {
      logger.error('Failed to compute critical path');
      return { path: [], length: 0 };
    }
  }
}
