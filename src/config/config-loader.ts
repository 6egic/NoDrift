/** Enhanced configuration loader with file loading, includes, templates, presets, and variable resolution. */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { ConfigurationError } from '../common/exceptions';
import { presets, getPreset } from '../presets';
import { COMMAND_EXECUTION_TIMEOUT_MS } from '../common/constants';
import type { ABI } from '../common/types';

/**
 * Resolve file path relative to config file directory.
 */
function resolvePath(filePath: string, baseDir: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(baseDir, filePath);
}

/**
 * Load ABI from file (supports Foundry, Hardhat, Truffle artifacts and plain ABI files).
 * 
 * Supported formats:
 * - Foundry artifacts: JSON with 'abi' field (out/*.sol/*.json)
 * - Hardhat artifacts: JSON with 'abi' field (artifacts/**\/*.json)
 * - Truffle artifacts: JSON with 'abi' field (build/contracts/*.json)
 * - Plain ABI: JSON array of ABI items
 * 
 * @param filePath - Path to ABI file (relative or absolute)
 * @param baseDir - Base directory for resolving relative paths
 * @returns ABI array
 * @throws {ConfigurationError} If file not found or invalid format
 */
function loadABIFromFile(filePath: string, baseDir: string): ABI {
  const resolvedPath = resolvePath(filePath, baseDir);
  
  if (!fs.existsSync(resolvedPath)) {
    throw new ConfigurationError(`ABI file not found: ${filePath} (resolved to: ${resolvedPath})`);
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const data = JSON.parse(content) as unknown;

    // Handle Foundry/Hardhat/Truffle artifacts (has 'abi' field)
    if (typeof data === 'object' && data !== null && 'abi' in data && Array.isArray((data as { abi: unknown }).abi)) {
      return (data as { abi: ABI }).abi;
    }

    // Handle plain ABI files (array directly)
    if (Array.isArray(data)) {
      return data as ABI;
    }

    throw new ConfigurationError(
      `Invalid ABI file format: ${filePath}. ` +
      `Expected either:\n` +
      `  - Plain ABI: JSON array of ABI items\n` +
      `  - Artifact file: JSON object with 'abi' field (Foundry/Hardhat/Truffle)`
    );
  } catch (error: unknown) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(`Failed to load ABI from ${filePath}: ${errorMessage}`);
  }
}

/**
 * Load content from file.
 * 
 * @param filePath - Path to file (relative or absolute)
 * @param baseDir - Base directory for resolving relative paths
 * @returns File content as string
 * @throws {ConfigurationError} If file not found or cannot be read
 */
function loadFileContent(filePath: string, baseDir: string): string {
  const resolvedPath = resolvePath(filePath, baseDir);
  
  if (!fs.existsSync(resolvedPath)) {
    throw new ConfigurationError(`File not found: ${filePath} (resolved to: ${resolvedPath})`);
  }

  try {
    return fs.readFileSync(resolvedPath, 'utf-8');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(`Failed to read file ${filePath}: ${errorMessage}`);
  }
}

/**
 * Execute command and return output.
 * 
 * @param command - Command to execute
 * @param baseDir - Working directory for command execution
 * @returns Command output as string
 * @throws {ConfigurationError} If command execution fails
 */
function executeCommand(command: string, baseDir: string): string {
  try {
    const output = execSync(command, {
      cwd: baseDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: COMMAND_EXECUTION_TIMEOUT_MS,
    });
    return output.trim();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(`Command execution failed: ${command}. Error: ${errorMessage}`);
  }
}

/**
 * Evaluate simple math expressions (basic safety).
 * Only allows numbers, operators, parentheses, and spaces for security.
 * 
 * @param expression - Math expression to evaluate (e.g., "2 + 2", "10 * 5")
 * @returns Evaluated result as number
 * @throws {ConfigurationError} If expression is invalid or contains unsafe characters
 */
function evaluateMath(expression: string): number {
  // Only allow numbers, operators, parentheses, and spaces
  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    throw new ConfigurationError(`Invalid math expression: ${expression}. Only numbers and basic operators allowed.`);
  }

  try {
    // Use Function constructor for safe evaluation (no access to globals)
    const result = new Function(`return ${expression}`)();
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(`Math evaluation failed: ${expression}. ${errorMessage}`);
  }
}

