import { z } from "zod/v4";
import {
  switchToProfile as switchToProfile,
  switchToScene,
} from "../lib/scene";
import { postSchema, ulistSchema, type Post, type Ulist } from "../lib/schemas";
import { clone, select } from "../lib/elements";
import { startupInfo, initialUserInfo, listen, send } from "../lib/ws";
import { parseMarkdown } from "../lib/markdown";
import { getSetting } from "../lib/settings";

const root = select("div", "#main-scene");
const elements = {
  showGuestNav: select("span", "#ms-show-guest-nav", root),
  backToMenuButton: select("button", "#ms-button-reload", root),
  buttonProfile: select("button", "#ms-button-profile", root),
  username: select("span", "#ms-username", root),
  buttonInbox: select("button", "#ms-button-inbox", root),
  buttonLiveChat: select("button", "#ms-button-livechat", root),
  buttonGoToUser: select("button", "#ms-button-go-to-user", root),
  buttonSettings: select("button", "#ms-button-settings", root),
  buttonModeration: select("button", "#ms-button-moderation", root),
  buttonLogOut: select("button", "#ms-button-log-out", root),
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
  livechatPosts: select("div", "#ml-posts", root),
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
  elements.buttonProfile.classList.remove("hidden");
  elements.buttonProfile.addEventListener("click", () => {
    switchToProfile(initialUserInfo.username);
  });
  elements.buttonInbox.classList.remove("hidden");
  elements.buttonLiveChat.classList.remove("hidden");
  elements.buttonGoToUser.classList.remove("hidden");
  elements.buttonSettings.classList.remove("hidden");
  if (initialUserInfo.permissions.length !== 0) {
    elements.buttonModeration.classList.remove("hidden");
  }
  elements.buttonLogOut.classList.remove("hidden");
});
startupInfo.then((startupInfo) => {
  startupInfo.messages.forEach((post) => {
    const element = postElement(post, false);
    posts[post._id] = { element, data: post, replies: [] };
    elements.posts.append(element);
  });
  updateUlist(startupInfo.ulist);
});

elements.backToMenuButton.addEventListener("click", () => {
  switchToScene("register-login");
});

elements.buttonInbox.addEventListener("click", () => {
  switchToScene("main-inbox");
});

elements.buttonGoToUser.addEventListener("click", () => {
  const user = prompt("What user do you want to go to?");
  if (!user) return;
  switchToProfile(user);
});

elements.buttonModeration.addEventListener("click", () => {
  switchToScene("main-moderation");
});

elements.buttonSettings.addEventListener("click", () => {
  switchToScene("main-config");
});

elements.buttonLogOut.addEventListener("click", () => {
  localStorage.removeItem("beardeer:token");
  location.reload();
});

let livechat = false;
elements.buttonLiveChat.addEventListener("click", () => {
  livechat = !livechat;
  elements.buttonLiveChat.textContent = livechat ? "Home" : "Livechat";
  elements.posts.classList.toggle("hidden", livechat);
  elements.livechatPosts.classList.toggle("hidden", !livechat);
});

elements.msg.addEventListener("keydown", (ev) => {
  resizeTextArea(elements.msg);
  if (getSetting("enterSends") && ev.key === "Enter" && !ev.shiftKey) {
    ev.preventDefault();
    sendPost();
  }
  if (ev.key === "Tab") {
    const first = elements.suggestions.firstChild;
    if (first && first instanceof HTMLButtonElement) {
      first.click();
      ev.preventDefault();
    }
  }
});
["touchstart", "keyup", "mouseup", "keydown", "focus"].forEach((e) => {
  elements.msg.addEventListener(e, () => selection());
});
elements.buttonPost.addEventListener("click", () => {
  sendPost();
});

let replies: string[] = [];
let attachments: string[] = [];
const sendPost = async () => {
  const response = await send(
    {
      command: "post",
      content: elements.msg.value,
      ...(livechat ? { chat: "livechat" } : {}),
      replies,
      attachments,
    },
    z.object({}),
  );
  if (!response) return;
  replies = [];
  elements.msg.value = "";
  resizeTextArea(elements.msg);
  clearDetails();
};
const resizeTextArea = (textarea: HTMLTextAreaElement) => {
  requestAnimationFrame(() => {
    textarea.style.minHeight = "auto";
    textarea.style.minHeight = textarea.scrollHeight + "px";
  });
};
const updateDetails = () => {
  if (replies.length === 0 && attachments.length === 0) {
    elements.details.classList.add("hidden");
  } else {
    elements.details.classList.remove("hidden");
    elements.detailsText.textContent = `${replies.length} repl${replies.length === 1 ? "y" : "ies"}, ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`;
  }
};
elements.buttonAttachment.addEventListener("click", () => {
  if (attachments.length === 5) {
    alert("You already have 5 attachments.");
    return;
  }
  const url = prompt("Attachment URL...");
  if (!url) return;
  attachments.push(url);
  updateDetails();
});
elements.detailsClear.addEventListener("click", () => clearDetails());
const clearDetails = () => {
  replies = [];
  attachments = [];
  elements.replies.innerHTML = "";
  updateDetails();
};

