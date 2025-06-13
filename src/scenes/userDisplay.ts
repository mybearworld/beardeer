import { z } from "zod/v4";
import { select } from "../lib/elements";
import { onScene, openProfile, switchToScene } from "../lib/scene";
import { userSchema } from "../lib/schemas";
import { send } from "../lib/ws";

const root = select("div", "#user-display");
const elements = {
  buttonBack: select("button", "#ud-button-back", root),
  iframe: select("iframe", "#ud-iframe", root),
} as const;

elements.buttonBack.addEventListener("click", () => {
  switchToScene("main-scene");
});

const timeZones = {
  cole: "America/Detroit",
  delusions: "Europe/London",
  engineerrunner: "Europe/London",
  mybearworld: "Europe/Berlin",
  noodles: "-05:00",
  notfenixio: "Europe/Madrid",
  pix: "America/Detroit",
  pkmnq: "+08:00",
  stripes: "America/Detroit",
  wlodekm: "Europe/Kyiv",
};
let timeUpdate: number | null = null;

onScene("user-display", async () => {
  elements.iframe.classList.add("hidden");
  const user = await send(
    { command: "get_user", username: openProfile() },
    z.object({ user: userSchema }),
  );
  if (!user) {
    switchToScene("main-scene");
    return;
  }
  const idocument = elements.iframe.contentDocument;
  if (!idocument) {
    throw new Error("No document");
  }
  select("style", "#ud-custom-css", idocument).innerHTML =
    user.user.profile.css || "";
  select("span", "#ud-d-tags", idocument).innerHTML = "";
  select("img", "#ud-avatar", idocument).src = user.user.avatar;
  select("span", "#ud-display-name", idocument).innerText =
    user.user.display_name;
  select("span", "#ud-username", idocument).innerText =
    "@" + user.user.username;
  const banner = select("div", "#ud-banner", idocument);
  banner.style.backgroundImage =
    user.user.banner ? `url('${user.user.banner}')` : "";
  banner.classList.toggle("has-banner", !!user.user.banner);
  if (user.user.username in timeZones) {
    const formatter = new Intl.DateTimeFormat([], {
      timeZone: timeZones[user.user.username as keyof typeof timeZones],
      dateStyle: "short",
      timeStyle: "medium",
    });
    const updateTimeZone = () => {
      select("span", "#ud-tz", idocument).innerText = formatter.format(
        new Date(),
      );
    };
    if (timeUpdate !== null) {
      clearInterval(timeUpdate);
    }
    updateTimeZone();
    timeUpdate = setInterval(updateTimeZone, 500);
  } else {
    select("span", "#ud-tz", idocument).innerText = "Unknown";
  }
  select("span", "#ud-created", idocument).innerText =
    user.user.created.toLocaleString();
  select("small", "#ud-permissions", idocument).innerText =
    `Permissions: ${user.user.permissions.toString().toLowerCase().replace(/,/g, ", ")}`;
  select("small", "#ud-special", idocument).innerHTML = "";
  if (user.user.banned_until > new Date().getTime() / 1000) {
    select("span", "#ud-banned-span", idocument).innerText =
      `Banned until ${new Date(user.user.banned_until * 1000).toLocaleString()}`;
    select("span", "#ud-banned", idocument).classList.remove("hidden");
  } else {
    select("span", "#ud-banned", idocument).classList.add("hidden");
  }
  select("span", "#ud-bio", idocument).textContent =
    user.user.profile.bio || "This user does not have a bio.";
  if (user.user.profile.lastfm) {
    select("div", "#ud-lastfm-container", idocument).classList.add("hidden");
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        var lfm = JSON.parse(xhttp.responseText);
        if (lfm.track["@attr"] && lfm.track["@attr"].nowplaying) {
          select("div", "#ud-lastfm-container", idocument).classList.remove(
            "hidden",
          );
          select("img", "#ud-lastfm-cover", idocument).src =
            lfm.track.image[lfm.track.image.length - 1]["#text"];
          select("span", "#ud-lastfm-name", idocument).innerText =
            lfm.track.name;
          select("span", "#ud-lastfm-album", idocument).innerText =
            `on "${lfm.track.album["#text"]}"`;
          select("span", "#ud-lastfm-artist", idocument).innerText =
            `by "${lfm.track.artist["#text"]}"`;
        } else {
          select("div", "#ud-lastfm-container", idocument).classList.add(
            "hidden",
          );
        }
      }
    };
    xhttp.open(
      "GET",
      `https://lastfm.kije.workers.dev/${user.user.profile.lastfm}`,
      true,
    );
    xhttp.send();
  } else {
    select("div", "#ud-lastfm-container", idocument).classList.add("hidden");
  }
  elements.iframe.classList.remove("hidden");
});
