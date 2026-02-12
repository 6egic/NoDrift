# Nodrift Architecture

## Overview

Nodrift is a blockchain state verification tool designed with enterprise-grade architecture patterns. It follows Domain-Driven Design (DDD) principles and implements several advanced patterns for reliability, scalability, and maintainability.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            CLI Layer                                 │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│   │  verify  │   │   init   │   │ validate │   │  Other   │          │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘          │
└────────┼──────────────┼──────────────┼──────────────┼────────────────┘
         │              │              │              │
┌────────┼──────────────┼──────────────┼──────────────┼───────────────┐
│        │              │              │              │               │
│        ▼              ▼              ▼              ▼               │
│   ┌────────────────────────────────────────────────────────┐        │
│   │              Configuration Layer                       │        │
│   │   ┌──────────────┐   ┌──────────────┐                  │        │
│   │   │ Config Loader│   │   Config     │                  │        │
│   │   │ & Validator  │   │   Schema     │                  │        │
│   │   └──────────────┘   └──────────────┘                  │        │
│   └────────────────────────────────────────────────────────┘        │
│                                                                     │
│   ┌────────────────────────────────────────────────────────┐        │
│   │                Core Domain Layer                       │        │
│   │   ┌──────────────┐   ┌──────────────┐                  │        │
│   │   │ Chain Reader │   │ Reconciliator│                  │        │
│   │   │   (State)    │   │ (Comparison) │                  │        │
│   │   └──────┬───────┘   └──────┬───────┘                  │        │
│   └──────────┼────────────────────┼────────────────────────┘        │
│              │                    │                                 │
│   ┌──────────┼────────────────────┼─────────────────────────┐       │
│   │          ▼                    ▼                         │       │
│   │     ┌──────────────────────────────────┐                │       │
│   │     │        Pattern Layer             │                │       │
│   │     │   ┌────────┐   ┌────────┐        │                │       │
│   │     │   │  DDD   │   │ Event  │        │                │       │
│   │     │   │        │   │Sourcing│        │                │       │
│   │     │   └────────┘   └────────┘        │                │       │
│   │     └──────────────────────────────────┘                │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│   ┌────────────────────────────────────────────────────────┐        │
│   │              Infrastructure Layer                      │        │
│   │   ┌──────────┐   ┌──────────┐   ┌──────────┐           │        │
│   │   │ Services │   │  Common  │   │  Output  │           │        │
│   │   │  (RPC,   │   │ (DI, GC, │   │ (Format, │           │        │
│   │   │  Cache)  │   │  Memory) │   │  Stats)  │           │        │
│   │   └──────────┘   └──────────┘   └──────────┘           │        │
│   └────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Configuration Layer

**Location**: `src/config/`

**Responsibilities**:
- Load and parse YAML configuration files
- Validate configuration against schema
- Support for includes, templates, and presets
- Variable resolution (env vars, file loading, command execution)
- ABI loading from multiple sources (Foundry, Hardhat, Truffle, plain JSON)

**Key Files**:
- [`config-loader.ts`](../src/config/config-loader.ts) - Configuration loading and processing
- [`config-validator.ts`](../src/config/config-validator.ts) - Validation logic
- [`schema.ts`](../src/config/schema.ts) - Configuration schema definition
- [`types.ts`](../src/config/types.ts) - Type definitions

**Design Patterns**:
- Builder pattern for configuration construction
- Strategy pattern for different ABI sources
- Template Method for configuration processing pipeline

### 2. Chain Reader Layer

**Location**: `src/chain-reader/`

**Responsibilities**:
- Read blockchain state from contracts
- Support multiple state types (variables, functions, storage slots, etc.)
- Handle cross-contract calls
- Aggregate and transform data

**Key Files**:
- [`index.ts`](../src/chain-reader/index.ts) - Main chain reader orchestration
- [`readers/basic-reader.ts`](../src/chain-reader/readers/basic-reader.ts) - Basic state reading
- [`readers/advanced-reader.ts`](../src/chain-reader/readers/advanced-reader.ts) - Advanced state types
- [`readers/storage-reader.ts`](../src/chain-reader/readers/storage-reader.ts) - Direct storage access

**Design Patterns**:
- Strategy pattern for different reader types
- Factory pattern for reader creation
- Adapter pattern for different blockchain providers

### 3. Reconciliator Layer

**Location**: `src/reconciliator/`

**Responsibilities**:
- Compare actual vs expected state
- Generate diffs with detailed information
- Support various comparison operators
- Handle tolerance and range comparisons

**Key Files**:
- [`comparison-engine.ts`](../src/reconciliator/comparison-engine.ts) - Main comparison logic
- [`diff-factory.ts`](../src/reconciliator/diff-factory.ts) - Diff object creation
- [`comparators/`](../src/reconciliator/comparators/) - Specialized comparators

**Design Patterns**:
- Strategy pattern for different comparison types
- Factory pattern for diff creation
- Visitor pattern for diff processing

### 4. Services Layer

**Location**: `src/services/`

**Responsibilities**:
- RPC communication with blockchain
- Caching and performance optimization
- Rate limiting and circuit breaking
- Connection pooling

**Key Files**:
- [`rpc-client.ts`](../src/services/rpc-client.ts) - RPC communication
- [`rpc-cache.ts`](../src/services/rpc-cache.ts) - Response caching with LRU
- [`rate-limiter.ts`](../src/services/rate-limiter.ts) - Token bucket rate limiting
- [`circuit-breaker.ts`](../src/services/circuit-breaker.ts) - Fault tolerance
- [`connection-pool.ts`](../src/services/connection-pool.ts) - Connection management
- [`multi-provider.ts`](../src/services/multi-provider.ts) - Failover support
- [`etherscan.ts`](../src/services/etherscan.ts) - ABI fetching

