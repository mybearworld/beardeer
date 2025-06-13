import { z } from "zod/v4";
import { switchToScene } from "../lib/scene";
import { postSchema, ulistSchema, type Post, type Ulist } from "../lib/schemas";
import { clone, select } from "../lib/elements";
import { startupInfo, initialUserInfo, listen, send } from "../lib/ws";

const root = select("div", "#main-scene");
const elements = {
  username: select("span", "#ms-username", root),
  showGuestNav: select("div", "#ms-show-guest-nav", root),
  backToMenuButton: select("button", "#ms-button-reload", root),
  ulist: select("div", "#ms-ulist", root),
  makePost: select("div", "#ms-make-post", root),
  doNotTheSpamming: select("div", "#ms-do-not-the-spamming", root),
  buttonPresets: select("button", "#ms-button-presets", root),
  buttonAttachment: select("button", "#ms-button-attachment", root),
  msg: select("textarea", "#ms-msg", root),
  suggestions: select("div", "#ms-suggestions", root),
  presets: select("span", "#ms-presets", root),
  buttonPost: select("button", "#ms-button-post", root),
  posts: select("div", "#ms-posts", root),
  postTemplate: select("template", "#ms-post-template", root),
} as const;

const posts: Record<string, { element: HTMLDivElement; data: Post }> = {};

initialUserInfo.then((initialUserInfo) => {
  elements.username.textContent = initialUserInfo.username;
  elements.showGuestNav.classList.add("hidden");
  elements.makePost.classList.remove("hidden");
});
startupInfo.then((startupInfo) => {
  startupInfo.messages.forEach((post) => {
    const element = postElement(post);
    posts[post._id] = { element, data: post };
    elements.posts.append(element);
  });
  updateUlist(startupInfo.ulist);
});

elements.backToMenuButton.addEventListener("click", () => {
  switchToScene("register-login");
});

elements.msg.addEventListener("keydown", (ev) => {
  resizePostBox();
  if (ev.key === "Enter" && !ev.shiftKey) {
    ev.preventDefault();
    sendPost();
  }
});
elements.buttonPost.addEventListener("click", () => {
  sendPost();
});

const sendPost = async () => {
  await send(
    {
      command: "post",
      content: elements.msg.value,
      replies: [],
      attachments: [],
    },
    z.object({}),
  );
  elements.msg.value = "";
  resizePostBox();
};
const resizePostBox = () => {
  requestAnimationFrame(() => {
    elements.msg.style.minHeight = "auto";
    elements.msg.style.minHeight = elements.msg.scrollHeight + "px";
  });
};

listen(
  z.object({
    command: z.literal("ulist"),
    ulist: ulistSchema,
  }),
  (packet) => {
    updateUlist(packet.ulist);
  },
);
listen(
  z.object({
    command: z.literal("new_post"),
    data: postSchema,
  }),
  (packet) => {
    const element = postElement(packet.data);
    posts[packet.data._id] = { element, data: packet.data };
    elements.posts.insertBefore(element, elements.posts.firstChild);
  },
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
  },
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
    replaced.textContent =
      packet.deleted_by_author ?
        "post deleted by author"
      : "post deleted by moderator";
    postElement.replaceWith(replaced);
    delete posts[packet._id];
  },
);

const clientIcon = (c: string | null) =>
  c === null ? " 🤖"
  : c.startsWith("BossDeer ") ? " 🦌"
  : c.startsWith("BearDeer") ? " 🐻"
  : c.startsWith("BetterDeer ") ? " ✨"
  : c.startsWith("PresetDeer ") ? " 🧩"
  : c.startsWith("Kansas") ? " 🇺🇸"
  : c.startsWith("whitetail") ? "🦨"
  : c === "Unknown" ? "❓"
  : "🤖";

const updateUlist = (ulist: Ulist) => {
  const entries = Object.entries(ulist);
  if (entries.length === 0) {
    elements.ulist.innerHTML = `Nobody is online. 😥🦌`;
    return;
  }
  if (entries.length === 1) {
    elements.ulist.innerHTML = "You are the only user online. 😥🦌";
    return;
  }
  elements.ulist.textContent = `${entries.length} users online (`;
  entries.forEach(([name, { client }], i) => {
    const span = document.createElement("span");
    span.textContent = name + " " + clientIcon(client);
    span.title = client || "";
    elements.ulist.append(span);
    if (i !== entries.length - 1) {
      elements.ulist.append(", ");
    }
  });
  elements.ulist.append(")");
};

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
