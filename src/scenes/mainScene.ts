import { select } from "../lib/select";
import { initialUserInfo } from "../lib/ws";

const root = select<HTMLDivElement>("#main-scene");
const elements = {
  username: select("#ms-username", root),
} as const;

initialUserInfo.then((initialUserInfo) => {
  elements.username.textContent = initialUserInfo.username;
});
