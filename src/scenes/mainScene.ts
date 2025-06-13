import { switchToScene } from "../lib/scene";
import type { Post } from "../lib/schemas";
import { select } from "../lib/select";
import { startupInfo, initialUserInfo } from "../lib/ws";

const root = select("#main-scene");
const elements = {
  username: select("#ms-username", root),
  showGuestNav: select("#ms-show-guest-nav", root),
  backToMenuButton: select("#ms-button-reload", root),
  posts: select("#ms-posts", root),
  postTemplate: select<HTMLTemplateElement>("#ms-post-template", root),
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
  select<HTMLImageElement>(".pfp", element).src = post.author.avatar;
  select(".post-display-name", element).textContent = post.author.display_name;
  select(".post-username", element).textContent = post.author.username;
  select(".post-date", element).textContent = post.created.toLocaleString();
  select(".post-content", element).textContent = post.content;
  return element;
};
