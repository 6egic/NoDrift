/** Interactive configuration generator for Nodrift. */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { fetchABIFromEtherscan, filterABIForVerification } from '../services/etherscan';

export interface InitAnswers {
  outputFile: string;
  network: {
    rpcUrl: string;
    chainId: number;
  };
  contracts: Array<{
    name: string;
    address: string;
    fetchABI: boolean;
    abiUrl?: string;
    stateTypes: string[];
    states: Array<{
      key: string;
      type: string;
      config: any;
    }>;
  }>;
  addMoreContracts: boolean;
}

const COMMON_CHAIN_IDS: Record<string, number> = {
  'Ethereum Mainnet': 1,
  'Goerli': 5,
  'Sepolia': 11155111,
  'Polygon': 137,
  'Mumbai': 80001,
  'BSC': 56,
  'BSC Testnet': 97,
  'Arbitrum': 42161,
  'Optimism': 10,
  'Avalanche': 43114,
  'Custom': 0,
};

const STATE_TYPE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Verify contract owner',
  role: 'Verify AccessControl role members',
  variable: 'Verify public variable values',
  function_call: 'Verify function return values',
  storage_slot: 'Direct storage slot access (for proxies)',
  proxy: 'ERC1967 proxy verification',
};

async function promptNetwork(): Promise<{ rpcUrl: string; chainId: number }> {
  const chainAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'chain',
      message: 'Select network:',
      choices: Object.keys(COMMON_CHAIN_IDS),
    },
  ]);

  let chainId = COMMON_CHAIN_IDS[chainAnswer.chain];
  if (chainId === 0) {
    const customChain = await inquirer.prompt([
      {
        type: 'number',
        name: 'chainId',
        message: 'Enter chain ID:',
        validate: (input: number) => input > 0 || 'Chain ID must be positive',
      },
    ]);
    chainId = customChain.chainId;
  }

  const rpcAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'rpcUrl',
      message: 'RPC URL (or use ${RPC_URL} for env var):',
      default: '${RPC_URL}',
      validate: (input: string) => input.length > 0 || 'RPC URL is required',
    },
  ]);

  return {
    rpcUrl: rpcAnswer.rpcUrl,
    chainId,
  };
}

async function promptContractState(
  stateType: string
): Promise<{ key: string; config: any }> {
  const keyAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'key',
      message: `State entry key (e.g., 'owner', 'total_supply'):`,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Key is required';
        }
        if (!/^[a-z_][a-z0-9_]*$/.test(input)) {
          return 'Key must be lowercase with underscores only';
        }
        return true;
      },
    },
  ]);

  const config: any = { type: stateType };

  switch (stateType) {
    case 'owner': {
      const ownerValue = await inquirer.prompt([
        {
          type: 'input',
          name: 'value',
          message: 'Expected owner address (or use ${OWNER_ADDRESS}):',
          default: '${OWNER_ADDRESS}',
          validate: (input: string) => {
            if (input.startsWith('${') && input.endsWith('}')) {
              return true;
            }
            return /^0x[a-fA-F0-9]{40}$/.test(input) || 'Invalid address format';
          },
        },
      ]);
      config.value = ownerValue.value;
      break;
    }

    case 'role': {
      const roleConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'roleName',
          message: 'Role name (e.g., DEFAULT_ADMIN_ROLE, MINTER_ROLE):',
          default: 'DEFAULT_ADMIN_ROLE',
        },
        {
          type: 'input',
          name: 'members',
          message: 'Expected members (comma-separated addresses or ${ROLE_MEMBERS}):',
          default: '${ROLE_MEMBERS}',
        },
      ]);
      config.role_name = roleConfig.roleName;
      // Parse members (handle env var or comma-separated)
      if (roleConfig.members.startsWith('${')) {
        config.members = [roleConfig.members];
      } else {
        config.members = roleConfig.members
          .split(',')
          .map((m: string) => m.trim())
          .filter((m: string) => m.length > 0);
      }
      break;
    }

    case 'variable': {
      const varConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'variable',
          message: 'Variable name:',
          validate: (input: string) => input.length > 0 || 'Variable name is required',
        },
        {
          type: 'input',
          name: 'value',
          message: 'Expected value (or use ${VAR_VALUE}):',
          default: '${VAR_VALUE}',
        },
      ]);
      config.variable = varConfig.variable;
      config.value = varConfig.value;
      break;
    }

    case 'function_call': {
      const funcConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'function',
          message: 'Function name:',
          validate: (input: string) => input.length > 0 || 'Function name is required',
        },
        {
          type: 'input',
          name: 'args',
          message: 'Function arguments (comma-separated, or empty):',
          default: '',
        },
        {
          type: 'input',
          name: 'value',
          message: 'Expected return value (or use ${RETURN_VALUE}):',
          default: '${RETURN_VALUE}',
        },
      ]);
      config.function = funcConfig.function;
      if (funcConfig.args && funcConfig.args.trim().length > 0) {
        // Simple parsing - could be enhanced
        config.args = funcConfig.args.split(',').map((a: string) => {
          const trimmed = a.trim();
          // Try to parse as number
          if (/^-?\d+$/.test(trimmed)) {
            return parseInt(trimmed, 10);
          }
          if (/^-?\d+\.\d+$/.test(trimmed)) {
            return parseFloat(trimmed);
          }
          return trimmed;
        });
      }
      config.value = funcConfig.value;
      break;
    }

    default: {
      // For other types, just ask for value
      const simpleValue = await inquirer.prompt([
        {
          type: 'input',
          name: 'value',
          message: `Expected value for ${stateType} (or use ${'${VALUE}'}):`,
          default: '${VALUE}',
        },
      ]);
      config.value = simpleValue.value;
    }
  }

  return {
    key: keyAnswer.key,
    config,
  };
}

