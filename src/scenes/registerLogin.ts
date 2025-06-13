import { z } from "zod/v4";
import { select } from "../lib/select";
import { switchToScene } from "../lib/scene";
import { userSchema } from "../lib/schemas";
import { gotInitialUserInfo, send } from "../lib/ws";

const root = select<HTMLDivElement>("#register-login");
const elements = {
  tabLogin: select<HTMLButtonElement>("#rl-t-login", root),
  tabSignup: select<HTMLButtonElement>("#rl-t-signup", root),
  tabGuest: select<HTMLButtonElement>("#rl-t-guest", root),
  loginContainer: select<HTMLDivElement>("#rl-login-container", root),
  signupContainer: select<HTMLDivElement>("#rl-signup-container", root),
  loginUsername: select<HTMLInputElement>(`#rl-username`, root),
  loginPassword: select<HTMLInputElement>(`#rl-password`, root),
  loginButton: select<HTMLInputElement>(`#rl-login-button`, root),
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
    })
  );
  if (!response) return;
  gotInitialUserInfo(response.user);
  switchToScene("main-scene");
});
