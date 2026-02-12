/** Plugin configuration schema extension. */

/**
 * Plugin configuration in YAML.
 */
export interface PluginConfig {
  /** List of enabled plugins */
  enabled?: string[];

  /** Plugin-specific configuration */
  config?: Record<string, PluginSettings>;
}

/**
 * Settings for individual plugins.
 */
export interface PluginSettings {
  /** Whether plugin is enabled (overrides global enabled list) */
  enabled?: boolean;

  /** Plugin-specific options */
  [key: string]: any;
}

/**
 * Metrics plugin configuration.
 */
export interface MetricsPluginConfig extends PluginSettings {
  /** Export format (json, prometheus, etc.) */
  export_format?: 'json' | 'prometheus' | 'csv';

  /** Path to export metrics */
  export_path?: string;

  /** Whether to export on completion */
  auto_export?: boolean;
}

/**
 * History plugin configuration.
 */
export interface HistoryPluginConfig extends PluginSettings {
  /** Storage path for history */
  storage_path?: string;

  /** Retention period in days */
  retention_days?: number;

  /** Auto-cleanup old records */
  auto_cleanup?: boolean;

  /** Storage backend (file, sqlite, postgres) */
  backend?: 'file' | 'sqlite' | 'postgres';
}

/**
 * Slack plugin configuration.
 */
export interface SlackPluginConfig extends PluginSettings {
  /** Slack webhook URL */
  webhook_url?: string;

  /** Channel to post to */
  channel?: string;

  /** Notify on drift only */
  notify_on_drift_only?: boolean;

  /** Include metrics in notification */
  include_metrics?: boolean;
}

/**
 * Prometheus plugin configuration.
 */
export interface PrometheusPluginConfig extends PluginSettings {
  /** Port to expose metrics */
  port?: number;

  /** Path for metrics endpoint */
  path?: string;

  /** Metric prefix */
  prefix?: string;
}

/**
 * Example plugin configuration in YAML:
 * 
 * ```yaml
 * plugins:
 *   enabled:
 *     - metrics
 *     - history
 *     - slack
 *   
 *   config:
 *     metrics:
 *       export_format: json
 *       export_path: ./metrics.json
 *       auto_export: true
 *     
 *     history:
 *       storage_path: .nodrift/history
 *       retention_days: 30
 *       auto_cleanup: true
 *       backend: file
 *     
 *     slack:
 *       webhook_url: "${SLACK_WEBHOOK_URL}"
 *       channel: "#alerts"
 *       notify_on_drift_only: true
 *       include_metrics: true
 *     
 *     prometheus:
 *       port: 9090
 *       path: /metrics
 *       prefix: nodrift_
 * ```
 */

/**
 * Default plugin configurations.
 */
export const DEFAULT_PLUGIN_CONFIGS: Record<string, PluginSettings> = {
  metrics: {
    enabled: true,
    export_format: 'json',
    export_path: './nodrift-metrics.json',
    auto_export: false,
  },
  history: {
    enabled: true,
    storage_path: '.nodrift/history',
    retention_days: 30,
    auto_cleanup: false,
    backend: 'file',
  },
  slack: {
    enabled: false,
    notify_on_drift_only: true,
    include_metrics: false,
  },
  prometheus: {
    enabled: false,
    port: 9090,
    path: '/metrics',
    prefix: 'nodrift_',
  },
};

/**
 * Merge user plugin config with defaults.
 */
export function mergePluginConfig(
  userConfig: PluginConfig | undefined
): PluginConfig {
  if (!userConfig) {
    return {
      enabled: [],
      config: {},
    };
  }

  const merged: PluginConfig = {
    enabled: userConfig.enabled || [],
    config: {},
  };

  // Merge each plugin's config with defaults
  for (const pluginName of merged.enabled) {
    const defaultConfig = DEFAULT_PLUGIN_CONFIGS[pluginName] || {};
    const userPluginConfig = userConfig.config?.[pluginName] || {};

    merged.config![pluginName] = {
      ...defaultConfig,
      ...userPluginConfig,
    };
  }

  return merged;
}

/**
 * Validate plugin configuration.
 */
export function validatePluginConfig(config: PluginConfig): string[] {
  const errors: string[] = [];

  if (!config.enabled || !Array.isArray(config.enabled)) {
    errors.push('plugins.enabled must be an array');
  }

  if (config.config && typeof config.config !== 'object') {
    errors.push('plugins.config must be an object');
  }

  // Validate specific plugin configs
  if (config.config) {
    for (const [pluginName, pluginConfig] of Object.entries(config.config)) {
      if (pluginName === 'slack') {
        const slackConfig = pluginConfig as SlackPluginConfig;
        if (slackConfig.enabled && !slackConfig.webhook_url) {
          errors.push('slack plugin requires webhook_url');
        }
      }

      if (pluginName === 'prometheus') {
        const promConfig = pluginConfig as PrometheusPluginConfig;
        if (promConfig.enabled && promConfig.port) {
          if (promConfig.port < 1 || promConfig.port > 65535) {
            errors.push('prometheus port must be between 1 and 65535');
          }
        }
      }

      if (pluginName === 'history') {
        const historyConfig = pluginConfig as HistoryPluginConfig;
        if (historyConfig.retention_days && historyConfig.retention_days < 1) {
          errors.push('history retention_days must be positive');
        }
      }
    }
  }

  return errors;
}

/**
 * Get plugin configuration for a specific plugin.
 */
export function getPluginConfig<T extends PluginSettings>(
  config: PluginConfig,
  pluginName: string
): T | undefined {
  return config.config?.[pluginName] as T | undefined;
}

/**
 * Check if a plugin is enabled.
 */
export function isPluginEnabled(
  config: PluginConfig,
  pluginName: string
): boolean {
  // Check global enabled list
  if (!config.enabled?.includes(pluginName)) {
    return false;
  }

  // Check plugin-specific enabled flag
  const pluginConfig = config.config?.[pluginName];
  if (pluginConfig && 'enabled' in pluginConfig) {
    return pluginConfig.enabled === true;
  }

  return true;
}
