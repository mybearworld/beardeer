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

const postSchemaInReplies = z.object({
  _id: z.string(),
  created: z.number().transform((n) => new Date(n * 1000)),
  content: z.string(),
  get replies() {
    return postSchemaInReplies.array();
  },
  attachments: z.string().array(),
  author: userSchema.omit({ profile: true }).or(z.string()),
});
export const postSchema = z.object({
  _id: z.string(),
  created: z.number().transform((n) => new Date(n * 1000)),
  content: z.string(),
  replies: postSchemaInReplies.array(),
  attachments: z.string().array(),
  author: userSchema.omit({ profile: true }),
});
export type Post = z.infer<typeof postSchema>;

export const ulistSchema = z.record(
  z.string(),
  z.object({
    client: z.string().nullable(),
  }),
);
export type Ulist = z.infer<typeof ulistSchema>;

export const inboxPostSchema = z.object({
  _id: z.string(),
  created: z.number().transform((n) => new Date(n * 1000)),
  content: z.string(),
  author: z.string(),
});
export type InboxPost = z.infer<typeof inboxPostSchema>;
