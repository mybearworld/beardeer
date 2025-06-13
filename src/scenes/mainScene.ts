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
  details: select("div", "#ms-details", root),
  detailsText: select("span", "#ms-details-text", root),
  detailsClear: select("button", "#ms-details-clear", root),
  replies: select("div", "#ms-replies", root),
  posts: select("div", "#ms-posts", root),
  postTemplate: select("template", "#ms-post-template", root),
  replyTemplate: select("template", "#ms-reply-template", root),
} as const;

const posts: Record<
  string,
  {
    element?: HTMLDivElement;
    data: Omit<Post, "author"> & { author: Post["author"] | string };
    replies: HTMLButtonElement[];
  }
> = {};

initialUserInfo.then((initialUserInfo) => {
  elements.username.textContent = initialUserInfo.username;
  elements.showGuestNav.classList.add("hidden");
  elements.makePost.classList.remove("hidden");
});
startupInfo.then((startupInfo) => {
  startupInfo.messages.forEach((post) => {
    const element = postElement(post);
    posts[post._id] = { element, data: post, replies: [] };
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

let replies: string[] = [];
const sendPost = async () => {
  const response = await send(
    {
      command: "post",
      content: elements.msg.value,
      replies,
      attachments: [],
    },
    z.object({}),
  );
  if (!response) return;
  replies = [];
  elements.msg.value = "";
  resizePostBox();
  clearDetails();
};
const resizePostBox = () => {
  requestAnimationFrame(() => {
    elements.msg.style.minHeight = "auto";
    elements.msg.style.minHeight = elements.msg.scrollHeight + "px";
  });
};
const updateDetails = () => {
  if (replies.length === 0) {
    elements.details.classList.add("hidden");
  } else {
    elements.details.classList.remove("hidden");
    elements.detailsText.textContent = `${replies.length} repl${replies.length === 1 ? "y" : "ies"}`;
  }
};
elements.detailsClear.addEventListener("click", () => clearDetails());
const clearDetails = () => {
  replies = [];
  elements.replies.innerHTML = "";
  updateDetails();
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
    posts[packet.data._id] = { element, data: packet.data, replies: [] };
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
    const postElement = posts[packet._id];
    if (!postElement) {
      console.warn(`No post with the ID ${packet._id} found`);
      return;
    }
    if (postElement.element) {
      select("p", ".post-content", postElement.element).textContent =
        packet.content;
    }
    postElement.replies.forEach((reply) => {
      select("span", ".reply-content", reply).textContent = packet.content;
    });
  },
);
listen(
  z.object({
    command: z.literal("deleted_post"),
    _id: z.string(),
    deleted_by_author: z.boolean(),
  }),
  (packet) => {
    const postData = posts[packet._id];
    if (!postData) {
      console.warn(`No post with the ID ${packet._id} found`);
      return;
    }
    const message =
      packet.deleted_by_author ?
        "post deleted by author"
      : "post deleted by moderator";
    const element = postData.element;
    if (element) {
      const replaced = document.createElement("div");
      replaced.classList.add("post-deletion-message");
      replaced.textContent = message;
      element.replaceWith(replaced);
    }
    postData.replies.forEach((reply) => {
      select("span", ".reply-display-name", reply).textContent = "deleted";
      select("span", ".reply-username", reply).textContent = "deleted";
      select("span", ".reply-content", reply).textContent = message;
    });
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
  select("img", ".pfp", element).src = post.author.avatar;
  select("b", ".post-display-name", element).textContent =
    post.author.display_name;
  select("span", ".post-username", element).textContent = post.author.username;
  select("span", ".post-date", element).textContent =
    post.created.toLocaleString();
  select("p", ".post-content", element).textContent = post.content;
  const repliesElement = select("div", ".post-replies", element);
  post.replies.forEach((reply) => {
    const replyElement = renderReply(reply);
    if (posts[reply._id]) {
      posts[reply._id].replies.push(replyElement);
    } else {
      posts[reply._id] = { data: reply, replies: [replyElement] };
    }
    repliesElement.append(replyElement);
  });
  select("button", ".post-reply-button", element).addEventListener(
    "click",
    () => {
      if (replies.length === 5 || replies.some((reply) => reply === post._id)) {
        return;
      }
      replies.push(post._id);
      elements.replies.append(renderReply(post));
      updateDetails();
      elements.msg.focus();
    },
  );
  return element;
};

const renderReply = (
  reply: Omit<Post, "author"> & { author: Post["author"] | string },
) => {
  const replyElement = select(
    "button",
    ".reply",
    clone(elements.replyTemplate),
  );
  select("span", ".reply-display-name", replyElement).textContent =
    typeof reply.author === "string" ? reply.author : reply.author.display_name;
  select("span", ".reply-username", replyElement).textContent =
    typeof reply.author === "string" ? reply.author : reply.author.username;
  const replyContent = select("span", ".reply-content", replyElement);
  replyContent.textContent = reply.content;
  replyElement.addEventListener("click", () => {
    posts[reply._id]?.element?.scrollIntoView({ behavior: "smooth" });
  });
  return replyElement;
};
