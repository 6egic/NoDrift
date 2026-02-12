/** Plugin system for extensibility. */

import type { DomainEvent } from '../events/event-bus';
import type { NodriftConfig } from '../../config/schema';
import type { CurrentState } from '../../chain-reader/types';
import type { Diff } from '../../reconciliator/diff';
import type { VerificationResult } from '../../core';
import { getLogger } from '../../common/logger';
import { getEventBus } from '../events/event-bus';
import { createEvent } from '../events/domain-events';

const logger = getLogger();

/**
 * Plugin context provided to plugins.
 */
export interface PluginContext {
  config: NodriftConfig;
  sessionId: string;
  eventBus: ReturnType<typeof getEventBus>;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Plugin lifecycle hooks.
 */
export interface IPlugin {
  /** Plugin name (must be unique). */
  name: string;

  /** Plugin version. */
  version: string;

  /** Plugin description. */
  description?: string;

  /** Plugin author. */
  author?: string;

  /**
   * Initialize plugin.
   * Called once when plugin is loaded.
   */
  onInit?(context: PluginContext): Promise<void> | void;

  /**
   * Called before verification starts.
   */
  onBeforeVerification?(context: PluginContext): Promise<void> | void;

  /**
   * Called before reading a contract's state.
   */
  onBeforeContractRead?(
    context: PluginContext,
    contractName: string,
    address: string
  ): Promise<void> | void;

  /**
   * Called after reading a contract's state.
   */
  onAfterContractRead?(
    context: PluginContext,
    contractName: string,
    state: CurrentState
  ): Promise<void> | void;

  /**
   * Called when contract read fails.
   */
  onContractReadError?(
    context: PluginContext,
    contractName: string,
    error: Error
  ): Promise<void> | void;

  /**
   * Called after all states are read.
   */
  onStatesRead?(
    context: PluginContext,
    states: Record<string, CurrentState>
  ): Promise<void> | void;

  /**
   * Called before reconciliation.
   */
  onBeforeReconciliation?(
    context: PluginContext,
    states: Record<string, CurrentState>
  ): Promise<void> | void;

  /**
   * Called when drift is detected.
   */
  onDriftDetected?(
    context: PluginContext,
    contractName: string,
    diff: Diff
  ): Promise<void> | void;

  /**
   * Called after reconciliation.
   */
  onAfterReconciliation?(
    context: PluginContext,
    diffs: Diff[]
  ): Promise<void> | void;

  /**
   * Called after verification completes.
   */
  onVerificationComplete?(
    context: PluginContext,
    result: VerificationResult
  ): Promise<void> | void;

  /**
   * Called when verification fails.
   */
  onVerificationError?(
    context: PluginContext,
    error: Error
  ): Promise<void> | void;

  /**
   * Called when plugin is unloaded.
   */
  onDestroy?(context: PluginContext): Promise<void> | void;
}

/**
 * Plugin manager for loading and managing plugins.
 */
export class PluginManager {
  private plugins = new Map<string, IPlugin>();
  private context: PluginContext | null = null;

  /**
   * Register a plugin.
   */
  register(plugin: IPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    logger.info(`Plugin registered: ${plugin.name} v${plugin.version}`);

    // Emit plugin loaded event
    const eventBus = getEventBus();
    eventBus.emitSync(
      createEvent('plugin.loaded', {
        pluginName: plugin.name,
        pluginVersion: plugin.version,
      })
    );
  }

  /**
   * Unregister a plugin.
   */
  unregister(pluginName: string): void {
    this.plugins.delete(pluginName);
    logger.info(`Plugin unregistered: ${pluginName}`);
  }

  /**
   * Initialize all plugins.
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    for (const plugin of this.plugins.values()) {
      if (plugin.onInit) {
        try {
          await plugin.onInit(context);
          logger.debug(`Plugin initialized: ${plugin.name}`);
        } catch (error) {
          this.handlePluginError(plugin.name, 'onInit', error);
        }
      }
    }
  }

  /**
   * Execute a hook on all plugins.
   */
  async executeHook<K extends keyof IPlugin>(
    hook: K,
    ...args: Parameters<NonNullable<IPlugin[K]>>
  ): Promise<void> {
    if (!this.context) {
      throw new Error('PluginManager not initialized');
    }

    for (const plugin of this.plugins.values()) {
      const hookFn = plugin[hook];
      if (typeof hookFn === 'function') {
        try {
          await (hookFn as Function).apply(plugin, [this.context, ...args]);
        } catch (error) {
          this.handlePluginError(plugin.name, String(hook), error);
        }
      }
    }
  }

  /**
   * Get all registered plugins.
   */
  getPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by name.
   */
  getPlugin(name: string): IPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if a plugin is registered.
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Destroy all plugins.
   */
  async destroy(): Promise<void> {
    if (!this.context) return;

    for (const plugin of this.plugins.values()) {
      if (plugin.onDestroy) {
        try {
          await plugin.onDestroy(this.context);
          logger.debug(`Plugin destroyed: ${plugin.name}`);
        } catch (error) {
          this.handlePluginError(plugin.name, 'onDestroy', error);
        }
      }
    }

    this.plugins.clear();
    this.context = null;
  }

  /**
   * Get plugin statistics.
   */
  getStats() {
    return {
      pluginCount: this.plugins.size,
      plugins: Array.from(this.plugins.values()).map(p => ({
        name: p.name,
        version: p.version,
        description: p.description,
        author: p.author,
      })),
    };
  }

  private handlePluginError(pluginName: string, hook: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Plugin ${pluginName} error in ${hook}: ${errorMessage}`);

    // Emit plugin error event
    const eventBus = getEventBus();
    eventBus.emitSync(
      createEvent('plugin.error', {
        pluginName,
        error: errorMessage,
        hook,
      })
    );
  }
}

/**
 * Global plugin manager instance.
 */
let globalPluginManager: PluginManager | null = null;

/**
 * Get or create global plugin manager.
 */
export function getPluginManager(): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager();
  }
  return globalPluginManager;
}

/**
 * Reset global plugin manager (useful for testing).
 */
export function resetPluginManager(): void {
  globalPluginManager = null;
}
