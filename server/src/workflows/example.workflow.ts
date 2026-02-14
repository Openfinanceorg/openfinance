import { DBOS } from "@dbos-inc/dbos-sdk";

/**
 * Example DBOS workflow demonstrating basic patterns
 * This shows how to create durable, resumable workflows
 */

export class ExampleWorkflow {
  // Step 1: A simple step function
  @DBOS.step()
  static async stepOne(input: string) {
    DBOS.logger.info(`Executing step one with input: ${input}`);
    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 100));
    return `Step 1 processed: ${input}`;
  }

  // Step 2: Another step function
  @DBOS.step()
  static async stepTwo(previousResult: string) {
    DBOS.logger.info(`Executing step two with: ${previousResult}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return `Step 2 processed: ${previousResult}`;
  }

  // Workflow function that orchestrates the steps
  @DBOS.workflow()
  static async exampleWorkflow(workflowInput: { data: string }) {
    DBOS.logger.info(
      `Starting example workflow with input: ${JSON.stringify(workflowInput)}`,
    );

    // Execute steps - these will be checkpointed
    const result1 = await ExampleWorkflow.stepOne(workflowInput.data);
    const result2 = await ExampleWorkflow.stepTwo(result1);

    DBOS.logger.info(`Workflow completed successfully with result: ${result2}`);

    return {
      success: true,
      result: result2,
    };
  }
}
