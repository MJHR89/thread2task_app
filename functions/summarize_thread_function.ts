import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import OpenAI from "openai/mod.ts";
import { ChatCompletionMessageParam } from "openai/resources/mod.ts";
export const APPROVE = "approve_button";
export const REVIEW = "review_button";
let completionContent: string | null = "";

export const SummarizeThreadDefinition = DefineFunction({
  callback_id: "summarize_thread_function",
  title: "listener text using AI",
  description:
    "A function that listens on a thread, pulls in the contents and uses AI to respond.",
  source_file: "functions/summarize_thread_function.ts",
  input_parameters: {
    properties: {
      thread_ts: {
        type: Schema.types.string,
        description: "The thread timestamp",
      },
      channel_id: {
        type: Schema.types.string,
        description: "The channel Id",
      },
    },
    required: ["thread_ts", "channel_id"],
  },
});

export default SlackFunction(
  SummarizeThreadDefinition,
  async ({ client, inputs, env }) => {
    const authResponse = await client.auth.test();
    const botId = authResponse.user_id;

    // 1. Acknowledge reactji and sends user a message to wait for AI to respond
    const ackResponse = await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: inputs.thread_ts,
      text: "One sec! Summarizing content :hourglass_flowing_sand:",
    });
    console.log(ackResponse);

    if (!ackResponse.ok) {
      console.log("post message");
      console.error(ackResponse.error);
    }

    // 2. Get message contents by pulling in all conversations in the thread
    //    and feed contents to AI model
    const conversationResponse = await client.conversations.replies({
      channel: inputs.channel_id,
      ts: inputs.thread_ts,
    });

    if (!conversationResponse.ok) {
      console.log("conversation replies");
      console.error(conversationResponse.error);
    }

    const openai = new OpenAI({
      apiKey: env["OPENAI_API_KEY"],
      organization: env["OPENAI_ORG_ID"],
    });

    let messages: ChatCompletionMessageParam[] = [
      {
        "role": "system",
        "content": `You are a helpful assistant.`,
      },
      {
        "role": "user",
        "content":
          `Please provide a bullet-point summary of the conclusions drawn from the conversation, followed by a list of actionable tasks derived from those conclusions.`,
      },
    ];

    for (let i = 1; i < conversationResponse.messages.length; i++) {
      if (conversationResponse.messages[i] != botId) {
        messages.push({
          "role": "user",
          "content": `${conversationResponse.messages[i].text}`,
        });
      } else {
        messages.push({
          "role": "assistant",
          "content": `${conversationResponse.messages[i].text}`,
        });
      }
    }

    console.log("starting completion");
    const chatCompletion = await openai.chat.completions.create({
      messages: messages,
      model: "gpt-3.5-turbo",
    });

    completionContent = chatCompletion.choices[0].message.content;
    const blocks = [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: completionContent,
      },
    }, {
      type: "actions",
      block_id: "approve-deny-buttons",
      elements: [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Approve" },
          "style": "primary",
          "value": "approve",
          "action_id": APPROVE,
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Review" },
          "style": "danger",
          "value": "review",
          "action_id": REVIEW,
        },
      ],
    }];

    const updateResponse = await client.chat.update({
      channel: inputs.channel_id,
      ts: ackResponse.ts,
      text: completionContent,
      blocks: blocks,
    });

    if (!updateResponse.ok) {
      console.log(updateResponse);
      console.log(updateResponse.error);
    }

    return {
      completed: false,
    };
  },
).addBlockActionsHandler(
  [APPROVE, REVIEW],
  async function ({ action, client, env, body }) {
    console.log("Incoming action handler invocation", action);

    const approved = action.action_id === APPROVE;
    const date = new Date();
    const todaysDate = date.toISOString().split("T")[0];
    console.log(todaysDate);

    if (approved) {
      const request_body = {
        "Subject": `Meeting notes from ${todaysDate}`,
        "Status": "Not Started",
        "Priority": "Normal",
        "WhoId": "003WU000001pwRBYAY", //TODO: This is the object associated with a task to be taken from the link shared
        "Description": `${completionContent}`,
        "ActivityDate": `${todaysDate}`,
      };

      const TASK_API_URI =
        "http://thread2task-dev-ed.develop.my.salesforce.com/services/data/v60.0/sobjects/Task";
      const resp = await fetch(TASK_API_URI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env["SFDC_TOKEN"]}`,
        },
        body: JSON.stringify(request_body),
      });

      console.log("Task creation response:" + resp.ok);
      console.log(resp);
    } else {
      // TODO: denied section, how to ask for more information?
      console.log("TODO ask for more info?");
    }

    const msgUpdate = await client.chat.update({
      channel: body.container.channel_id,
      ts: body.container.message_ts,
      blocks: [
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `${
                approved
                  ? "Task created within SFDC"
                  : "Which part should I review?"
              }`,
            },
          ],
        },
      ],
    });
    if (!msgUpdate.ok) {
      console.log("Error during manager chat.update!", msgUpdate.error);
    }

    await client.functions.completeSuccess({
      function_execution_id: body.function_data.execution_id,
      outputs: {},
    });
  },
);
