/** Saga pattern for distributed verification workflows. */

import { getLogger } from '../common/logger';

const logger = getLogger();

export interface SagaStep<T> {
  name: string;
  execute: (context: T) => Promise<void>;
  compensate: (context: T) => Promise<void>;
}

export class Saga<T> {
  private steps: SagaStep<T>[] = [];
  private executedSteps: SagaStep<T>[] = [];

  /**
   * Add step to saga.
   */
  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Execute saga with automatic compensation on failure.
   */
  async execute(context: T): Promise<{ success: boolean; error?: Error }> {
    try {
      // Execute all steps
      for (const step of this.steps) {
        logger.info(`Executing saga step: ${step.name}`);
        await step.execute(context);
        this.executedSteps.push(step);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Saga failed at step, compensating... Error: ${errorMessage}`);
      
      // Compensate in reverse order
      for (const step of this.executedSteps.reverse()) {
        try {
          logger.info(`Compensating step: ${step.name}`);
          await step.compensate(context);
        } catch (compensateError) {
          const compensateErrorMessage = compensateError instanceof Error ? compensateError.message : String(compensateError);
          logger.error(`Compensation failed for ${step.name}: ${compensateErrorMessage}`);
        }
      }

      return { success: false, error: error as Error };
    }
  }
}