/**
 * Resolve enhanced variable references in configuration values.
 * Supports multiple syntaxes:
 * - ${file:path} - Load file content
 * - ${file:path:field} - Extract field from JSON file
 * - ${cmd:command} - Execute command and return output
 * - ${math:expression} - Evaluate math expression
 * - ${env:VAR} or ${VAR} - Environment variable substitution
 * - ${VAR || default} - Environment variable with default
 * 
 * @param value - Value to resolve (string, array, or object)
 * @param baseDir - Base directory for resolving file paths
 * @param context - Optional context for variable resolution
 * @returns Resolved value with all variables substituted
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveVariable(value: any, baseDir: string, context: Record<string, any> = {}): any {
  if (typeof value === 'string') {
    // Handle ${file:path} syntax
    const fileMatch = value.match(/^\$\{file:(.+?)\}$/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      return loadFileContent(filePath, baseDir);
    }

    // Handle ${file:path:field} syntax (for JSON files)
    const fileFieldMatch = value.match(/^\$\{file:(.+?):(.+?)\}$/);
    if (fileFieldMatch) {
      const filePath = fileFieldMatch[1];
      const field = fileFieldMatch[2];
      const content = loadFileContent(filePath, baseDir);
      try {
        const data = JSON.parse(content);
        const fields = field.split('.');
        let result = data;
        for (const f of fields) {
          result = result?.[f];
          if (result === undefined) {
            throw new Error(`Field '${field}' not found`);
          }
        }
        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new ConfigurationError(`Failed to extract field '${field}' from ${filePath}: ${errorMessage}`);
      }
    }

    // Handle ${cmd:command} syntax
    const cmdMatch = value.match(/^\$\{cmd:(.+?)\}$/);
    if (cmdMatch) {
      const command = cmdMatch[1];
      return executeCommand(command, baseDir);
    }

    // Handle ${math:expression} syntax
    const mathMatch = value.match(/^\$\{math:(.+?)\}$/);
    if (mathMatch) {
      const expression = mathMatch[1];
      return evaluateMath(expression);
    }

    // Handle ${env:VAR || default} syntax
    const envDefaultMatch = value.match(/^\$\{env:([^|]+)\s*\|\|\s*(.+?)\}$/);
    if (envDefaultMatch) {
      const envVar = envDefaultMatch[1].trim();
      const defaultValue = envDefaultMatch[2].trim();
      return process.env[envVar] || defaultValue;
    }

    // Handle ${env:VAR} syntax (existing)
    const envMatch = value.match(/^\$\{env:([^}]+)\}$/);
    if (envMatch) {
      const envVar = envMatch[1].trim();
      return process.env[envVar] || value; // Return original if not set
    }

    // Handle ${VAR || default} syntax (existing with default)
    const defaultMatch = value.match(/^\$\{([^|]+)\s*\|\|\s*(.+?)\}$/);
    if (defaultMatch) {
      const envVar = defaultMatch[1].trim();
      const defaultValue = defaultMatch[2].trim();
      const envValue = process.env[envVar];
      if (envValue !== undefined && envValue !== '') {
        return envValue;
      }
      return defaultValue;
    }

    // Handle ${VAR} syntax (existing)
    if (value.startsWith('${') && value.endsWith('}')) {
      const envVar = value.slice(2, -1).trim();
      const envValue = process.env[envVar];
      if (envValue === undefined) {
        return value; // Return original if not set (will be caught by validation)
      }
      // Try to parse as number or boolean if appropriate
      if (/^-?\d+$/.test(envValue)) {
        return parseInt(envValue, 10);
      }
      if (/^-?\d+\.\d+$/.test(envValue)) {
        return parseFloat(envValue);
      }
      if (envValue.toLowerCase() === 'true' || envValue.toLowerCase() === 'false') {
        return envValue.toLowerCase() === 'true';
      }
      return envValue;
    }

    // Handle inline math expressions like ${VAR * 2}
    const inlineMathMatch = value.match(/\$\{([^}]+)\s*([+\-*/])\s*(\d+(?:\.\d+)?)\}/);
    if (inlineMathMatch) {
      const varName = inlineMathMatch[1].trim();
      const operator = inlineMathMatch[2];
      const number = parseFloat(inlineMathMatch[3]);
      const varValue = process.env[varName];
      if (varValue) {
        const numValue = parseFloat(varValue);
        if (!isNaN(numValue)) {
          switch (operator) {
            case '+': return numValue + number;
            case '-': return numValue - number;
            case '*': return numValue * number;
            case '/': return numValue / number;
          }
        }
      }
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveVariable(item, baseDir, context));
  }

  if (typeof value === 'object' && value !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved: any = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveVariable(v, baseDir, context);
    }
    return resolved;
  }

  return value;
}

