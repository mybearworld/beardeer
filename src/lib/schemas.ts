import { z } from "zod/v4";

export const userSchema = z.object({
  _id: z.string(),
  username: z.string(),
  display_name: z.string(),
  created: z.number().transform((n) => new Date(n * 1000)),
  avatar: z.string(),
  bot: z.boolean(),
  banned_until: z.number(),
  permissions: z.string().array(),
  profile: z.object({
    bio: z.string(),
    lastfm: z.string(),
  }),
  // todo: css and banner
});
export type User = z.infer<typeof userSchema>;