**Design Patterns**:
- Circuit Breaker pattern for fault tolerance
- Object Pool pattern for connections
- Proxy pattern for caching
- Decorator pattern for rate limiting

### 5. Pattern Layer

**Location**: `src/patterns/`

**Responsibilities**:
- Implement advanced architectural patterns
- Domain-Driven Design support
- Event sourcing for audit trails
- Saga pattern for complex workflows

**Key Files**:
- [`ddd.ts`](../src/patterns/ddd.ts) - Domain-Driven Design entities and aggregates
- [`event-sourcing.ts`](../src/patterns/event-sourcing.ts) - Event store and replay
- [`saga.ts`](../src/patterns/saga.ts) - Distributed transaction coordination
- [`dependency-graph.ts`](../src/patterns/dependency-graph.ts) - Dependency resolution

**Design Patterns**:
- Domain-Driven Design (Entities, Value Objects, Aggregates)
- Event Sourcing
- CQRS (Command Query Responsibility Segregation)
- Saga pattern

### 6. Common Layer

**Location**: `src/common/`

**Responsibilities**:
- Shared utilities and helpers
- Dependency injection
- Memory management
- Logging and observability

**Key Files**:
- [`di-container.ts`](../src/common/di-container.ts) - Dependency injection
- [`memory-monitor.ts`](../src/common/memory-monitor.ts) - Memory tracking
- [`gc-manager.ts`](../src/common/gc-manager.ts) - Garbage collection
- [`logger.ts`](../src/common/logger.ts) - Structured logging
- [`observer.ts`](../src/common/observer.ts) - Observer pattern
- [`result-type.ts`](../src/common/result-type.ts) - Result monad
- [`exceptions.ts`](../src/common/exceptions.ts) - Custom exceptions
- [`exit-codes.ts`](../src/common/exit-codes.ts) - CI/CD exit codes

**Design Patterns**:
- Dependency Injection
- Observer pattern
- Result/Either monad
- Singleton pattern (for logger, DI container)

## Data Flow

### Verification Flow

```
1. CLI Command
   ↓
2. Load & Validate Config
   ↓
3. Initialize Services (RPC, Cache, etc.)
   ↓
4. For Each Contract:
   ├─→ Read Current State (Chain Reader)
   │   ├─→ Basic reads (variables, functions)
   │   ├─→ Advanced reads (aggregates, conditionals)
   │   └─→ Storage reads (direct slot access)
   ↓
5. Compare States (Reconciliator)
   ├─→ Apply comparison operators
   ├─→ Handle tolerances/ranges
   └─→ Generate diffs
   ↓
6. Output Results
   ├─→ Format (JSON, YAML, JUnit, etc.)
   ├─→ Calculate statistics
   └─→ Exit with appropriate code
```

### Configuration Processing Flow

```
1. Load YAML File
   ↓
2. Process Includes/Imports
   ↓
3. Resolve Presets (TypeScript-based)
   ↓
4. Resolve Templates (YAML-based)
   ↓
5. Process ABIs (file loading)
   ↓
6. Resolve Variables
   ├─→ Environment variables
   ├─→ File content
   ├─→ Command execution
   └─→ Math expressions
   ↓
7. Validate Schema
   ↓
8. Return Processed Config
```

## Design Principles

### 1. Separation of Concerns
- Each layer has a single, well-defined responsibility
- Clear boundaries between layers
- Minimal coupling, high cohesion

### 2. Dependency Inversion
- High-level modules don't depend on low-level modules
- Both depend on abstractions
- Dependency injection for flexibility

### 3. Open/Closed Principle
- Open for extension (new state types, comparators)
- Closed for modification (core logic stable)
- Plugin architecture for extensibility

### 4. Single Responsibility
- Each class/module has one reason to change
- Clear, focused interfaces
- Easy to test and maintain

### 5. Interface Segregation
- Clients don't depend on interfaces they don't use
- Small, focused interfaces
- Composition over inheritance

## Performance Optimizations

### 1. Caching Strategy
- **RPC Cache**: LRU cache with TTL for blockchain reads
- **ABI Cache**: In-memory caching of parsed ABIs
- **Result Cache**: Cache comparison results for repeated checks

### 2. Connection Management
- **Connection Pool**: Reuse connections to reduce overhead
- **Multi-Provider**: Failover to backup RPC endpoints
- **Circuit Breaker**: Prevent cascading failures

### 3. Concurrency
- **Adaptive Concurrency**: Dynamically adjust parallelism
- **Worker Pool**: Parallel contract verification
- **Backpressure**: Handle load spikes gracefully

### 4. Memory Management
- **Object Pooling**: Reuse objects to reduce GC pressure
- **Memory Monitoring**: Track and alert on memory usage
- **GC Management**: Trigger GC at appropriate times
- **Streaming**: Process large datasets without loading all into memory

## Error Handling Strategy

### 1. Exception Hierarchy
```
NodriftError (base)
├── ConfigurationError
├── ValidationError
├── ConnectionError
├── StateReadError
└── ContractError
```

### 2. Error Recovery
- **Circuit Breaker**: Fail fast and recover
- **Retry Logic**: Exponential backoff for transient errors
- **Fallback**: Use backup providers on failure
- **Graceful Degradation**: Continue with partial results

### 3. Error Reporting
- **Structured Errors**: Include context and suggestions
- **Exit Codes**: CI/CD-friendly exit codes
- **Logging**: Comprehensive error logging
- **User-Friendly Messages**: Clear, actionable error messages