async function promptContract(chainId: number): Promise<{
  name: string;
  address: string;
  abi?: any[];
  states: Array<{ key: string; config: any }>;
  preset?: string;
}> {
  const contractInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Contract name:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Contract name is required';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
          return 'Contract name should start with uppercase letter';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'address',
      message: 'Contract address (or use ${CONTRACT_ADDRESS}):',
      default: '${CONTRACT_ADDRESS}',
      validate: (input: string) => {
        if (input.startsWith('${') && input.endsWith('}')) {
          return true;
        }
        return /^0x[a-fA-F0-9]{40}$/.test(input) || 'Invalid address format';
      },
    },
  ]);

  // Suggest presets
  const presetAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'preset',
      message: 'Use a preset? (or "none" to configure manually)',
      choices: [
        { name: 'None - configure manually', value: 'none' },
        { name: 'ERC20 Token', value: 'erc20' },
        { name: 'ERC721 NFT', value: 'erc721' },
        { name: 'ERC1155 Multi-Token', value: 'erc1155' },
        { name: 'ERC4626 Tokenized Vault', value: 'erc4626' },
        { name: 'Diamond Pattern (EIP-2535)', value: 'diamond' },
        { name: 'Proxy (ERC1967)', value: 'proxy' },
        { name: 'AccessControl', value: 'accessControl' },
      ],
      default: 'none',
    },
  ]);

  const usePreset = presetAnswer.preset !== 'none';
  const presetName = usePreset ? presetAnswer.preset : null;

  const fetchABIAnswer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'fetchABI',
      message: usePreset ? 'Fetch ABI from Etherscan? (preset will add common functions, but you may want the full ABI)' : 'Fetch ABI from Etherscan?',
      default: !usePreset, // Default to true if not using preset
    },
  ]);

  let abi: any[] = [];
  let availableFunctions: any[] = [];
  const states: Array<{ key: string; config: any }> = [];

  // If using preset, we can skip ABI fetch or still fetch for additional functions
  // Fetch ABI if requested
  if (fetchABIAnswer.fetchABI) {
    if (contractInfo.address.startsWith('${') && contractInfo.address.endsWith('}')) {
      console.log(
        chalk.yellow(
          `[WARNING] Cannot fetch ABI for environment variable placeholder. Please provide the actual contract address or add ABI manually.`
        )
      );
    } else {
      // Check for API key
      let apiKey = process.env.ETHERSCAN_API_KEY;
      if (!apiKey) {
        const apiKeyPrompt = await inquirer.prompt([
          {
            type: 'input',
            name: 'apiKey',
            message: 'Etherscan API key (or press Enter to skip):',
            default: '',
          },
        ]);
        
        if (apiKeyPrompt.apiKey) {
          apiKey = apiKeyPrompt.apiKey;
        }
      }

      if (apiKey) {
        console.log(chalk.blue(`\n📡 Fetching ABI from Etherscan for ${contractInfo.address}...`));
        
        const result = await fetchABIFromEtherscan({
          address: contractInfo.address,
          chainId: chainId,
          apiKey: apiKey,
        });

        if (result.success && result.abi) {
          // Filter to only view/pure functions
          const filteredABI = filterABIForVerification(result.abi);
          abi = filteredABI;
          availableFunctions = filteredABI.filter((item) => item.type === 'function');
          
          console.log(
            chalk.green(
              `[SUCCESS] Fetched ABI with ${availableFunctions.length} view/pure function(s) (filtered from ${result.abi.length} total items)`
            )
          );
          
          // Show available functions
          if (availableFunctions.length > 0) {
            console.log(chalk.dim('\nAvailable functions:'));
            availableFunctions.slice(0, 12).forEach((func) => {
              const inputs = func.inputs?.map((i: any) => i.type).join(',') || '';
              const outputs = func.outputs?.map((o: any) => o.type).join(',') || '';
              console.log(chalk.dim(`  • ${func.name}(${inputs}) → ${outputs}`));
            });
            if (availableFunctions.length > 12) {
              console.log(chalk.dim(`  ... and ${availableFunctions.length - 12} more`));
            }
            console.log();
          }
        } else {
          console.log(chalk.red(`✗ Failed to fetch ABI: ${result.error}`));
          console.log(chalk.dim('   You can add ABI manually in the generated config file.'));
        }
      } else {
        console.log(
          chalk.yellow(
            '[WARNING] Skipping ABI fetch. You can add ABI manually or set ETHERSCAN_API_KEY env var.'
          )
        );
      }
    }
  }

  // If using preset, return early with preset config
  if (usePreset && presetName) {
    return {
      name: contractInfo.name,
      address: contractInfo.address,
      abi: abi.length > 0 ? abi : undefined, // Use fetched ABI if available, otherwise preset will provide
      states: [],
      preset: presetName,
    };
  }

  // If we have functions from ABI, let user select which ones to verify
  if (availableFunctions.length > 0) {
    const functionChoices = availableFunctions.map((func) => {
      const inputs = func.inputs?.map((i: any) => `${i.type}`).join(',') || '';
      const outputs = func.outputs?.map((o: any) => o.type).join(',') || '';
      return {
        name: `${func.name}(${inputs}) → ${outputs}`,
        value: func,
      };
    });

    const selectedFunctions = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'functions',
        message: 'Select functions to verify (use space to select, enter to confirm):',
        choices: functionChoices,
        pageSize: 15,
      },
    ]);

    // For each selected function, set up verification
    for (const func of selectedFunctions.functions || []) {
      console.log(chalk.cyan(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
      console.log(chalk.cyan(`Setting up verification for: ${func.name}()`));
      console.log(chalk.cyan(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));

      // Determine verification type based on function
      let verificationType: string;
      
      if (func.name === 'owner') {
        verificationType = 'owner';
      } else if (func.name.startsWith('getRole') || func.name === 'hasRole') {
        verificationType = 'role';
      } else if (func.inputs && func.inputs.length > 0) {
        verificationType = 'function_call';
      } else {
        // Try to infer - if it's a common getter, use 'variable'
        const commonGetters = ['totalSupply', 'decimals', 'symbol', 'name', 'paused', 'maxSupply'];
        verificationType = commonGetters.includes(func.name) ? 'variable' : 'function_call';
      }

      // Prompt for verification type (with smart default)
      const typeAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: 'Verification type:',
          choices: [
            { name: `Variable (${verificationType === 'variable' ? 'recommended' : ''})`, value: 'variable' },
            { name: `Function Call (${verificationType === 'function_call' ? 'recommended' : ''})`, value: 'function_call' },
            { name: 'Owner', value: 'owner' },
            { name: 'Role', value: 'role' },
          ],
          default: verificationType,
        },
      ]);

      const stateKey = func.name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      
      // Set up verification based on type
      if (typeAnswer.type === 'owner') {
        const ownerValue = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: 'Expected owner address (or use ${OWNER_ADDRESS}):',
            default: '${OWNER_ADDRESS}',
            validate: (input: string) => {
              if (input.startsWith('${') && input.endsWith('}')) {
                return true;
              }
              return /^0x[a-fA-F0-9]{40}$/.test(input) || 'Invalid address format';
            },
          },
        ]);
        states.push({
          key: stateKey,
          config: {
            type: 'owner',
            value: ownerValue.value,
          },
        });
      } else if (typeAnswer.type === 'variable') {
        const varConfig = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `Expected ${func.name} value (or use ${'${VALUE}'}):`,
            default: '${VALUE}',
          },
          {
            type: 'confirm',
            name: 'addTolerance',
            message: 'Add tolerance? (for numeric values)',
            default: false,
          },
        ]);

        const config: any = {
          type: 'variable',
          variable: func.name,
          value: varConfig.value,
        };

        if (varConfig.addTolerance) {
          const tolerance = await inquirer.prompt([
            {
              type: 'input',
              name: 'tolerance',
              message: 'Tolerance (e.g., 1% or 0.01):',
              default: '1%',
            },
          ]);
          config.tolerance = tolerance.tolerance;
        }

        states.push({
          key: stateKey,
          config,
        });
      } else if (typeAnswer.type === 'function_call') {
        // Collect function arguments
        const args: any[] = [];
        if (func.inputs && func.inputs.length > 0) {
          for (const input of func.inputs) {
            const argPrompt = await inquirer.prompt([
              {
                type: 'input',
                name: 'value',
                message: `${func.name}(${input.name || input.type}):`,
                validate: (inputValue: string) => {
                  if (!inputValue || inputValue.trim().length === 0) {
                    return 'Argument is required';
                  }
                  return true;
                },
              },
            ]);
            
            // Try to parse as number
            const trimmed = argPrompt.value.trim();
            if (/^-?\d+$/.test(trimmed)) {
              args.push(parseInt(trimmed, 10));
            } else if (/^-?\d+\.\d+$/.test(trimmed)) {
              args.push(parseFloat(trimmed));
            } else if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
              args.push(trimmed);
            } else {
              args.push(trimmed);
            }
          }
        }

        const returnValue = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `Expected return value (or use ${'${RETURN_VALUE}'}):`,
            default: '${RETURN_VALUE}',
          },
        ]);

        states.push({
          key: stateKey,
          config: {
            type: 'function_call',
            function: func.name,
            args: args.length > 0 ? args : undefined,
            value: returnValue.value,
          },
        });
      }
    }
  }

  // Also allow adding other verification types (owner, roles, etc.) manually
  if (availableFunctions.length === 0 || states.length === 0) {
    const addMoreAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Add additional verification checks? (owner, role, variable, function_call, etc.)',
        default: availableFunctions.length === 0, // Default to yes if no functions were selected
      },
    ]);

    if (addMoreAnswer.addMore) {
      const stateTypesAnswer = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'stateTypes',
          message: 'What to verify?',
          choices: Object.entries(STATE_TYPE_DESCRIPTIONS).map(([value, name]) => ({
            name: `${name} (${value})`,
            value,
          })),
        },
      ]);

      for (const stateType of stateTypesAnswer.stateTypes) {
        const state = await promptContractState(stateType);
        states.push(state);
      }
    }
  }

  return {
    name: contractInfo.name,
    address: contractInfo.address,
    abi,
    states,
  };
}