let presetsOn = false;
elements.buttonPresets.addEventListener("click", () => {
  presetsOn = !presetsOn;
  elements.doNotTheSpamming.classList.toggle("hidden", !presetsOn);
  elements.msg.classList.toggle("hidden", presetsOn);
  elements.presets.classList.toggle("hidden", !presetsOn);
});
elements.presets.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    elements.msg.value = button.textContent || "";
    sendPost();
  });
});

function selection() {
  const suggestions = determineSuggestions();
  elements.suggestions.innerHTML = "";
  if (suggestions === null) return;
  elements.suggestions.append(
    ...suggestions.map(({ desc, string, newPos }) => {
      const btn = document.createElement("button");
      btn.textContent = desc;
      btn.addEventListener("click", () => {
        elements.msg.value = string;
        elements.msg.setSelectionRange(newPos, newPos);
        elements.msg.focus();
        selection();
      });
      return btn;
    }),
  );
}

function determineSuggestions() {
  elements.suggestions.classList.remove("hidden");
  if (elements.msg.selectionStart !== elements.msg.selectionEnd) return null;
  const botSuggestions = determineBotSuggestions();
  if (botSuggestions !== null) return botSuggestions;
  const pre = elements.msg.value.slice(0, elements.msg.selectionStart);
  const post = elements.msg.value.slice(elements.msg.selectionStart);
  const mentionMatch = pre.match(/@([a-zA-Z\-_0-9]*)$/);
  if (mentionMatch) {
    const usernamePrefix = mentionMatch[1];
    const matchingUsers = onlineUsers.filter(
      (username) =>
        username !== usernamePrefix && username.startsWith(usernamePrefix),
    );
    return matchingUsers.map((user) => ({
      desc: "@" + user,
      string:
        pre.slice(0, -mentionMatch[0].length) +
        "@" +
        user +
        (post.startsWith(" ") ? "" : " ") +
        post,
      newPos:
        elements.msg.selectionStart + 1 + (user.length - usernamePrefix.length),
    }));
  }
  return null;
}

const BOTS = [
  {
    showIf: () => onlineUsers.includes("bot"),
    prefix: "/",
    // prettier-ignore
    commands: ["help", "ping", "whoami", "dice", "expose ", "grrr", "me", "orange", "work", "fish", "about", "golf", "glungus", "thesoupiscoldandthesaladishot", "count ", "math ", "lb", "pi", "bal", "8ball", "glup", "notify ", "reversefish", "hEmulator ", "shameposts"],
  },
  {
    showIf: () => onlineUsers.includes("legoshi"),
    prefix: "@legoshi ",
    // prettier-ignore
    commands: ["help", "quote", "cat", "death", "math ", "kill ", "balance", "labor", "reverselabor", "shop", "buy "],
  },
  {
    showIf: () => onlineUsers.includes("sb4bot"),
    prefix: "@sb4bot ",
    // prettier-ignore
    commands: ["help", "balance", "notify ", "reversework", "rps ", "rng ", "wawameter ", "work"],
  },
];