/**
 * Load and merge included config files.
 * 
 * @param includes - Array of include file paths
 * @param baseDir - Base directory for resolving relative paths
 * @returns Merged configuration object
 * @throws {ConfigurationError} If include file not found or invalid
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadIncludes(includes: string[], baseDir: string): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: Record<string, any> = {};

  for (const includePath of includes) {
    const resolvedPath = resolvePath(includePath, baseDir);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new ConfigurationError(`Include file not found: ${includePath} (resolved to: ${resolvedPath})`);
    }

    try {
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const included = yaml.load(content) as any;
      
      // Merge included config
      if (included.contracts) {
        merged.contracts = { ...merged.contracts, ...included.contracts };
      }
      if (included.networks) {
        merged.networks = { ...merged.networks, ...included.networks };
      }
      if (included.templates) {
        merged.templates = { ...merged.templates, ...included.templates };
      }
      // Merge other top-level keys
      for (const [key, value] of Object.entries(included)) {
        if (!['contracts', 'networks', 'templates'].includes(key)) {
          merged[key] = value;
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(`Failed to load include file ${includePath}: ${errorMessage}`);
    }
  }

  return merged;
}

/**
 * Load contract template by name.
 * 
 * @param templateName - Name of the template to load
 * @param templates - Available templates object
 * @returns Template configuration
 * @throws {ConfigurationError} If template not found
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadTemplate(templateName: string, templates: Record<string, any>): any {
  if (!templates || !templates[templateName]) {
    throw new ConfigurationError(`Template '${templateName}' not found. Available templates: ${Object.keys(templates || {}).join(', ')}`);
  }

  return templates[templateName];
}

/**
 * Merge contract config with template.
 * Contract values override template values, with deep merging for state and ABI.
 * 
 * @param contract - Contract configuration
 * @param template - Template configuration
 * @returns Merged configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeContractWithTemplate(contract: any, template: any): any {
  const merged = { ...template, ...contract };

  // Deep merge state (merge individual state entries, not replace)
  if (template.state && contract.state) {
    merged.state = {};
    // Start with template state
    for (const [key, value] of Object.entries(template.state)) {
      merged.state[key] = { ...(value as any) };
    }
    // Override with contract state (deep merge each entry)
    for (const [key, value] of Object.entries(contract.state)) {
      if (merged.state[key]) {
        // Merge existing entry
        merged.state[key] = { ...merged.state[key], ...(value as any) };
      } else {
        // New entry
        merged.state[key] = { ...(value as any) };
      }
    }
  } else if (template.state) {
    merged.state = template.state;
  }

  // Deep merge ABI (combine arrays, remove duplicates)
  if (template.abi && contract.abi) {
    const abiMap = new Map();
    for (const item of template.abi) {
      if (item.name) {
        abiMap.set(item.name, item);
      }
    }
    for (const item of contract.abi) {
      if (item.name) {
        abiMap.set(item.name, item);
      }
    }
    merged.abi = Array.from(abiMap.values());
  } else if (template.abi) {
    merged.abi = template.abi;
  }

  return merged;
}

/**
 * Load and apply TypeScript preset.
 * 
 * @param presetName - Name of the preset to load
 * @param contract - Contract configuration (address is required)
 * @returns Contract configuration with preset applied
 * @throws {ConfigurationError} If preset not found or contract missing address
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadPreset(presetName: string, contract: any): any {
  try {
    const preset = getPreset(presetName as keyof typeof presets);
    if (!preset) {
      throw new ConfigurationError(`Preset '${presetName}' not found. Available presets: ${Object.keys(presets).join(', ')}`);
    }

    // Extract preset options from contract config
    // Contract config takes precedence - address is required
    if (!contract.address) {
      throw new ConfigurationError(`Contract using preset '${presetName}' must have 'address' field`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const presetOptions: any = {
      address: contract.address,
      network: contract.network,
      additionalState: contract.state || {},
    };

    // Handle preset-specific options
    if (presetName === 'proxy' && contract.implementationAddress) {
      presetOptions.implementationAddress = contract.implementationAddress;
    }
    if (presetName === 'accessControl' && contract.roles) {
      presetOptions.roles = contract.roles;
    }
    if (presetName === 'diamond') {
      if (contract.facets) {
        presetOptions.facets = contract.facets;
      }
      if (contract.facetSelectors) {
        presetOptions.facetSelectors = contract.facetSelectors;
      }
    }

    // Generate preset config
    const presetConfig = preset(presetOptions);

    // Merge with contract config (contract overrides preset)
    return mergeContractWithTemplate(contract, presetConfig);
    } catch (error: unknown) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(`Failed to load preset '${presetName}': ${errorMessage}`);
  }
}

/**
 * Process ABI field (handle file loading).
 * 
 * @param abi - ABI value (array or file reference string)
 * @param baseDir - Base directory for resolving file paths
 * @returns ABI array
 * @throws {ConfigurationError} If ABI format is invalid
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processABI(abi: any, baseDir: string): ABI {
  if (typeof abi === 'string') {
    // Handle ${file:path} or ${file:path:abi} syntax
    const fileMatch = abi.match(/^\$\{file:(.+?)(?::abi)?\}$/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      return loadABIFromFile(filePath, baseDir);
    }
    throw new ConfigurationError(`Invalid ABI format: ${abi}. Expected array or ${'${file:path}'} reference.`);
  }

  if (Array.isArray(abi)) {
    return abi;
  }

  throw new ConfigurationError(`Invalid ABI format. Expected array or file reference.`);
}

/**
 * Load and merge included configuration files.
 * 
 * @param config - Main configuration object
 * @param baseDir - Base directory for resolving paths
 * @returns Configuration with includes merged
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processIncludes(config: any, baseDir: string): void {
  if (config.imports || config.includes) {
    const includes = config.imports || config.includes;
    const included = loadIncludes(includes, baseDir);
    
    // Merge included config into main config
    if (included.contracts) {
      config.contracts = { ...included.contracts, ...config.contracts };
    }
    if (included.networks) {
      config.networks = { ...included.networks, ...config.networks };
    }
    if (included.templates) {
      config.templates = { ...included.templates, ...config.templates };
    }
  }
}

/**
 * Resolve presets in all contracts.
 * 
 * @param config - Configuration object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processPresets(config: any): void {
  if (config.contracts) {
    for (const contractName of Object.keys(config.contracts)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contractObj = config.contracts[contractName] as any;
      if (contractObj.preset) {
        config.contracts[contractName] = loadPreset(contractObj.preset, contractObj);
        // Remove preset field after processing
        delete config.contracts[contractName].preset;
      }
    }
  }
}

/**
 * Resolve templates in all contracts.
 * 
 * @param config - Configuration object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processTemplates(config: any): void {
  if (config.templates && config.contracts) {
    for (const contractName of Object.keys(config.contracts)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contractObj = config.contracts[contractName] as any;
      if (contractObj.template) {
        const template = loadTemplate(contractObj.template, config.templates);
        config.contracts[contractName] = mergeContractWithTemplate(contractObj, template);
      }
    }
  }
}

/**
 * Process ABIs for all contracts (handle file loading).
 * 
 * @param config - Configuration object
 * @param baseDir - Base directory for resolving paths
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processABIs(config: any, baseDir: string): void {
  if (config.contracts) {
    for (const contract of Object.values(config.contracts)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contractObj = contract as any;
      if (contractObj.abi !== undefined) {
        contractObj.abi = processABI(contractObj.abi, baseDir);
      }
    }
  }
}

/**
 * Process config with all enhancements.
 * Processing order:
 * 1. Load includes
 * 2. Resolve presets (TypeScript-based)
 * 3. Resolve templates (YAML-based)
 * 4. Process ABIs (file loading)
 * 5. Resolve all variables
 * 
 * @param config - Configuration object to process
 * @param baseDir - Base directory for resolving relative paths
 * @returns Processed configuration with all enhancements applied
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function processConfig(config: any, baseDir: string): any {
  // Step 1: Load includes
  processIncludes(config, baseDir);

  // Step 2: Resolve presets in contracts (before templates, as presets are TypeScript-based)
  processPresets(config);

  // Step 3: Resolve templates in contracts (YAML-based templates)
  processTemplates(config);

  // Step 4: Process ABIs (file loading)
  processABIs(config, baseDir);

  // Step 5: Resolve all variables
  config = resolveVariable(config, baseDir);

  return config;
}

