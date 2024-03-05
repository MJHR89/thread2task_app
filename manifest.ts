import { Manifest } from "deno-slack-sdk/mod.ts";
import SalesforceTaskWorkflow from "./workflows/salesforce_task_workflow.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "thread2task",
  description: "A template for building Slack apps with Deno",
  icon: "assets/thread2task.png",
  workflows: [SalesforceTaskWorkflow],
  outgoingDomains: [
    "api.openai.com",
    "thread2task-dev-ed.develop.my.salesforce.com",
  ],
  datastores: [],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "channels:history",
    "reactions:read",
  ],
});
