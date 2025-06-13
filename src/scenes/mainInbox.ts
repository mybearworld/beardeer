import { z } from "zod/v4";
import { select } from "../lib/elements";
import { onSceneOnce, switchToScene } from "../lib/scene";
import { send } from "../lib/ws";
import { inboxPostSchema } from "../lib/schemas";

const root = select("div", "#main-inbox");
const elements = {
  buttonBack: select("button", "#mi-button-back", root),
  posts: select("div", "#mi-posts", root),
} as const;

elements.buttonBack.addEventListener("click", () => {
  switchToScene("main-scene");
});

onSceneOnce("main-inbox", async () => {
  const inboxPosts = await send(
    { command: "get_inbox" },
    z.object({ inbox: inboxPostSchema.array() }),
  );
  if (!inboxPosts) return;
  inboxPosts.inbox.forEach((post) => {
    elements.posts.append(post.content);
    const em = document.createElement("em");
    em.style.display = "block";
    em.style.marginBottom = "1rem";
    em.textContent = ` - @${post.author} (${post.created.toLocaleString()})`;
    elements.posts.append(em);
  });
});
