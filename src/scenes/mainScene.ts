import { z } from "zod/v4";
import { switchToScene } from "../lib/scene";
import { postSchema, type Post } from "../lib/schemas";
import { clone, select } from "../lib/elements";
import { startupInfo, initialUserInfo, listen } from "../lib/ws";

const root = select("div", "#main-scene");
const elements = {
  username: select("span", "#ms-username", root),
  showGuestNav: select("div", "#ms-show-guest-nav", root),
  backToMenuButton: select("button", "#ms-button-reload", root),
  posts: select("div", "#ms-posts", root),
  postTemplate: select("template", "#ms-post-template", root),
} as const;

const posts: Record<string, { element: HTMLDivElement; data: Post }> = {};

initialUserInfo.then((initialUserInfo) => {
  elements.username.textContent = initialUserInfo.username;
  elements.showGuestNav.classList.add("hidden");
});
startupInfo.then((startupInfo) => {
  startupInfo.messages.forEach((post) => {
    const element = postElement(post);
    posts[post._id] = { element, data: post };
    elements.posts.append(element);
  });
});

elements.backToMenuButton.addEventListener("click", () => {
  switchToScene("register-login");
});

listen(
  z.object({
    command: z.literal("new_post"),
    data: postSchema,
  }),
  (packet) => {
    const element = postElement(packet.data);
    posts[packet.data._id] = { element, data: packet.data };
    elements.posts.insertBefore(element, elements.posts.firstChild);
  }
);
listen(
  z.object({
    command: z.literal("edited_post"),
    _id: z.string(),
    content: z.string(),
  }),
  (packet) => {
    const postElement = posts[packet._id]?.element;
    if (!postElement) {
      console.warn(`No post with the ID ${packet._id} found`);
      return;
    }
    select("p", ".post-content", postElement).textContent = packet.content;
  }
);
listen(
  z.object({
    command: z.literal("deleted_post"),
    _id: z.string(),
    deleted_by_author: z.boolean(),
  }),
  (packet) => {
    const postElement = posts[packet._id]?.element;
    if (!postElement) {
      console.warn(`No post with the ID ${packet._id} found`);
      return;
    }
    const replaced = document.createElement("div");
    replaced.classList.add("post-deletion-message");
    replaced.textContent = packet.deleted_by_author
      ? "post deleted by author"
      : "post deleted by moderator";
    postElement.replaceWith(replaced);
    delete posts[packet._id];
  }
);

const postElement = (post: Post) => {
  const element = select("div", ".post", clone(elements.postTemplate));
  element.dataset.postId = post._id;
  select("img", ".pfp", element).src = post.author.avatar;
  select("b", ".post-display-name", element).textContent =
    post.author.display_name;
  select("span", ".post-username", element).textContent = post.author.username;
  select("span", ".post-date", element).textContent =
    post.created.toLocaleString();
  select("p", ".post-content", element).textContent = post.content;
  return element;
};
