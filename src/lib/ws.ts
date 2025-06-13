import { z } from "zod/v4";
import { postSchema, type User } from "./schemas";

const startupInfoSchema = z.object({
  command: z.literal("greet"),
  version: z.string(),
  messages: postSchema.array(),
});

const websocket = new WebSocket("wss://chaos.goog-search.eu.org/");

export const startupInfo = new Promise<z.infer<typeof startupInfoSchema>>(
  (resolve) => {
    const initListener = (ev: MessageEvent<string>) => {
      const parsed = startupInfoSchema.safeParse(JSON.parse(ev.data));
      if (parsed.success) {
        resolve(parsed.data);
        websocket.removeEventListener("message", initListener);
      }
    };
    websocket.addEventListener("message", initListener);
  }
);
let resolveInitialUserInfo: (user: User) => void;
export const initialUserInfo = new Promise<User>((resolve) => {
  resolveInitialUserInfo = resolve;
});
export const gotInitialUserInfo = (user: User) => {
  resolveInitialUserInfo(user);
};

let listenerI = 0;
export const send = <TResponse extends z.ZodObject>(
  packet: Record<string, unknown>,
  response: TResponse
) =>
  new Promise<z.infer<TResponse> | null>((resolve) => {
    const listener = listenerI++;
    const schema = response
      .and(z.object({ error: z.literal(false), listener: z.literal(listener) }))
      .or(
        z.object({
          error: z.literal(true),
          code: z.string(),
          form: z.string(),
          context: z.string(),
          listener: z.literal(listener),
        })
      );
    const event = (ev: MessageEvent<string>) => {
      const parsed = schema.safeParse(JSON.parse(ev.data));
      if (!parsed.success) {
        return;
      }
      if (parsed.data.error) {
        alert(
          `uh oh! ${parsed.data.context} (${parsed.data.code} in ${parsed.data.form})`
        );
        resolve(null);
      } else {
        resolve(parsed.data);
      }
      websocket.removeEventListener("message", event);
    };
    startupInfo.then(() => {
      websocket.send(JSON.stringify({ ...packet, listener }));
      websocket.addEventListener("message", event);
    });
  });
