import {
  Form,
  ActionPanel,
  Action,
  getPreferenceValues,
  Icon,
  openCommandPreferences,
  useNavigation,
  Detail,
  // Cache,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { TextDecoderStream } from "node:stream/web";
import crypto from "crypto";

interface Preferences {
  chatGPTToken: string;
}

type Values = {
  message: string;
};

type Message = { id: string; value: string };

type ChatGPTResponseProps = {
  message: Message;
};

// const cache = new Cache();

function ChatGPTResponse(props: ChatGPTResponseProps) {
  const { chatGPTToken } = getPreferenceValues<Preferences>();

  const [isLoading, setIsLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState("");
  // console.log(cache.get("messages"))

  const { message } = props;
  useEffect(() => {
    (async () => {
      const response = await fetch("https://chat.openai.com/backend-api/conversation", {
        method: "POST",
        headers: {
          accept: "text/event-stream",
          "accept-language": "en-US,en;q=0.9",
          authorization: `Bearer ${chatGPTToken}`,
          "content-type": "application/json",
        },
        referrer: "https://chat.openai.com/chat",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: JSON.stringify({
          action: "next",
          messages: [
            {
              id: message.id,
              role: "user",
              content: { content_type: "text", parts: [message.value] },
            },
          ],
          parent_message_id: crypto.randomUUID(),
          model: "text-davinci-002-render",
        }),
        mode: "cors",
        credentials: "include",
      });
      const stream = response.body;
      const textStream = stream?.pipeThrough(new TextDecoderStream());
      setIsLoading(false);
      for await (const chunk of textStream) {
        try {
          const chunkData = JSON.parse(chunk.replace("data: ", ""));
          setCurrentMessage(chunkData.message.content.parts[0]);
        } catch (error) {} // Swallow errors – if JSON.parse is not valid data it should not do anything
      }
    })();
  }, []);
  return <Detail isLoading={isLoading} markdown={currentMessage} />;
}

export default function Command() {
  const { push } = useNavigation();
  const [messageValue, setMessageValue] = useState("");

  const handleSubmit = async (values: Values) => {
    const message = {
      value: values.message,
      id: crypto.randomUUID(),
    };

    // if (cache.has("messages") && cache.get("messages")?.length) {
    //   const existingMessages = JSON.parse(cache.get("messages")!)
    //   cache.set("messages", JSON.stringify([
    //     ...existingMessages,
    //     message
    //   ]));
    // } else {
    //   cache.set("messages", JSON.stringify([message]))
    // }

    push(<ChatGPTResponse message={message} />);
    setMessageValue("");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Message} onSubmit={handleSubmit} />
          {/* <Action title="Restart conversation" icon={Icon.Repeat} onAction={() => cache.remove("messages")} /> */}
          <Action title="Change ChatGPT token" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        value={messageValue}
        onChange={(value) => setMessageValue(value)}
        placeholder="Enter message..."
      />
    </Form>
  );
}
