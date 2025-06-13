import { z } from "zod/v4";
import { postSchema, ulistSchema, type User } from "./schemas";

const startupInfoSchema = z.object({
  command: z.literal("greet"),
  version: z.string(),
  messages: postSchema.array(),
  ulist: ulistSchema,
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
  },
);

let resolveInitialUserInfo: (user: User) => void;
export const initialUserInfo = new Promise<User>((resolve) => {
  resolveInitialUserInfo = resolve;
});
export const gotInitialUserInfo = (token: string, user: User) => {
  localStorage.setItem("beardeer:token", token);
  resolveInitialUserInfo(user);
};

let listenerI = 0;
export const send = <TResponse extends z.ZodObject>(
  packet: Record<string, unknown>,
  response: TResponse,
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
          banned_until: z
            .number()
            .transform((n) => new Date(n * 1000))
            .optional(),
          ban_reason: z.string().optional(),
        }),
      );
    const event = async (ev: MessageEvent<string>) => {
      const parsed = schema.safeParse(JSON.parse(ev.data));
      if (!parsed.success) {
        return;
      }
      if (parsed.data.error) {
        console.log("!", parsed.data.code, parsed.data.code === "banned");
        if (parsed.data.code === "banned") {
          alert(
            `You are banned until ${parsed.data.banned_until?.toLocaleString() || "an unknown time"} for ${parsed.data.ban_reason || "an unknown reason"}. You will now be logged out.`,
          );
          localStorage.removeItem("beardeer:token");
          location.reload();
        }
        alert(
          `uh oh! ${parsed.data.context} (${parsed.data.code} in ${parsed.data.form})`,
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

export const listen = <TPacket extends z.ZodObject>(
  schema: TPacket,
  callback: (packet: z.infer<TPacket>) => void,
) => {
  websocket.addEventListener("message", (ev) => {
    const parsed = schema.safeParse(JSON.parse(ev.data));
    if (!parsed.success) {
      return;
    }
    callback(parsed.data);
  });
};
