import { Trigger } from "deno-slack-sdk/types.ts";
import {
  TriggerContextData,
  TriggerEventTypes,
  TriggerTypes,
} from "deno-slack-api/mod.ts";
import SalesforceTaskWorkflow from "../workflows/salesforce_task_workflow.ts";

const ReactjiTrigger: Trigger<typeof SalesforceTaskWorkflow.definition> = {
  type: TriggerTypes.Event,
  name: "Reactji trigger",
  description: "A reacjti trigger",
  workflow: `#/workflows/${SalesforceTaskWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.ReactionAdded,
    channel_ids: ["C06MPLV1YG6"],
    filter: {
      version: 1,
      root: {
        statement: "{{data.reaction}} == conversation-over",
      },
    },
  },
  inputs: {
    channel_id: { value: TriggerContextData.Event.ReactionAdded.channel_id },
    message_ts: { value: TriggerContextData.Event.ReactionAdded.message_ts },
    reaction: { value: TriggerContextData.Event.ReactionAdded.reaction },
  },
};

export default ReactjiTrigger;
