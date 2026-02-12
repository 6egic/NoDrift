/** Export all advanced patterns. */

// Event Sourcing & CQRS
export {
  EventStore,
  VerificationCommandHandler,
  VerificationQueryHandler,
  type DomainEvent,
} from './event-sourcing';

// Saga Pattern
export {
  Saga,
  type SagaStep,
} from './saga';

// Domain-Driven Design
export {
  Address,
  ChainId,
  Contract,
  VerificationSession,
  InMemoryVerificationSessionRepository,
  type IVerificationSessionRepository,
} from './ddd';

// Dependency Graph
export {
  DependencyGraph,
  SmartVerificationScheduler,
} from './dependency-graph';
