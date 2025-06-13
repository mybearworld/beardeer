import { z } from "zod/v4";
import { select } from "../lib/elements";
import { switchToScene } from "../lib/scene";
import { send } from "../lib/ws";

const root = select("div", "#main-moderation");
const elements = {
  buttonBack: select("button", "#mm-button-back", root),
  banUsername: select("input", "#mm-ban-username", root),
  banDate: select("input", "#mm-ban-date", root),
  banReason: select("input", "#mm-ban-reason", root),
  ban: select("button", "#mm-ban", root),
} as const;

elements.buttonBack.addEventListener("click", () => {
  switchToScene("main-scene");
});

elements.ban.addEventListener("click", async () => {
  const date = elements.banDate.value;
  if (!date) return;
  if (
    await send(
      {
        command: "ban",
        username: elements.banUsername.value,
        banned_until: new Date(date).getTime() / 1000,
        ban_reason: elements.banReason.value,
      },
      z.object({}),
    )
  ) {
    elements.banUsername.value = "";
    elements.banDate.value = "";
    elements.banReason.value = "";
  }
});
