import { z } from "zod/v4";
import { select } from "../lib/elements";
import { onScene, switchToScene } from "../lib/scene";
import { userSchema } from "../lib/schemas";
import { getSetting, setSetting, themes } from "../lib/settings";
import { initialUserInfo, send } from "../lib/ws";

const root = select("div", "#main-config");
const elements = {
  buttonBack: select("button", "#mc-button-back", root),
  displayName: select("input", "#mc-display-name", root),
  buttonDisplayName: select("button", "#mc-button-display-name", root),
  avatar: select("input", "#mc-avatar", root),
  buttonAvatar: select("button", "#mc-button-avatar", root),
  banner: select("input", "#mc-banner", root),
  buttonBanner: select("button", "#mc-button-banner", root),
  css: select("textarea", "#mc-css", root),
  buttonCSS: select("button", "#mc-button-css", root),
  bio: select("textarea", "#mc-bio", root),
  buttonBio: select("button", "#mc-button-bio", root),
  lastfm: select("input", "#mc-lastfm", root),
  buttonLastfm: select("button", "#mc-button-lastfm", root),
  enterSends: select("input", "#mc-enter-sends", root),
  selectedTheme: select("span", "#mc-selected-theme", root),
  themes: select("div", "#mc-themes", root),
  customCSS: select("textarea", "#mc-custom-css", root),
  deleteAccountPassword: select("input", "#mc-delete-account-password", root),
  buttonDeleteAccount: select("button", "#mc-delete-account", root),
} as const;

elements.buttonBack.addEventListener("click", () => {
  switchToScene("main-scene");
});

onScene("main-config", async () => {
  elements.enterSends.checked = getSetting("enterSends");
  elements.selectedTheme.textContent = getSetting("theme");
  elements.customCSS.textContent = getSetting("customCSS");
  const username = (await initialUserInfo).username;
  const user = await send(
    { command: "get_user", username },
    z.object({ user: userSchema }),
  );
  if (!user) {
    switchToScene("main-scene");
    return;
  }
  elements.displayName.value = user.user.display_name;
  elements.avatar.value = user.user.avatar;
  elements.banner.value = user.user.banner || "";
  elements.css.value = user.user.profile.css || "";
  elements.bio.value = user.user.profile.bio;
  elements.lastfm.value = user.user.profile.lastfm;
});

const setProperty = (property: string, value: { value: string }) =>
  send({ command: "set_property", property, value: value.value }, z.object({}));
elements.buttonDisplayName.addEventListener("click", () =>
  setProperty("display_name", elements.displayName),
);
elements.buttonAvatar.addEventListener("click", () =>
  setProperty("avatar", elements.avatar),
);
elements.buttonBanner.addEventListener("click", () =>
  setProperty("banner", elements.banner),
);
elements.buttonCSS.addEventListener("click", () =>
  setProperty("css", elements.css),
);
elements.buttonBio.addEventListener("click", () =>
  setProperty("bio", elements.bio),
);
elements.buttonLastfm.addEventListener("click", () =>
  setProperty("lastfm", elements.lastfm),
);

elements.enterSends.addEventListener("input", () => {
  setSetting("enterSends", elements.enterSends.checked);
});

themes.forEach((theme) => {
  const button = document.createElement("button");
  button.textContent = theme;
  button.addEventListener("click", () => {
    setSetting("theme", theme);
    elements.selectedTheme.textContent = theme;
  });
  elements.themes.append(button);
});
elements.customCSS.addEventListener("input", () => {
  setSetting("customCSS", elements.customCSS.value);
});

elements.buttonDeleteAccount.addEventListener("click", async () => {
  if (
    await send(
      {
        command: "delete_account",
        password: elements.deleteAccountPassword.value,
      },
      z.object({}),
    )
  ) {
    localStorage.removeItem("beardeer:token");
    location.reload();
  }
});
