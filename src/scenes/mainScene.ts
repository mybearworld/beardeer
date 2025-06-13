import { switchToScene } from "../lib/scene";
import type { Post } from "../lib/schemas";
import { select } from "../lib/select";
import { startupInfo, initialUserInfo } from "../lib/ws";

const root = select("div", "#main-scene");
const elements = {
  username: select("span", "#ms-username", root),
  showGuestNav: select("div", "#ms-show-guest-nav", root),
  backToMenuButton: select("button", "#ms-button-reload", root),
  posts: select("div", "#ms-posts", root),
  postTemplate: select("template", "#ms-post-template", root),
} as const;

initialUserInfo.then((initialUserInfo) => {
  elements.username.textContent = initialUserInfo.username;
  elements.showGuestNav.classList.add("hidden");
});
startupInfo.then((startupInfo) => {
  startupInfo.messages.forEach((post) => {
    elements.posts.append(postElement(post));
  });
});

elements.backToMenuButton.addEventListener("click", () => {
  switchToScene("register-login");
});

const postElement = (post: Post) => {
  const element = elements.postTemplate.content.cloneNode(
    true
  ) as DocumentFragment;
  select("img", ".pfp", element).src = post.author.avatar;
  select("b", ".post-display-name", element).textContent =
    post.author.display_name;
  select("span", ".post-username", element).textContent = post.author.username;
  select("span", ".post-date", element).textContent =
    post.created.toLocaleString();
  select("p", ".post-content", element).textContent = post.content;
  return element;
};
