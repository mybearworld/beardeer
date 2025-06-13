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
  generateInviteCode: select("button", "#mm-generate-invite-code", root),
  resetInviteCodes: select("button", "#mm-reset-invite-codes", root),
  forcekickUsername: select("input", "#mm-forcekick-username", root),
  forcekick: select("button", "#mm-forcekick", root),
  inboxMessage: select("input", "#mm-inbox-message", root),
  inbox: select("button", "#mm-inbox", root),
  ipsUsername: select("input", "#mm-ips-username", root),
  ips: select("button", "#mm-ips", root),
  ipBanIP: select("input", "#mm-ipban-ip", root),
  ipBan: select("button", "#mm-ipban", root),
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

elements.generateInviteCode.addEventListener("click", async () => {
  const invite = await send(
    { command: "gen_invite" },
    z.object({ invite_code: z.string() }),
  );
  if (!invite) return;
  alert("Your invite code is: " + invite.invite_code);
});
elements.resetInviteCodes.addEventListener("click", async () => {
  await send({ command: "reset_invites" }, z.object({}));
});

elements.forcekick.addEventListener("click", async () => {
  if (
    await send(
      { command: "force_kick", username: elements.forcekickUsername.value },
      z.object({}),
    )
  ) {
    elements.forcekickUsername.value = "";
  }
});

elements.inbox.addEventListener("click", async () => {
  if (
    await send(
      {
        command: "post_inbox",
        content: elements.inboxMessage.value,
        replies: [],
        attachments: [],
      },
      z.object({}),
    )
  ) {
    elements.inboxMessage.value = "";
  }
});

elements.ips.addEventListener("click", async () => {
  const ips = await send(
    { command: "get_ips", username: elements.ipsUsername.value },
    z.object({ ips: z.string().array() }),
  );
  if (!ips) return;
  alert(
    `${elements.ipsUsername.value}'s recent IPs are:\n` +
      ips.ips.map((s) => `- ${s}`).join("\n"),
  );
  elements.ipsUsername.value = "";
});

elements.ipBan.addEventListener("click", async () => {
  if (
    await send(
      { command: "banish_to_the_SHADOW_REALM", ip: elements.ipBanIP.value },
      z.object({}),
    )
  ) {
    elements.ipBanIP.value = "";
  }
});