export async function generateConfig(): Promise<string> {
  console.log(chalk.cyan('\n[INFO] Nodrift Configuration Generator\n'));

  // Prompt for output file
  const outputAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'outputFile',
      message: 'Output file name:',
      default: 'nodrift-config.yaml',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'File name is required';
        }
        if (!input.endsWith('.yaml') && !input.endsWith('.yml')) {
          return 'File must have .yaml or .yml extension';
        }
        if (fs.existsSync(input)) {
          return `File ${input} already exists. Choose a different name.`;
        }
        return true;
      },
    },
  ]);

  // Prompt for network
  const network = await promptNetwork();

  // Prompt for contracts
  const contracts: Array<{
    name: string;
    address: string;
    abi?: any[];
    states: Array<{ key: string; config: any }>;
    preset?: string;
  }> = [];

  let addMoreContracts = true;
  while (addMoreContracts) {
    const contract = await promptContract(network.chainId);
    contracts.push(contract);

    const moreAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Add another contract?',
        default: false,
      },
    ]);
    addMoreContracts = moreAnswer.addMore;
  }

  // Generate YAML config
  const config: any = {
    network: {
      rpc_url: network.rpcUrl,
      chain_id: network.chainId,
    },
    contracts: {},
  };

  for (const contract of contracts) {
    const state: Record<string, any> = {};
    for (const stateEntry of contract.states) {
      state[stateEntry.key] = stateEntry.config;
    }

    const contractConfig: any = {
      address: contract.address,
    };

    // Add preset if specified
    if (contract.preset) {
      contractConfig.preset = contract.preset;
    }

    // Add ABI if provided (presets include their own ABI, but user might have fetched additional)
    if (contract.abi && contract.abi.length > 0) {
      contractConfig.abi = contract.abi;
    }

    // Add state if any (presets include default state, but user can add more)
    if (Object.keys(state).length > 0) {
      contractConfig.state = state;
    } else if (!contract.preset) {
      // Only require state if not using preset
      contractConfig.state = {};
    }

    config.contracts[contract.name] = contractConfig;
  }

  // Convert to YAML
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    quotingType: '"',
    forceQuotes: false,
  });

  // Write to file
  fs.writeFileSync(outputAnswer.outputFile, yamlContent, 'utf-8');

  console.log(chalk.green(`\n[SUCCESS] Configuration generated: ${outputAnswer.outputFile}\n`));
  console.log(chalk.dim('Next steps:'));
  console.log(chalk.dim(`  1. Review and edit ${outputAnswer.outputFile}`));
  console.log(chalk.dim('  2. Set required environment variables'));
  console.log(chalk.dim(`  3. Validate: nodrift validate ${outputAnswer.outputFile}`));
  console.log(chalk.dim(`  4. Run: nodrift ${outputAnswer.outputFile}\n`));

  return outputAnswer.outputFile;
}

