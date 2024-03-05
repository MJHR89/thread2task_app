import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SummarizeThreadDefinition } from "../functions/summarize_thread_function.ts";

const SalesforceTaskWorkflow = DefineWorkflow({
  callback_id: "salesforce_task_workflow",
  title: "Salesforce Task Workflow",
  description:
    "Summarize a thread conversation and send the actionable tasks to Salesforce",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
      },
      message_ts: {
        type: Schema.types.string,
      },
      reaction: {
        type: Schema.types.string,
      },
    },
    required: ["channel_id", "message_ts"],
  },
});

SalesforceTaskWorkflow.addStep(
  SummarizeThreadDefinition,
  {
    thread_ts: SalesforceTaskWorkflow.inputs.message_ts,
    channel_id: SalesforceTaskWorkflow.inputs.channel_id,
  },
);

export default SalesforceTaskWorkflow;