function determineBotSuggestions() {
  if (elements.msg.selectionStart !== elements.msg.value.length) return null;
  const bot = BOTS.find(
    (bot) => elements.msg.value.startsWith(bot.prefix) && bot.showIf(),
  );
  if (!bot) return null;
  return bot.commands
    .map((command) => bot.prefix + command)
    .filter(
      (command) =>
        command !== elements.msg.value &&
        command.startsWith(elements.msg.value),
    )
    .map((command) => ({
      desc: command.trim(),
      string: command,
      newPos: command.length,
    }));
}

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
    origin: z.literal("livechat").optional(),
  }),
  (packet) => {
    const element = postElement(packet.data, !!packet.origin);
    posts[packet.data._id] = { element, data: packet.data, replies: [] };
    (packet.origin ?
      elements.livechatPosts
    : elements.posts
    ).insertAdjacentElement("afterbegin", element);
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
    postElement.data.content = packet.content;
    if (postElement.element) {
      select("div", ".post-content", postElement.element).innerHTML =
        parseMarkdown(packet.content);
    }
    postElement.replies.forEach((reply) => {
      select("span", ".reply-content", reply).innerHTML = parseMarkdown(
        packet.content,
        { inline: true },
      );
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

let onlineUsers: string[] = [];
const updateUlist = (ulist: Ulist) => {
  const entries = Object.entries(ulist);
  onlineUsers = entries.map(([name]) => name);
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
    const button = document.createElement("button");
    button.classList.add("no-button-styles");
    button.textContent = name + " " + clientIcon(client);
    button.addEventListener("click", () => {
      switchToProfile(name);
    });
    button.title = client || "";
    elements.ulist.append(button);
    if (i !== entries.length - 1) {
      elements.ulist.append(", ");
    }
  });
  elements.ulist.append(")");
};

const postElement = (post: Post, isLiveChat: boolean) => {
  const element = select("div", ".post", clone(elements.postTemplate));
  select("img", ".pfp", element).src = post.author.avatar;
  select("button", ".post-pfp", element).addEventListener("click", () => {
    switchToProfile(post.author.username);
  });
  select("b", ".post-display-name", element).textContent =
    post.author.display_name;
  select("span", ".post-username", element).textContent = post.author.username;
  select("button", ".post-author", element).addEventListener("click", () => {
    switchToProfile(post.author.username);
  });
  select("span", ".post-date", element).textContent =
    post.created.toLocaleString();
  const postContent = select("div", ".post-content", element);
  postContent.innerHTML = parseMarkdown(post.content);
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
  const attachments = select("div", ".post-attachments", element);
  post.attachments.forEach((attachment) => {
    const attachmentEl = document.createElement("div");
    attachmentEl.classList.add("attachment");
    attachments.append(attachmentEl);
    fetch(attachment, { method: "HEAD" })
      .then(async (response) => {
        if (response.headers.get("content-type")?.startsWith("video/")) {
          const v = document.createElement("video");
          v.src = attachment;
          v.addEventListener("loadeddata", () => {
            v.height = v.clientHeight;
            v.width = v.clientWidth;
          });
          v.controls = true;
          attachmentEl.append(v);
        } else {
          const i = document.createElement("img");
          i.src = attachment;
          attachmentEl.append(i);
        }
      })
      .catch(() => {
        const i = document.createElement("img");
        i.src = attachment;
        attachmentEl.append(i);
      });
  });
  select("button", ".post-reply-button", element).addEventListener(
    "click",
    () => {
      if (replies.length === 5 || replies.some((reply) => reply === post._id)) {
        return;
      }
      replies.push(post._id);
      const div = document.createElement("div");
      div.classList.add("ms-reply-wrapper");
      const renderedReply = renderReply(post);
      div.append(renderedReply);
      const remove = document.createElement("button");
      remove.classList.add("no-button-styles");
      remove.classList.add("link-styles");
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        replies = replies.filter((r) => r !== post._id);
        div.remove();
        updateDetails();
      });
      div.append(remove);
      elements.replies.append(div);
      updateDetails();
      elements.msg.focus();
    },
  );
  initialUserInfo.then((initialUserInfo) => {
    if (!isLiveChat) {
      select("span", ".post-reply-button-area", element).classList.remove(
        "hidden",
      );
      if (initialUserInfo.username === post.author.username) {
        select("span", ".post-edit-button-area", element).classList.remove(
          "hidden",
        );
      }
      if (
        initialUserInfo.username === post.author.username ||
        initialUserInfo.permissions.includes("DELETE")
      ) {
        select("span", ".post-delete-button-area", element).classList.remove(
          "hidden",
        );
      }
    }
  });
  const editing = select("div", ".post-content-editing", element);
  const editingTextarea = select(
    "textarea",
    ".post-content-editing-textarea",
    element,
  );
  const edit = async () => {
    if (
      await send(
        {
          command: "edit_post",
          id: post._id,
          content: editingTextarea.value,
        },
        z.object({}),
      )
    ) {
      postContent.classList.remove("hidden");
      editing.classList.add("hidden");
    }
  };
  editingTextarea.addEventListener("keydown", (ev) => {
    resizeTextArea(editingTextarea);
    if (getSetting("enterSends") && ev.key === "Enter" && !ev.shiftKey) {
      edit();
      ev.preventDefault();
    }
  });
  select("button", ".post-edit-button", element).addEventListener(
    "click",
    () => {
      postContent.classList.add("hidden");
      editing.classList.remove("hidden");
      editingTextarea.value = posts[post._id].data.content;
      editingTextarea.focus();
    },
  );
  select("button", ".post-content-editing-ok", element).addEventListener(
    "click",
    edit,
  );
  select("button", ".post-content-editing-cancel", element).addEventListener(
    "click",
    () => {
      postContent.classList.remove("hidden");
      editing.classList.add("hidden");
    },
  );
  select("button", ".post-delete-button", element).addEventListener(
    "click",
    () => {
      if (confirm(`Do you want to delete this post?\n${post.content}`)) {
        send({ command: "delete_post", id: post._id }, z.object({}));
      }
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
  replyContent.innerHTML = parseMarkdown(reply.content, { inline: true });
  replyElement.addEventListener("click", () => {
    posts[reply._id]?.element?.scrollIntoView({ behavior: "smooth" });
  });
  return replyElement;
};
