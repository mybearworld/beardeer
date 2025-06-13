import { z } from "zod/v4";
import { select } from "../lib/elements";
import { onSceneOnce, switchToScene } from "../lib/scene";
import { userSchema } from "../lib/schemas";
import { gotInitialUserInfo, send, startupInfo } from "../lib/ws";

const root = select("div", "#register-login");
const elements = {
  tabLogin: select("button", "#rl-t-login", root),
  tabSignup: select("button", "#rl-t-signup", root),
  tabGuest: select("button", "#rl-t-guest", root),
  loginContainer: select("div", "#rl-login-container", root),
  signupContainer: select("div", "#rl-signup-container", root),
  loginUsername: select("input", `#rl-username`, root),
  loginPassword: select("input", `#rl-password`, root),
  loginButton: select("button", `#rl-login-button`, root),
} as const;

elements.tabLogin.addEventListener("click", () => {
  elements.loginContainer.classList.remove("hidden");
  elements.signupContainer.classList.add("hidden");
});
elements.tabSignup.addEventListener("click", () => {
  elements.loginContainer.classList.add("hidden");
  elements.signupContainer.classList.remove("hidden");
});
elements.tabGuest.addEventListener("click", () => {
  switchToScene("main-scene");
});
elements.loginButton.addEventListener("click", async () => {
  const response = await send(
    {
      command: "login_pswd",
      username: elements.loginUsername.value,
      password: elements.loginPassword.value,
      client: "BearDeer v2",
    },
    z.object({
      token: z.string(),
      user: userSchema,
    }),
  );
  if (!response) return;
  gotInitialUserInfo(response.token, response.user);
  switchToScene("main-scene");
});

const storedToken = localStorage.getItem("beardeer:token");
onSceneOnce("register-login", () => {
  if (storedToken) {
    switchToScene("main-scene");
  }
});
startupInfo.then(async () => {
  if (storedToken) {
    const response = await send(
      {
        command: "login_token",
        token: storedToken,
        client: "BearDeer v2",
      },
      z.object({
        user: userSchema,
      }),
    );
    if (!response) {
      switchToScene("register-login");
      return;
    }
    gotInitialUserInfo(storedToken, response.user);
  }
});
