const md = markdownit({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }

    return ""; // use external default escaping
  },
  html: false,
  linkify: true,
  typographer: false,
  breaks: true,
  image: false, // i dont remember typing this
}).disable("image");

const hescape = (s) =>
  s ?
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  : s;

document.getElementById("rl-username").value = "";
document.getElementById("rl-password").value = "";
document.getElementById("rl-invitecode").value = "";

function displayError(errText) {
  document.getElementById("error-text").innerText = errText;
  if (errText.includes("{{Reload}}")) {
    document.getElementById("error-text").innerHTML = errText.replaceAll(
      "{{Reload}}",
      "<span class='text-clickable' onclick='window.location.reload();'>Reload</span>",
    );
  }
  document.getElementById("error-bar").classList.remove("hidden");
}

function closePopup() {
  document.getElementById("error-bar").classList.add("hidden");
}

const version = "1.7.6b";
const serverVersion = "Vulcan-1.0.0a";
let last_cmd = "";
let username = "";
let logged_in = false; // unused?
let authed = false;
let scene = "loading";
let ulist = [];
let raw_ulist = {};
let posts = {};
let lcPosts = {};
let posts_list = [];
let lcPosts_list = [];
let replies = [];
let attachments = [];
let editing = false;
let edit_id = "";
let delete_all = false;
let guest = false;
let timeUpdate = null;
let blocked_theme_users = [];

let themes = {
  deer: "Deer",
  helium: "Helium",
  midnight: "Midnight",
  bright: "Bright",
  "cosmic-latte": "Cosmic Latte",
  roarer1: "Roarer 1",
  souple: "Souple",
  dusk: "Dusk (rethinkdeer)",
};

let replace_text = false;
let detect_file_type = false;
let enter_send = true;
let presets = false;
let text_replacements = {
  "\\n": "\n",
  ":x:": "❌",
  ":+1:": ":yuhhuh:",
  ":-1:": ":nuhhuh:",
  ":check:": "✅",
  ":b:": "🅱️",
};

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

if (localStorage.getItem("beardeer:theme") == null) {
  localStorage.setItem("beardeer:theme", "helium");
} else if ((!localStorage.getItem("beardeer:theme")) in themes) {
  localStorage.setItem("beardeer:theme", "helium");
}

if (localStorage.getItem("beardeer:customCSS")) {
  document.getElementById("custom-style").innerText =
    localStorage.getItem("beardeer:customCSS");
  document.getElementById("mc-theme-custom").value =
    localStorage.getItem("beardeer:customCSS");
}

if (localStorage.getItem("beardeer:blockedThemeUsers")) {
  blocked_theme_users = JSON.parse(
    localStorage.getItem("beardeer:blockedThemeUsers"),
  );
  if (Array.isArray(blocked_theme_users)) {
    blocked_theme_users = Object.fromEntries(
      blocked_theme_users.map((user) => [user, false]),
    );
    localStorage.setItem(
      "beardeer:blockedThemeUsers",
      JSON.stringify(blocked_theme_users),
    );
  }
} else {
  blocked_theme_users = {};
  localStorage.setItem("beardeer:blockedThemeUsers", "{}");
}

document.getElementById("top-style").href =
  `themes/${localStorage.getItem("beardeer:theme")}.css`;
const settings_template = {
  replace_text: true,
  detect_file_type: false,
  debug: true,
  upload_key: "",
  upload_service: "",
  enter_send: true,
  display_post_themes: true,
  uwu: false,
};

if (localStorage.getItem("beardeer:settings") == null) {
  localStorage.setItem("beardeer:settings", JSON.stringify(settings_template));
}

if (localStorage.getItem("beardeer:last_inbox_id") == null) {
  localStorage.setItem("beardeer:last_inbox_id", "");
}

let settings = JSON.parse(localStorage.getItem("beardeer:settings"));

for (const i in settings_template) {
  if (!(i in settings)) {
    settings[i] = settings_template[i];
    localStorage.setItem("beardeer:settings", JSON.stringify(settings));
  }
}

for (const i in themes) {
  document.getElementById("mc-theme-buttons").innerHTML +=
    `<button onclick="setTheme('${i}');">${themes[i]}</button> `;
}

document.getElementById("mc-theme-name").innerText =
  themes[localStorage.getItem("beardeer:theme")];
document.getElementById("mc-upload-service").value = settings.upload_service;

function stgsTriggers() {
  if (settings.replace_text) {
    replace_text = true;
    document.getElementById("mc-button-replace").innerText =
      "(enabled) Replace text";
  } else {
    replace_text = false;
    document.getElementById("mc-button-replace").innerText =
      "(disabled) Replace text";
  }
  if (settings.enter_send) {
    enter_send = true;
    document.getElementById("mc-button-enter-send").innerText =
      "(enabled) Enter sends post";
  } else {
    enter_send = false;
    document.getElementById("mc-button-enter-send").innerText =
      "(disabled) Enter sends post";
  }
  if (settings.display_post_themes) {
    document.getElementById("mc-button-display-post-themes").innerText =
      "(enabled) Display post themes by default";
  } else {
    document.getElementById("mc-button-display-post-themes").innerText =
      "(disabled) Display post themes by default";
  }
  if (settings.uwu) {
    document.getElementById("mc-button-uwu").innerText = "(enabled) uwu";
  } else {
    document.getElementById("mc-button-uwu").innerText = "(disabled) uwu";
  }
  //if (settings.detect_file_type) {
  //detect_file_type = true;
  //document.getElementById("mc-button-detectft").innerText = "(enabled) Detect file types";
  //} else {
  //     detect_file_type = false;
  //     document.getElementById("mc-button-detectft").innerText = "(disabled) Detect file types";
  // };
  if (settings.presets) {
    presets = true;
    document.getElementById("ms-button-presets").innerText = "Back";
    document
      .querySelector("#ms-do-not-the-spamming")
      .toggleAttribute("hidden", false);
    document.querySelector("#ms-msg").toggleAttribute("hidden", true);
    document.querySelector("#ms-button-post").toggleAttribute("hidden", true);
    document.querySelector("#ms-presets").toggleAttribute("hidden", false);
  } else {
    presets = false;
    document.getElementById("ms-button-presets").innerText = "MK8 Presets";
    document
      .querySelector("#ms-do-not-the-spamming")
      .toggleAttribute("hidden", true);
    document.querySelector("#ms-msg").toggleAttribute("hidden", false);
    document.querySelector("#ms-button-post").toggleAttribute("hidden", false);
    document.querySelector("#ms-presets").toggleAttribute("hidden", true);
  }
}

function updateStg(setting) {
  if (setting == "replace_text") {
    settings.replace_text = !settings.replace_text;
  } else if (setting == "upload_key") {
    settings.upload_key = document.getElementById("mc-upload-key").value;
    document.getElementById("mc-upload-key").value = "";
  } else if (setting == "upload_service") {
    console.log(document.getElementById("mc-upload-service").value);
    settings.upload_service =
      document.getElementById("mc-upload-service").value;
    document.getElementById("mc-upload-service").value =
      settings.upload_service;
  } else if (setting == "detect_file_type") {
    settings.detect_file_type = !settings.detect_file_type;
  } else if (setting == "presets") {
    settings.presets = !settings.presets;
  } else if (setting == "enter_send") {
    settings.enter_send = !settings.enter_send;
  } else if (setting == "display_post_themes") {
    settings.display_post_themes = !settings.display_post_themes;
  } else if (setting == "uwu") {
    settings.uwu = !settings.uwu;
  }
  localStorage.setItem("beardeer:settings", JSON.stringify(settings));
  stgsTriggers();
}

stgsTriggers();

async function uploadFile(file) {
  // ORIGINAL CREDIT TO:
  // @legoshi on ChaosDeer
  // @sandstripes on GitHub
  // https://gist.github.com/sandstripes/7d342a06cc8325f272cd42d6442f6466
  // note: very much so modified since then, mainly because i need to use imgbb because cors sucks
  const data = new FormData();
  data.set("key", settings.upload_key);
  data.set("image", file);

  const init = {
    method: "POST",
    body: data,
  };
  const res = await fetch("https://api.imgbb.com/1/upload", init);
  const rsp = await res.json();
  if ("data" in rsp && "image" in rsp.data && "url" in rsp.data.image) {
    if (rsp.data.image.url.startsWith("https://i.ibb.co/")) {
      return rsp.data.image.url;
    } else {
      throw new Error(rsp);
    }
  } else {
    throw new Error(rsp);
  }
}

async function uploadFileFraud(file) {
  // Edited version of above
  const data = new FormData();
  data.set("file", file);

  const init = {
    method: "POST",
    headers: { Key: settings.upload_key },
    body: data,
  };
  const res = await fetch("https://u.fraudulent.loan/upload", init);
  const rsp = await res.json();
  if ("urls" in rsp && rsp.urls.length != 0) {
    return "https://u.fraudulent.loan/" + rsp.urls[0];
  } else {
    throw new Error(rsp);
  }
}

document.getElementById("mw-new").innerHTML = md.render(
  `*Version 1.7.2b - March 28th*

### Account deletion
Account deletion is available.

## Version 1.7.0b
### New themes
There are a few new themes!

### Edits and deletions in replies
Replies now reflect edits and deletions!

### Editing messages
Editing a message now automatically fills the content of the message.

### URLs updated
URLs have been updated to point to soktdeer.com!

### Markdown in bios
Markdown can now be entered in bios!

### And more!
I forgot`,
);

const prodUrl = "wss://chaos.goog-search.eu.org/";
const loclUrl = "ws://127.0.0.1:3636";

//
//   DO NOT FORGET TO CHANGE THE URL
//

let wsurl = prodUrl;

if (localStorage.getItem("beardeer:serverurl")) {
  wsurl = localStorage.getItem("beardeer:serverurl");
}

const ws = new WebSocket(wsurl);

let didGreet = false;

ws.onmessage = function (event) {
  let incoming = JSON.parse(event.data);
  if (settings.debug) {
    console.log(incoming);
  }

  if (incoming.command == "greet") {
    closePopup();
    document.getElementById("rl-version").innerText =
      `BearDeer (based on BossDeer ${version}) - ${incoming.version}`;
    document.getElementById("mc-version").innerText =
      `${version} - ${incoming.version}`;
    if (incoming.server_contributors) {
      for (const x in incoming.server_contributors) {
        document.getElementById("mc-contributors").innerText +=
          `\n${incoming.server_contributors[x]}`;
      }
    }
    if (incoming.version != serverVersion) {
      // displayError(
      //   `The server is on a newer version than this version of BossDeer was designed for. You may experience problems. (Expected "${serverVersion}", got "${incoming.version}")`,
      // );
    }
    ulist = Object.keys(incoming.ulist);
    raw_ulist = incoming.ulist;
    updateUlist();
    for (const x in incoming.messages) {
      posts[incoming.messages[x]._id] = incoming.messages[x];
    }
    posts_list = [...posts_list, ...incoming.messages];
    if (!didGreet) {
      if (
        localStorage.getItem("beardeer:username") == null ||
        localStorage.getItem("beardeer:token") == null
      ) {
        scene = "register-login";
        document.getElementById("loading").classList.toggle("hidden");
        document.getElementById("register-login").classList.toggle("hidden");
      } else {
        username = localStorage.getItem("beardeer:username").toLowerCase();
        last_cmd = "login_token";
        ws.send(
          JSON.stringify({
            command: "login_token",
            token: localStorage.getItem("beardeer:token"),
            client: `BearDeer ${version}`,
          }),
        );
      }
    }
    didGreet = true;
  } else if (incoming.command == "ulist") {
    ulist = Object.keys(incoming.ulist);
    raw_ulist = incoming.ulist;
    updateUlist();
  }
  if ("error" in incoming) {
    if (incoming.error) {
      if (incoming.code == "banned") {
        displayError(
          `Account is banned until ${new Date(incoming.banned_until * 1000).toLocaleString()} for "${incoming.ban_reason}"`,
        );
      } else {
        displayError(`We hit an error. ${incoming.context} (${incoming.code})`);
      }
    } else if (incoming.listener == "PingBossDeer") {
      last_ping = Date.now();
    } else if (last_cmd == "login_token" || last_cmd == "login_pswd") {
      if (scene == "register-login") {
        document.getElementById("register-login").classList.toggle("hidden");
      } else if (scene == "loading") {
        document.getElementById("loading").classList.toggle("hidden");
      }
      scene = "main-scene";
      if (
        [JSON.stringify([]), JSON.stringify(["PROTECTED"])].includes(
          JSON.stringify(incoming.user.permissions),
        )
      ) {
        document.getElementById("ms-button-mod").classList.add("hidden");
      } else {
        document.getElementById("ms-button-mod").classList.remove("hidden");
      }
      if (incoming.user.permissions.includes("DELETE")) {
        delete_all = true;
      }
      buddies = incoming.user.buddies;
      document.getElementById("main-scene").classList.toggle("hidden");
      document.getElementById("ms-name").innerText = `@${username}`;
      last_cmd = "get_inbox";
      authed = true;
      for (const i in posts_list.reverse()) {
        loadPost(posts_list[i], true, false);
      }
      posts_list = undefined;
      ws.send(JSON.stringify({ command: "get_inbox" }));
    }
  }
  commandHandler: if (
    "token" in incoming &&
    incoming.listener == "RegisterLoginPswdListener"
  ) {
    localStorage.setItem("beardeer:username", username);
    localStorage.setItem("beardeer:token", incoming.token);
    if (last_cmd == "register") {
      window.location.reload();
    }
    logged_in = true;
  } else if (incoming.command == "new_post") {
    if (incoming.origin == "livechat") {
      lcPosts[incoming.data._id] = incoming.data;
      if (lcPosts_list) {
        lcPosts_list.splice(0, 0, incoming.data);
      }
      if (authed || guest) {
        loadPost(incoming.data, false, false);
      }
      break commandHandler;
    }
    posts[incoming.data._id] = incoming.data;
    if (posts_list) {
      posts_list.splice(0, 0, incoming.data);
    }
    if (authed || guest) {
      loadPost(incoming.data, false, false);
    }
  } else if (incoming.command == "deleted_post") {
    removepost(incoming._id, incoming.deleted_by_author);
    if (incoming._id in posts) {
      delete posts[incoming._id];
    }
  } else if (incoming.command == "edited_post") {
    editedpost(incoming._id, incoming.content);
  } else if (last_cmd == "gen_invite" && "invite_code" in incoming) {
    document.getElementById("mm-invite-code").innerText =
      `Your invite code is "${incoming.invite_code}". Use it on any SoktDeer client to sign up!\nhttps://soktdeer.com/\n\nCodes: ${incoming.invite_codes}`;
  } else if (last_cmd == "get_inbox" && "inbox" in incoming) {
    document.getElementById("mi-posts").innerHTML = "";
    for (const i in incoming.inbox) {
      loadPost(incoming.inbox[i], true, true);
    }
    if (!incoming.inbox.length == 0) {
      if (
        localStorage.getItem("beardeer:last_inbox_id") != incoming.inbox[0]._id
      ) {
        document.getElementById("ms-button-inbox").innerText = "Inbox*";
        localStorage.setItem("beardeer:last_inbox_id", incoming.inbox[0]._id);
      } else {
        document.getElementById("ms-button-inbox").innerText = "Inbox";
      }
    }
  } else if (last_cmd == "populate_profile_settings" && "user" in incoming) {
    document.getElementById("mc-display-name").value =
      incoming.user.display_name;
    document.getElementById("mc-color").value = incoming.user.profile?.color;
    document.getElementById("mc-font").value =
      incoming.user.profile?.font ?? "";
    if (incoming.user.profile?.weight) {
      document.getElementById("mc-weight").value =
        incoming.user.profile?.weight;
    }
    document.getElementById("mc-avatar").value = incoming.user.avatar;
    document.getElementById("mc-banner").value = incoming.user.banner || "";
    document.getElementById("mc-css").value = incoming.user.profile?.css || "";
    document.getElementById("mc-bio").value = incoming.user.profile?.bio;
    document.getElementById("mc-lastfm").value = incoming.user.profile?.lastfm;
    document.getElementById("mc-background").value =
      incoming.user.profile?.background || "";
    document.getElementById("mc-border-top").value =
      incoming.user.profile["border-top"] || "";
    document.getElementById("mc-border-bottom").value =
      incoming.user.profile["border-bottom"] || "";
    document.getElementById("mc-border-left").value =
      incoming.user.profile["border-left"] || "";
    document.getElementById("mc-border-right").value =
      incoming.user.profile["border-right"] || "";
    document.getElementById("mc-shadow").value =
      incoming.user.profile["shadow"] || "";
    document.getElementById("mc-weight").value =
      incoming.user.profile["weight"] || "";
  } else if (last_cmd == "get_user" && "user" in incoming) {
    const idocument = /** @type {HTMLIFrameElement} */ (
      document.getElementById("ud-iframe")
    ).contentDocument;
    fetch(document.querySelector("#top-style").href)
      .then((response) => response.text())
      .then((style) => {
        idocument.getElementById("ud-main-style").innerHTML = style;
        requestAnimationFrame(() => {
          const btn = idocument.querySelector("button");
          btn.style.display = "inline-block";
          const styles = getComputedStyle(btn);
          document.querySelectorAll("#ud-row button").forEach((button) => {
            button.style.background = styles.background;
            button.style.color = styles.color;
            button.style.font = styles.font;
            button.style.fontSize = "";
            button.style.borderWidth = styles.borderWidth;
            button.style.borderStyle = styles.borderStyle;
            button.style.borderColor = styles.borderColor;
            button.style.borderImage = styles.borderImage;
            button.style.boxShadow = styles.boxShadow;
          });
          requestAnimationFrame(() => {
            idocument.querySelector("#button-padding").style.height =
              document.querySelector("#ud-row").clientHeight + 8 + "px";
            btn.style.display = "none";
          });
        });
      });
    var bio;
    idocument.getElementById("ud-d-tags").innerHTML = "";
    if (incoming.user.profile?.bio == "") {
      bio = "This user does not have a bio.";
    } else {
      bio = incoming.user.profile?.bio;
    }
    idocument.getElementById("ud-avatar").src = incoming.user.avatar;
    const displayName = idocument.getElementById("ud-display-name");
    displayName.innerText = incoming.user.display_name;
    if (
      blocked_theme_users[incoming.user.username] ??
      settings.display_post_themes
    ) {
      displayName.style.color = incoming.user.profile?.color ?? "";
      displayName.style.fontFamily = incoming.user.profile?.font || "";
      displayName.style.color = incoming.user.color || "";
      displayName.style.textShadow = incoming.user.profile?.shadow || "";
      displayName.style.fontWeight = incoming.user.profile?.weight || "";
    }
    idocument.getElementById("ud-username").innerText =
      "@" + incoming.user.username;
    const banner = idocument.getElementById("ud-banner");
    banner.style.backgroundImage =
      incoming.user.banner ? `url('${incoming.user.banner}')` : "";
    banner.classList.toggle("has-banner", !!incoming.user.banner);
    idocument.querySelector("#ud-style").innerHTML =
      incoming.user.profile?.css || "";
    idocument.querySelector("#ud-style").dataset.css =
      incoming.user.profile?.css || "";
    if (incoming.user.username in timeZones) {
      const formatter = new Intl.DateTimeFormat([], {
        timeZone: timeZones[incoming.user.username],
        dateStyle: "short",
        timeStyle: "medium",
      });
      const updateTimeZone = () => {
        idocument.getElementById("ud-tz").innerText = formatter.format(
          new Date(),
        );
      };
      clearInterval(timeUpdate);
      updateTimeZone();
      timeUpdate = setInterval(updateTimeZone, 500);
    } else {
      idocument.getElementById("ud-tz").innerText = "Unknown";
    }
    idocument.getElementById("ud-created").innerText = new Date(
      incoming.user.created * 1000,
    ).toLocaleString();
    idocument.getElementById("ud-permissions").innerText =
      `Permissions: ${incoming.user.permissions.toString().toLowerCase().replaceAll(",", ", ")}`;
    idocument.getElementById("ud-special").innerHTML = "";
    if (incoming.user.bot) {
      idocument.getElementById("ud-d-tags").innerHTML +=
        ' <span title="This user is a robot." class="inline-icon material-symbols-outlined">smart_toy</span>';
    }
    if (incoming.user.banned_until > new Date().getTime() / 1000) {
      idocument.getElementById("ud-banned-span").innerText =
        `Banned until ${new Date(incoming.user.banned_until * 1000).toLocaleString()}`;
      idocument.getElementById("ud-banned").classList.remove("hidden");
    } else {
      idocument.getElementById("ud-banned").classList.add("hidden");
    }
    idocument.getElementById("ud-bio").innerHTML = md.render(bio);
    if (incoming.user.profile?.lastfm) {
      idocument.getElementById("ud-lastfm-container").classList.add("hidden");
      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          var lfm = JSON.parse(xhttp.responseText);
          if (settings.debug) {
            console.log(lfm);
          }
          if ((!"track") in lfm) {
            idocument
              .getElementById("ud-lastfm-container")
              .classList.add("hidden");
          } else if (lfm.track["@attr"] && lfm.track["@attr"].nowplaying) {
            idocument
              .getElementById("ud-lastfm-container")
              .classList.remove("hidden");
            idocument.getElementById("ud-lastfm-cover").src =
              lfm.track.image[lfm.track.image.length - 1]["#text"];
            idocument.getElementById("ud-lastfm-name").innerText =
              lfm.track.name;
            idocument.getElementById("ud-lastfm-album").innerText =
              `on "${lfm.track.album["#text"]}"`;
            idocument.getElementById("ud-lastfm-artist").innerText =
              `by "${lfm.track.artist["#text"]}"`;
          } else {
            idocument
              .getElementById("ud-lastfm-container")
              .classList.add("hidden");
          }
        }
      };
      xhttp.open(
        "GET",
        `https://lastfm.kije.workers.dev/${incoming.user.profile?.lastfm}`,
        true,
      );
      xhttp.send();
    } else {
      idocument.getElementById("ud-lastfm-container").classList.add("hidden");
    }
    document.querySelector("#user-display").dataset.username =
      incoming.user.username;
    switchScene("user-display");
  } else if (last_cmd == "get_ips" && "ips" in incoming) {
    document.getElementById("mm-ips").innerText = incoming.ips
      .toString()
      .replaceAll(",", "\n");
  } else if (
    incoming["listener"] == "daAccountBossDeer" &&
    incoming.error == false
  ) {
    logOut();
  } else if (
    incoming["listener"] == "pwAccountBossDeer" &&
    incoming.error == false
  ) {
    logOut();
  }
};

ws.onclose = function (event) {
  closePopup();
  switchScene("connection-lost");
};

ws.onerror = function (event) {
  closePopup();
  switchScene("connection-lost");
};

const clientIcon = (c) =>
  c === null ? " 🤖"
  : c.startsWith("BossDeer ") ? " 🦌"
  : c.startsWith("BearDeer") ? " 🐻"
  : c.startsWith("BetterDeer ") ? " ✨"
  : c.startsWith("PresetDeer ") ? " 🧩"
  : c.startsWith("Kansas") ? " 🇺🇸"
  : c.startsWith("whitetail") ? "🦨"
  : c.startsWith("CiaoTk") ? "⚽"
  : c.startsWith("neuoClient") ? "🔵"
  : c === "Unknown" ? "❓"
  : "🤖";

function updateUlist() {
  var ulstring = "";
  for (const i in ulist) {
    var ba = "";
    if (raw_ulist[ulist[i]]["bot"]) {
      ba += `<span class="client-icon"> <span title="This user is a robot." class="inline-icon-u material-symbols-outlined">smart_toy</span></span>`;
    }
    ulstring += `<span class="clickable" title="${hescape(raw_ulist[ulist[i]]["client"])}" onclick="showUser('${hescape(ulist[i])}');">${hescape(ulist[i])}${ba || '<span class="client-icon"> ' + clientIcon(raw_ulist[ulist[i]].client) + "</span>"}</span>`; //vulnerable!
    if (i != ulist.length - 1) {
      ulstring += ", ";
    }
  }
  if (!ulist.includes(username) && ulist.length != 0 && guest == false) {
    document.getElementById("ms-ulist").innerHTML =
      `${ulist.length} user online (${ulstring})❓ (Try <a href='javascript:window.location.reload();'>refreshing the page</a>?)`;
    document.getElementById("ml-ulist").innerHTML =
      `${ulist.length} user online (${ulstring})❓ (Try <a href='javascript:window.location.reload();'>refreshing the page</a>?)`;
  } else if (ulist.length == 1 && guest == false) {
    document.getElementById("ms-ulist").innerHTML =
      "You are the only user online. 😥🦌<br>Are you lonely? Here's a frog! <a href='https://commons.wikimedia.org/wiki/File:Golden-eyed_tree_frog_(Agalychnis_annae).jpg' target='_blank'><img src='https://upload.wikimedia.org/wikipedia/commons/c/c6/Golden-eyed_tree_frog_%28Agalychnis_annae%29.jpg' style='vertical-align: top' height='200'></a>";
    document.getElementById("ml-ulist").innerHTML =
      "You are the only user online. 😥🦌<br>Are you lonely? Here's a frog! <a href='https://commons.wikimedia.org/wiki/File:Golden-eyed_tree_frog_(Agalychnis_annae).jpg' target='_blank'><img src='https://upload.wikimedia.org/wikipedia/commons/c/c6/Golden-eyed_tree_frog_%28Agalychnis_annae%29.jpg' style='vertical-align: top' height='200'></a>";
  } else if (ulist.length == 1) {
    document.getElementById("ms-ulist").innerHTML =
      `${ulist.length} user online (${ulstring})`;
    document.getElementById("ml-ulist").innerHTML =
      `${ulist.length} user online (${ulstring})`;
  } else if (ulist.length == 0) {
    if (guest) {
      document.getElementById("ms-ulist").innerHTML = "Nobody is online. 😥🦌";
      document.getElementById("ml-ulist").innerHTML = "Nobody is online. 😥🦌";
    } else {
      document.getElementById("ms-ulist").innerHTML =
        "Nobody is online. 😥❓ (Try <a href='javascript:window.location.reload();'>refreshing the page</a>?)";
      document.getElementById("ml-ulist").innerHTML =
        "Nobody is online. 😥❓ (Try <a href='javascript:window.location.reload();'>refreshing the page</a>?)";
    }
  } else {
    document.getElementById("ms-ulist").innerHTML =
      `${ulist.length} users online (${ulstring})`;
    document.getElementById("ml-ulist").innerHTML =
      `${ulist.length} users online (${ulstring})`;
  }
}

function switchScene(newScene, isguest) {
  if (newScene == "main-inbox") {
    last_cmd = "get_inbox";
    ws.send(JSON.stringify({ command: "get_inbox" }));
  }
  if (scene == "user-display") {
    document
      .getElementById("ud-iframe")
      .contentDocument.querySelector("#ud-avatar").src = "assets/default.png";
  }
  if (newScene == "main-scene" && isguest == true) {
    for (const i in posts_list) {
      loadPost(posts_list[i], true, false);
    }
    document.getElementById("ms-hide-guest-nav").classList.toggle("hidden");
    document.getElementById("ms-show-guest-nav").classList.toggle("hidden");
    document.getElementById("ms-name").innerText = "Guest";
    document.getElementById("ms-name").disabled = true;
    document.getElementById("ms-make-post").classList.toggle("hidden");
  }
  document.getElementById(scene).classList.toggle("hidden");
  document.getElementById(newScene).classList.toggle("hidden");
  scene = newScene;
  document.getElementById("ms-userbox").classList.add("hidden");
  document.getElementById("rl-username-s").value = "";
  document.getElementById("rl-username").value = "";
  document.getElementById("rl-password-s").value = "";
  document.getElementById("rl-password").value = "";
  document.getElementById("rl-invitecode").value = "";
}

function rltab(tab) {
  document.getElementById("rl-username-s").value = "";
  document.getElementById("rl-username").value = "";
  document.getElementById("rl-password-s").value = "";
  document.getElementById("rl-password").value = "";
  document.getElementById("rl-invitecode").value = "";
  if (tab == "login") {
    document.getElementById("rl-signup-container").classList.add("hidden");
    document.getElementById("rl-login-container").classList.remove("hidden");
    document.getElementById("rl-t-login").disabled = true;
    document.getElementById("rl-t-signup").disabled = false;
  } else if (tab == "signup") {
    document.getElementById("rl-signup-container").classList.remove("hidden");
    document.getElementById("rl-login-container").classList.add("hidden");
    document.getElementById("rl-t-login").disabled = false;
    document.getElementById("rl-t-signup").disabled = true;
  }
}

function userBox() {
  document.getElementById("ms-userbox").classList.toggle("hidden");
}

rltab("login");

function register() {
  last_cmd = "register";
  username = document.getElementById("rl-username-s").value.toLowerCase();
  ws.send(
    JSON.stringify({
      command: "register",
      username,
      password: document.getElementById("rl-password-s").value,
      invite_code: document.getElementById("rl-invitecode").value,
      listener: "RegisterLoginPswdListener",
    }),
  );
}

function logIn() {
  last_cmd = "login_pswd";
  username = document.getElementById("rl-username").value.toLowerCase();
  ws.send(
    JSON.stringify({
      command: "login_pswd",
      username: username,
      password: document.getElementById("rl-password").value,
      client: `BearDeer ${version}`,
      listener: "RegisterLoginPswdListener",
    }),
  );
}

function logOut() {
  localStorage.removeItem("beardeer:username");
  localStorage.removeItem("beardeer:token");
  window.location.reload();
}

const emoji = {
  yuhhuh:
    "data:image/webp;base64,UklGRhoDAABXRUJQVlA4TA0DAAAvFwAFEM8GKZIkR5JH9Sr+mJbOfvf0FQ3YkSQ5qqq60cpn3OQfAzRP7kKKJMmR5FG9ij+mpbPfPX0FObJt1cra975ruLtE4KEQAAGSBwH80Z/h7i7PTgAgEAgEDgQRKsjgIIHAgyCAAw+CAAkyBKjAg0AwDYUqGAGZHBXTOPhsUJqkRQhwsGNPzvoMSxORQUUO8nRcraU0nUD1dDazp9oyzO3c8V2vu4zLDdzu/zKrWa0tR13NomEJ6v9+/zz8P06PCdN06Y3KdGoRS4BlgUoksh07elYH+C/V4r80Fv1RgGCKNTJKwB90FCFkwD+lDEGGoa7FDFFnRo/Z2izGSNMB6ijWUGTACkwOE9cdlCDO6ryUJkrVLAZiMlbSLMcyEQRRYhzIzuooQnCWBwIaCvu/57f97bm2XyMjI0NARJhQZBAZgrM6ZAgmAzEdTg+bZTpWkiAjQ5AxHQTToUQGkXHWB0GEICMzEhFBEEQEAT25CDBoTWH/lx3bP8/Prff7/dWr9f/+H74ur/K+vY8+r593n+/P7517DAmybZu2sx6/bdu2bdu2Ytv+L7Zt29bJesmN1Z6nLkT0fwJgpEvj2hx7mKpQAv5X+LjVyRgPCyAmErCaRV5LNEKdFQBZdYUcslKJokNlyGlDokwx0qaGrFhL7v1ryOtkblzZlgN5QJUgRY2lTF/I9VvvPoovf2BWT5K3Ztam+pgD+Pnp8M2Lt5ks89zOZ6c373vDN6fq3OG2moISpSJ59svTzdOXe468Jt+3OKRferF1YkjDBW6DD8fekZc2rhDk+kA7v1/f3pK8u7L74B4a3h0OZO6n7svRaxnr7n7UdycCkE0Kkg+Ozr+36sKKnjlLNCSfxAOyTpJ8/D/t6mKSTx89J8kuAIUSSQ44V+Yv2nHlq5aCH9gHyBLe6Rz3tp57//i64fGpGcOH3hQACLtPaj+/SlI3vCEpSZLE1ykAPH5/X/pj2fJ/sqCms4J6n0fDaMfyhb3ztp05f27XjVDjYBO76diJnZrp2+22JkDu6htV0r9mdjAAAA==",
  nuhhuh:
    "data:image/webp;base64,UklGRkADAABXRUJQVlA4TDMDAAAvFwAFEPcGK5Ik20pWn3sv769rgsC/MAQQrA1IkSQ5kjyqV32Xgb7jcfzJ3Fs15EiSFEkRmb28KwYc6y/NyXBPvoJa27ZqZ51z7v3M/0tUP0wuNi1RE/GpisExWma4EAAICAgYCCiUwUMFDAQEHCgIKCg4MChAHQwqoCDgoA41cFDAADlk8VhpxCaUN23ERiWVGTwWyxjdiq+MN+suePJ9TcZyavXh7P/D6+D2//o8fazTx/nZ/K9INZ/9fwYR/s4ezv6Tw8br8fi5SXHVKk4YVG6zfSyKq4PKp+3LJgWmcrB7m80sKPTK1+S/rIFt8oVlBNKyhIgfyLFcAWPms9qIiG/GkoIgYROSh9va9DGvhsILplQ4/e7+/f5/vp8vbZy3seOfVUo2DdGV4OHVWmlklWtt8oogSyoklCDXLCCviOCaDRWuKddsQukSNCSsUCGyVSq0Q0nktraUrHLM7TUdEQLX2lJDlcgqgshaRAQMJbMo2SxKCq42lGhISKhQoQCJIIIIhug0RJASJCKIIBrg4357X//9/vDf75do/j5eL/v/76+ugVRmViY/n29bz9N99+u6uWhvVp/n6w4kbNt2/umA7tm2bdu27fq33HIt27Yx5jF7ueb3/mXXl/kzov8TADW17bwC02VblnpDTZPg3ZcuHzt44G69KWCpD/j6yFkVrpqxbG9Hd9exAT/oRLhCKz9XG8D3kg5BhS+DYLE+BFqyKl1At3SMpCRJEsdi4HQ22z2g/X8SYLT8QdeuefPbFs++MJ4Kj1tn+kanP/6BcUHKykNXRwWFmGAr/r3vHO69zWit+JvtJF89e0tSNJmv4ZvJKSFlaq29v/H65tYlq/eTfBIe90ic2dZ2QMw1qOyL3To4ToXDP53Dtg/1v5PYW9187gSVn/wF/L1C+ckNDxdNkjf2bRLkjh+A1kJB8vXTOaMXa472zTz9gpxusAa0ZCR5J7nsCEfO7zz8gRM9tY4AkCeRFEVmFYLkvRV1WZ6GkI+cIsnjDsWCFOUmulpQ7P9Y7nloDslTCVDRZd2Xb18/ff6dIVE06qqilwiFC8jBKGjQ7RpHZtlqwr5lT5oNlAMA",
  me: "data:image/webp;base64,UklGRmQEAABXRUJQVlA4TFcEAAAvF8AFAE2oaduAxeq1G9H/IHty6IJM2qbX/Ase0UE0gvED2H9EUXKSICBJ/L85ov/RAbwK2JriIUmybdO21sbBtZ5tG6VvduP38Mcrfdus2ffZOLx3c3VDYiRJiiRFVnXPHKOqZy8A84vKPNtVKTeSJEeSMrKqZ3aXfP0lwYB6cRD1sz2VEbcffjsOCCvQ0brlhHbclgMciHDKHCxFZWLWqXtn19Wfr9zPD5XjVTvfme3fl3n7Ctdiqkzj6/DWcgAwAhBiE4wAFNPaQWvbVL2HNvc+/k0Wh8vRn0fF2hmPw5lKTcammINn+23qBjWliI0qRH/DjzOxNSBxAzUFZnSOQqVF2Ycpvm8I5BjXQsUiR84YZIFLqt4494ZEUkv1lUmIpFhjiI/yJIpVxqZ7XfVPMLPXvK1+XPl8sNb5UDyHrx65grvtusttUuLALQeDeBrPPHfNh9/Ls+vVr4LP7kPz194tR91pZn8UC+Wctt6dXIJhLYYBIwKprkc0GemDS4fcXkxquUsy0W2rOQtRVAi5TudwkHXcyBYBIMQCTJuBeQ3G/3IBmWBupvcx7R5phhkphFwRtJdX4kQA/PdmPP5IKLIWoQ1Soi0ntk90tbkLyjerAI20bQdUpzcblqrLfVulWZLT0CSRAE91uYIBs7QwYbR2j9FUU0VhF7f2FVb1jJwuUXKrq6nZmcWxFJVI3UyVK2HPITIroZy266V9qMjazp5GRA3XO5nL0gVyzn0c89397s/hO86mw/J83yWZYKbiyGglS81CJ1Rut0+XD3TA7NV55Xq8U/rk3Zg3f0efknue6pQbPo8pamQkWBfz6Ki4Wy2l020bwe8V/Jb39FG++TJzLvfkatpnv85H9wtGpjJWZ2tFzYJUoxUR4la2sOVNPDd8esQ7J3z20+Ndf/urerbOHSmlusgw+/KeS+0c7oecVDJEi7hBwrArBv4/ajknaLel9up9/2Xq85fcBeXvdZ2GMY2c9hKaU+RklU787rsljRYQ1kYPmCFeI3qauHOq7oPFwzePnjn1uYU8W/uXvXsOLvFiKymYluWfc1oDSCthZd5gWIQWfpukOvfYTcXGQyxKSeuXs3nLVt0DX8Z2itFVC9B2nne0ZsJdyLpkNpokp1bqHa305DQ1OC2FlBqp7+d1JMrfbHiXg7yJ0127TqhHpYrMZQaafebSY7XW8BZQSlGSChJ1GDkOzqrypSyCrayOxigMspORPXGVtTmBWEnMYWooD4mtjLZkmtCUVcgYgUVbpNnA9JxopHAdQMURa6GKpjLiJ24PlwBAo6ajkVQZkJCUUuyuYNuZW7h0F5nLcflAhRHMI+JIpH3WkMZlrFqCQkIxkLaaRoFinDXpufYlFGgbsrGiI05j4mRrR9nPVBNna9AiigIlKY8CRAJH4Kn38/pxpUAwm6YRDmr5FTXaeKs8UpfYeXx4Ya9xQQINFsWOAWnHaEvz+hy7jzuaDjPpYJXEAA==",
  keeneThumbsUp:
    "data:image/png;base64,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",
  goobert:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAYCAYAAAARfGZ1AAADJUlEQVRIx7WVS2gTURSGv5lJJpOkTaahRtukjdUKKo1VFPGBrU+KiGYlLlwIBUFEBJciFC0IrlQUdSMBFyIiKhWK1Kr4QCqKIJa22oda7cNG21pK01eScWESJ8mkVsULw9w55z/fnXvmnjMC8eEPBgKA1Fxdd4t/GP5gYCtwEjALOuMDYD1Q1lxd1/kXUAG4CBxI2ESd/xtgAS7/BdgO1OvBwIge7o7fK/3BwJE/AM8BGoHtaa4uMUvMSX8wsHoW4GXAE2Ctgbs1G9wK3PAHA64ZwOXxN16cRfLJlC3YXjanmKh20x8MDAI74+bPQDfwHagA8mfY2Es9fDoxMTksOFcVMPllbONY2zd9wML4BUDeJh/h9iEme0eN4IP6tAwlJjnlbhAETKol62spPifW+SquLSVYvLlGknE9vA9AcshYF+QBIFnNyPPsP+e5MvP2lpG/oxTRImFd+FMjSAJ5G4oRlZQMTwGvTVVaTUlkZKI83DF8KDIygey2I4jJ2sK2yMV0KIxrawmiLCG77eRV+pDs5qRGVEyoG4oYavyQML1orq6LmICgyalsdKwqMNy+pSAHtaIYs6r8snly0WJaapq8DubuWcro6wEEUWhKr1DDIdllrCVqhl2/u6TWZkZd58W5xrMvAe9OF02Gxvj68P2sy3+0NUToXko7cldpNctF4FG6ODYZYWowPGu4ZJeR823p5sUmoCOjPIuceIqcs4bbfCo2X0bqVohAMf9nLBWBS/9CGO8ZAc3QFRGBHCOPFo3Rd7OFaDjZFQg1dtJz7U3yOTo+zRPfOcY+DBshHojAQWA886wJdJ5+xlDTp1/N4ulH+uva0KIxtEiM/jtvydnixepxpEcPA1ekrhOPX5Uer5SBylS2gFKYS+uxRtSVHvput9B9volw0wBWfz6915vpOvaQldf3oBRm9JazDULt3URDOAPsBpakHNZtpUQnIrQcbcCsKqy5X83UYJhXu65SWruZineHUQoywPXAcYBkmVVpNS4gCAR+9xG1mGZUob3AKeBCg1CrpcB1iywD9sd/XXMBb5Y12oF+4DlQ3yDUPk0X/ACAdeImFWeVsQAAAABJRU5ErkJggg==",
  theProfilePictureThatNoodlesUsedOnTheTwentyFirstOfMarchTwentyTwentyFive:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFR0lEQVRIxz2W2W4dxxGGv6rpORt56CNRJC1SlhxHEWQgughyFyBXeau8QN4hD5QFsBM4CIzIgSTGjqjF3A8PZ6a7qyoXw7iBvq3+q+pfWn7/hz+Gh6INmAUiiZRaVMDNCCC1LW4OAhKGlUItG3zoiQgIwyIAQbXBPYhwPJyUcw8RRECTWpp2gpthGAQ02kA4VntUBauFsIoQqDZUK4go4RV3w8wwqwSBWyURjmpDIADkvGaS5ogaSgteKX2PBHiuiAQSTq2GeUUliDvEqoqHE2G4OeFOijBKqQgN7WSC10wNUA3CBgCkERTFomI1Y3UgAnIeeHfyA4eHR5g7AUQIIY6IgwapDBlVATG8QhJoJPCh5+uv/srBw0MePXpCAGYDZegIr6w3G/7xzd84eriPcEC4A0J4kGuBqIQHSd1QFACzjvCCNxMs93x894qX337Fs+cv2N3dZ3u5zfXlOR8/vuPk7festqbs7X1JNcc9gMDcwA2IcUS59IgICtQykFIiLKg1s7Ozw/v3J3zz978QAaKJRgMi2F0u+HTvCK9O7jtEFat+Vzhwr0QEKfe3aKMQICKIJlSFplHu3b/PfJ7oup6txQLLmUaVRhv2dhbM5jNO3p4w316yXG6j2kAI7o6FE15J/18OCIIRBDUMEbg4P2c6nTGbzti9d4/Ls1MaVWwYePvxlAElJkvefP+G/f0Djo4ek5p2pGs4EkbKeUAIUkooYDWDG2XoGMrAcnvJr3/5lIvzazaXZ+zu7tHf3nB+cU4bha3VCprEer3m9PSMvb1daq24VZAglZJJjVCGgoqOmggjDx0TDdJUef6zI86Xc7y/4vXbMx7v32M5VdJkwrNnX/Dh4oqv//wnLpuGra0FKopHBYIUtWAuo+QBrxVU8DrwYHfJQhtuu4Fnjx/z5tUxTx7u8uIXPycJzHaWHD75nJPLzOvvvqPvOzbdLbPpglIrYZnkbkSMKlZVhlpIKYG0PNg/5PDBNtuzOY02/O63v2E2nbLpbulzZrVasT1TPv90xc72nH6zpu862ibhNlpNijsfUlXcnZ+OBNWVi/WG2x9P2WwvePToiK5k1l3P1mKOqOJuaFNRgloytVTMKhagAilUCNfRW8pA27aoKmGVda7cboz/vPyW5198xgD0ZSA1Ddoq85hTcqaS6bqeWjNdt2G+mI01aEjhipvhlgGICPq+x6sRAsvljM+ePmVTbnn97gPb8ylbsynVnG4YqO4MtdJ1GyaTltKvKXnJbDpFqKQI8AgMUKCUgpkxji64vMzcX02QNkYnlZEQN7e3NE1iYs75xRWb2xtWO5/w9sMpuyKYg4iTShnGwCgFU8FyJSQgxm5ydi6lcnBvwTQJs3lLK83YQd9TauX4v2959PCAk/en7O7tIyJYOISRrOQxXHwsKipYtTGRzKnu5AuDMFbLGebOYtKSayXnDAj//NcrZospO6sVkraIELwMRDiplEKEExGYGe5jcIiMo3MzzIOzy47qzlqdtlFmk8SkbchDwcJxg5ubG+Y7E/RuvBE+6mCMOkdEQASRO8Myx8yoZgx9YbmdaKctN+s1b47PONh/gFWn6wqXZ1e00zlplklt4O6IKGpef+K/u+NmlFLubh4ztlZqKayvrlntbHGw+wkewvHxCdfXazbrNR5BqWUEVscHcs6kcH5COyKvgFJrHXNCdbRxgaurK84urjj54QREWK2WnH38EYFxqe6UXGgWU6w6Vp10u7keRXGXpXGHQERwDHz8zpgN9N3Ay38f8/79R3714ktqzvT9MFJXwMUYco+oEoC78T9Eot2w1W2OkwAAAABJRU5ErkJggg==",
  true: "data:text/image;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAYCAYAAAAcYhYyAAAEKElEQVQ4y52US28TVxiGnznnzMUez0wcx3YuTkJJUqCqilAWvWwqyqJbflJ/B9v+g7JErEjUsAFV0JRagVIUEpqQi8exx57L+boIlSq1m/bdfZtHj169+pxeHJx0I5/1pZBuQ6HcOrXWAq6rePX2gNLRvDs64+tb11lY6vHzqzfc/PQ63969S721jtb1kbPSjKTuGpqRoSotpXJphAEzNU02HeJ7PoilPZvguR6TLKPeCFlc6VGvxSx/vDk0FZo0r1BTl8/Xemz3Dzgdjzj2DDeWPRoNhWs8fFVhzIRGI8DVJb04ptQ5Ro0xlbUgQjYtWem2uDYf8+LdKacXExq+T9OtqPkejUaIqxWhF3Clt4GJI/YO+pQVGBEBsYyyKS/23/PFWodvbq6DA1FS4/zoiCSOac+3qQqLLYVgZo4fn+8yKsfk8RgFYEWobMWv+4cMpiXKq7PcW8RTMJM06HZnSZIE5QXg+Ry+P+Wn568pMpdes3VpIiJYEebjOifvT9nafc3tzRusd2PsZEplhcNBzvc/bHO1nbC22mMMRM0OYRRhrLWICI4IzTDgo6UOmdK8ebPPnLeAx5Q0HfLH+QmdpMbqwhxx4LC+soQxPiKCDlzznYgAsBB5NI3lWq+DcYTB+Tmd1izj9BwlORuLswROgXY9nEaTysLYmlyJWEQue0mzkkEuHB6fYrQC65KPC4oMFpaW8HyXWpwgyiWo1anKCWVZYESADyZvhxM+0T5eGBE2fLoLEcev3vLZl7dYutohG6WYIOL33/b5ZXcPHMXagkI5XMYYjVWazAqlaPLKwTqKqNvFak1WggpmyEYTctF4vs9RmqM8H3OJEKy1+MqhGYc0O7PYquJilON7LqdnQ0xgaIQGJUI6GLN/POQih8ryFwQcHJZaDZxiiqsUcRKR5wVGK6LIx3MVNT9kMp6SD1PmPAg1hEHtw2IBBQRiqRuDU1oCY0hCH20cXGPQypCNMk6OjmmGipsm4Ox0QG16jgFBBJRWKK3IxmMu0iEzSQPPCBbFpBQu0pzJ4IxpNsLzDPXAJ3UsLoL56vYdALR2uNKKuNqOUWLJxGUytoitmOYFnnGxTsTY0YRoqCymuUIQJTj9fl8uOwFXK3yjcRwQK1RisVZQysEohQhU1qKcy1WICH4QDB35q5T/n6F59uwZaZri+z6rq6u02+3/TFHNZpOdnR2SJOHw8JCtrS22t7d5+fIlRVHQ7/fJsowHDx7w+PFj/k1cLS4u0mq1WF5e5vj4mDRNmZ+fZ29vj7Is2d3d5eHDhxRFwZMnTzg4OPgHxPz9cByHzc1NtNbkeU5RFGRZRlmWDAYDNjY20FozGo0QEZRSlGV5+dniOEYpRa1WQ2tNvV7n7OyMe/fuEQQBd+7cIc9z+v0+VVWxs7PDo0ePePr0Kffv3+dPYdjuR5z1840AAAAASUVORK5CYII=",
  whar: "data:image/png;base64,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",
  wink: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFR0lEQVRIxz2W2W4dxxGGv6rpORt56CNRJC1SlhxHEWQgughyFyBXeau8QN4hD5QFsBM4CIzIgSTGjqjF3A8PZ6a7qyoXw7iBvq3+q+pfWn7/hz+Gh6INmAUiiZRaVMDNCCC1LW4OAhKGlUItG3zoiQgIwyIAQbXBPYhwPJyUcw8RRECTWpp2gpthGAQ02kA4VntUBauFsIoQqDZUK4go4RV3w8wwqwSBWyURjmpDIADkvGaS5ogaSgteKX2PBHiuiAQSTq2GeUUliDvEqoqHE2G4OeFOijBKqQgN7WSC10wNUA3CBgCkERTFomI1Y3UgAnIeeHfyA4eHR5g7AUQIIY6IgwapDBlVATG8QhJoJPCh5+uv/srBw0MePXpCAGYDZegIr6w3G/7xzd84eriPcEC4A0J4kGuBqIQHSd1QFACzjvCCNxMs93x894qX337Fs+cv2N3dZ3u5zfXlOR8/vuPk7festqbs7X1JNcc9gMDcwA2IcUS59IgICtQykFIiLKg1s7Ozw/v3J3zz978QAaKJRgMi2F0u+HTvCK9O7jtEFat+Vzhwr0QEKfe3aKMQICKIJlSFplHu3b/PfJ7oup6txQLLmUaVRhv2dhbM5jNO3p4w316yXG6j2kAI7o6FE15J/18OCIIRBDUMEbg4P2c6nTGbzti9d4/Ls1MaVWwYePvxlAElJkvefP+G/f0Djo4ek5p2pGs4EkbKeUAIUkooYDWDG2XoGMrAcnvJr3/5lIvzazaXZ+zu7tHf3nB+cU4bha3VCprEer3m9PSMvb1daq24VZAglZJJjVCGgoqOmggjDx0TDdJUef6zI86Xc7y/4vXbMx7v32M5VdJkwrNnX/Dh4oqv//wnLpuGra0FKopHBYIUtWAuo+QBrxVU8DrwYHfJQhtuu4Fnjx/z5tUxTx7u8uIXPycJzHaWHD75nJPLzOvvvqPvOzbdLbPpglIrYZnkbkSMKlZVhlpIKYG0PNg/5PDBNtuzOY02/O63v2E2nbLpbulzZrVasT1TPv90xc72nH6zpu862ibhNlpNijsfUlXcnZ+OBNWVi/WG2x9P2WwvePToiK5k1l3P1mKOqOJuaFNRgloytVTMKhagAilUCNfRW8pA27aoKmGVda7cboz/vPyW5198xgD0ZSA1Ddoq85hTcqaS6bqeWjNdt2G+mI01aEjhipvhlgGICPq+x6sRAsvljM+ePmVTbnn97gPb8ylbsynVnG4YqO4MtdJ1GyaTltKvKXnJbDpFqKQI8AgMUKCUgpkxji64vMzcX02QNkYnlZEQN7e3NE1iYs75xRWb2xtWO5/w9sMpuyKYg4iTShnGwCgFU8FyJSQgxm5ydi6lcnBvwTQJs3lLK83YQd9TauX4v2959PCAk/en7O7tIyJYOISRrOQxXHwsKipYtTGRzKnu5AuDMFbLGebOYtKSayXnDAj//NcrZospO6sVkraIELwMRDiplEKEExGYGe5jcIiMo3MzzIOzy47qzlqdtlFmk8SkbchDwcJxg5ubG+Y7E/RuvBE+6mCMOkdEQASRO8Myx8yoZgx9YbmdaKctN+s1b47PONh/gFWn6wqXZ1e00zlplklt4O6IKGpef+K/u+NmlFLubh4ztlZqKayvrlntbHGw+wkewvHxCdfXazbrNR5BqWUEVscHcs6kcH5COyKvgFJrHXNCdbRxgaurK84urjj54QREWK2WnH38EYFxqe6UXGgWU6w6Vp10u7keRXGXpXGHQERwDHz8zpgN9N3Ay38f8/79R3714ktqzvT9MFJXwMUYco+oEoC78T9Eot2w1W2OkwAAAABJRU5ErkJggg==",
};
const emojify = (s) => {
  return s.replace(/:([a-zA-Z]+):/gi, (s, name) =>
    name in emoji ?
      `<img src=${emoji[name]} style="vertical-align: middle;" />`
    : `:${name}:`,
  );
};

function replyElement(replies) {
  if (!replies || replies.length === 0) return "";
  const el = document.createElement("div");
  for (const i in replies) {
    let reply_loaded = `→ ${hescape(replies[i].author.display_name)} (@${hescape(replies[i].author.username)}): `;
    let replyContent = document.createElement("span");
    replyContent.innerHTML = reply_loaded;
    replyContent.classList.add("reply");
    replyContent.classList.add("clickable");
    replyContent.setAttribute(
      "onclick",
      `document.getElementById("${replies[i]._id}").scrollIntoView({ behavior: "smooth" });`,
    );
    const replyText = document.createElement("span");
    replyText.innerHTML = emojify(md.renderInline(replies[i].content));
    replyText.dataset.reply = replies[i]._id;
    replyContent.appendChild(replyText);
    el.appendChild(replyContent);
  }
  return el;
}

function loadPost(resf, isFetch, isInbox) {
  if (resf.author?.username === "bridge") {
    const match = resf.content.match(/(\w+?): (.+)/);
    if (match) {
      return loadPost({
        ...resf,
        author: {
          username: "bridge",
          display_name: match[1],
          avatar: "https://avatars.githubusercontent.com/u/77336943?s=200&v=4",
        },
        content: match[2],
      });
    }
  }
  if (settings.debug) {
    console.log("Loading post " + resf._id);
  }

  const reactionMatch = resf.content.match(
    /^Reaction: (\p{Emoji_Presentation})$/u,
  );
  if (reactionMatch && resf.replies.length === 1) {
    const emoji = reactionMatch[1];
    const reactions = document.querySelector(
      `[id="${resf.replies[0]._id}"] .reactions`,
    );
    if (!reactions) return;
    let reactionEl = reactions.querySelector(`[data-emoji=${emoji}]`);
    if (reactionEl?.hasAttribute(`data-has-reacted-${resf.author.username}`)) {
      return;
    }
    if (!reactionEl) {
      reactionEl = document.createElement("button");
      if (resf.author.username === username) {
        reactionEl.classList.add("reaction-author");
      }
      reactionEl.addEventListener("click", () => {
        if (reactionEl.hasAttribute("data-reaction-post-author")) {
          last_cmd = "delete_post";
          ws.send(
            JSON.stringify({
              command: "delete_post",
              id: reactionEl.getAttribute("data-reaction-post-author"),
            }),
          );
        } else {
          ws.send(
            JSON.stringify({
              command: "post",
              content: `Reaction: ${reactionEl.dataset.emoji}`,
              replies: [resf.replies[0]._id],
              attachments: [],
            }),
          );
        }
      });
      reactionEl.dataset.emoji = emoji;
      const reactionEmojiEl = document.createElement("span");
      reactionEmojiEl.textContent = emoji;
      reactionEl.append(reactionEmojiEl);
      const reactionCountEl = document.createElement("span");
      reactionCountEl.classList.add("count");
      reactionCountEl.textContent = "0";
      reactionEl.append(reactionCountEl);
      reactions.append(reactionEl);
    }
    reactionEl.setAttribute(`data-reaction-post-${resf._id}`, "");
    reactionEl.setAttribute(`data-has-reacted-${resf.author.username}`, "");
    if (resf.author.username === username) {
      reactionEl.setAttribute(`data-reaction-post-author`, resf._id);
      reactionEl.classList.add("reaction-author");
    }
    reactionEl.querySelector(".count").textContent++;
    return;
  }

  var sts = new Date(resf.created * 1000).toLocaleString();
  var replies_loaded = replyElement(resf.replies);

  var post = document.createElement("div");
  post.classList.add("post");
  post.setAttribute("id", resf._id);

  if (isInbox) {
    const username = document.createElement("span");
    username.classList.add("mono");
    username.textContent = `@${resf.author}`;
    username.addEventListener("click", () => {
      showUser(resf.author);
    });
    post.append(username, " - ");
  } else {
    var avatar = document.createElement("img");
    if (resf.author.avatar) {
      avatar.src = resf.author.avatar;
    } else {
      avatar.src = "assets/default.png";
    }
    avatar.setAttribute("onerror", "this.src = 'assets/default.png';");
    avatar.setAttribute(
      "onclick",
      `showUser(${JSON.stringify(resf.author.username)});`,
    ); // TODO: use this more often
    avatar.classList.add("clickable");
    avatar.classList.add("pfp");
    post.appendChild(avatar);

    var postUsername = document.createElement("span");
    postUsername.innerHTML = `<b>${hescape(resf.author.display_name)}</b> (<span class="mono">@${hescape(resf.author.username)}</span>)`;
    const displayName = postUsername.querySelector("b");
    if (
      blocked_theme_users[resf.author.username] ??
      settings.display_post_themes
    ) {
      displayName.style.fontFamily = resf.author.profile?.font || "";
      displayName.style.color = resf.author.color || "";
      displayName.style.textShadow = resf.author.profile?.shadow || "";
      displayName.style.fontWeight = resf.author.profile?.weight || "";
    }
    if (resf.author.bot) {
      postUsername.innerHTML +=
        ' <span title="This user is a robot." class="inline-icon material-symbols-outlined">smart_toy</span>';
    }
    postUsername.setAttribute(
      "onclick",
      `showUser(${JSON.stringify(resf.author.username)});`,
    );
    postUsername.classList.add("clickable");
    post.appendChild(postUsername);

    var breaklineA = document.createElement("br");
    post.appendChild(breaklineA);
  }

  var postDetails = document.createElement("small");
  if (isInbox) {
    postDetails.innerHTML = `${sts}`;
  } else {
    postDetails.innerHTML = `${sts} - <span class="text-clickable" onclick="reply(${hescape(JSON.stringify(resf))});">Reply</span>`;
  }
  if (resf.author?.username == username) {
    postDetails.innerHTML += ` - <span class="text-clickable" onclick="editer('${hescape(resf._id)}', ${hescape(JSON.stringify(resf.content))});">Edit</span>`;
  }
  if ((resf.author?.username == username || delete_all) && !isInbox) {
    postDetails.innerHTML += ` - <span class="text-clickable" onclick="deletepost(${hescape(JSON.stringify(resf._id))});">Delete</span>`;
  }
  if (resf.author?.username == "thebarney86") {
    const closeButton = document.createElement("button");
    closeButton.classList.add("barney", "barney-delete");
    closeButton.addEventListener("click", () => {
      post.style.display = "none";
    });
    const steamButton = document.createElement("button");
    steamButton.classList.add("barney", "barney-steam");
    steamButton.addEventListener("click", () => {
      open("https://steamcommunity.com/id/barney86");
    });
    post.appendChild(closeButton);
    post.appendChild(steamButton);
  }
  if (username && !isInbox) {
    postDetails.innerHTML += ` - <span class="text-clickable" onclick="reactpost(${hescape(JSON.stringify(resf._id))})">React</span>`;
  }
  if (
    resf.author?.username === "thebarney86" ||
    resf.author?.username === "berry"
  ) {
    postDetails.innerHTML += ` - <span class="text-clickable" onclick="translatepost('${resf._id}', ${hescape(JSON.stringify(resf.content))})">Translate (poorly)</span>`;
  }
  post.appendChild(postDetails);

  var breaklineB = document.createElement("br");
  post.appendChild(breaklineB);

  if (!isInbox) {
    if (resf.replies.length != 0) {
      post.appendChild(replies_loaded);

      var horlineB = document.createElement("hr");
      post.appendChild(horlineB);
    }
  }

  var postContent = document.createElement("div");
  postContent.classList.add("post-content");
  postContent.setAttribute("id", "content-" + resf._id);
  if (!isInbox) {
    postContent.innerHTML = emojify(md.render(resf.content));
  } else {
    postContent.innerText = resf.content;
  }
  post.appendChild(postContent);

  if (resf.attachments.length != 0) {
    var horline = document.createElement("hr");
    post.appendChild(horline);

    var attachmentDetails = document.createElement("span");
    for (const x in resf.attachments) {
      attachmentDetails.innerHTML += `<a target="_blank" rel="noopener noreferrer" id="p-${hescape(resf._id)}-attachment-${Number(x)}">Loading...</a><br>`;
    }
    post.appendChild(attachmentDetails);

    for (let i = 0; i < resf.attachments.length; i++) {
      const attachment = document.createElement("div");
      attachment.classList.add("attachment");
      post.appendChild(attachment);
      const url = resf.attachments[i];
      fetch(url, {
        method: "HEAD",
      })
        .then(async (response) => {
          if (response.headers.get("content-type").startsWith("video/")) {
            const v = document.createElement("video");
            v.src = url;
            v.addEventListener("loadeddata", () => {
              v.height = v.clientHeight;
              v.width = v.clientWidth;
            });
            v.controls = true;
            attachment.append(v);
          } else {
            const i = document.createElement("img");
            i.src = url;
            attachment.append(i);
          }
        })
        .catch(() => {
          const i = document.createElement("img");
          i.src = url;
          attachment.append(i);
        });
    }
  }

  const reactions = document.createElement("div");
  reactions.classList.add("reactions");
  post.append(reactions);

  var postboxid;
  if (isInbox) {
    postboxid = "mi-posts";
  } else if (resf.origin == "livechat") {
    postboxid = "ml-posts";
  } else {
    postboxid = "ms-posts";
  } // this oneliner is ugly imo
  // :true:

  if (
    blocked_theme_users[resf.author.username] ??
    settings.display_post_themes
  ) {
    post.style.background = resf.author.profile?.background || "";
    if (resf.author.profile?.background) {
      post.classList.add("has-bg");
    }
    const match = resf.author.profile?.background?.match(
      /^#([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])/i,
    );
    const match2 = resf.author.profile?.background?.match(
      /^#([a-f0-9])([a-f0-9])([a-f0-9])/i,
    );
    if (match || match2) {
      const r = parseInt(match?.[1] || match2[1], 16);
      const b = parseInt(match?.[2] || match2[2], 16);
      const g = parseInt(match?.[3] || match2[3], 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance > 128) {
        post.classList.add("light-bg");
      }
    }
    ["bottom", "top", "left", "right"].forEach((direction) => {
      if (resf.author[`border-${direction}`]) {
        const upper = direction[0].toUpperCase() + direction.slice(1);
        post.style[`border${upper}`] = "1px solid";
        post.style[`border${upper}Color`] = resf.author[`border-${direction}`];
      }
    });
  }

  // todo: i can probably remove this conditional now
  if (isFetch) {
    document.getElementById(postboxid).appendChild(post);
  } else {
    document.getElementById(postboxid).appendChild(post);
  }

  for (const x in resf.attachments) {
    document.getElementById(`p-${resf._id}-attachment-${Number(x)}`).innerText =
      `Attachment ${Number(x) + 1} (${resf.attachments[x]})`;
    document.getElementById(`p-${resf._id}-attachment-${Number(x)}`).href =
      resf.attachments[x];
  }
}

function reactpost(id) {
  const emoji = prompt("What emoji do you want to react with?");
  if (!emoji) return;
  if (!/^\p{Emoji_Presentation}$/u.test(emoji)) {
    alert("That's not an emoji.");
    return;
  }
  if (
    document.querySelector(
      `[id="${id}"] .reactions .reaction-author[data-emoji="${emoji}"]`,
    )
  ) {
    alert("You already reacted with that emoji.");
    return;
  }
  ws.send(
    JSON.stringify({
      command: "post",
      content: `Reaction: ${emoji}`,
      replies: [id],
      attachments: [],
    }),
  );
}

function sendPreset(el) {
  document.getElementById("ms-msg").value = el.textContent.trim();
  sendPost();
}

async function translatepost(id, post) {
  const element = document.getElementById(`content-${id}`);
  const status = document.createElement("span");
  status.textContent = "(Translating...)";
  element.insertAdjacentElement("afterbegin", status);
  try {
    const translated = await (
      await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=uk&tl=en&dt=t&q=${encodeURIComponent(post)}`,
      )
    ).json();
    element.innerHTML = emojify(md.render(translated[0][0][0]));
  } catch (e) {
    status.textContent = "(Failed to translate)";
    console.warn(e);
  }
}

function sendPost() {
  if (!editing) {
    last_cmd = "post";
    var content = document.getElementById("ms-msg").value;
    if (replace_text) {
      for (const i in text_replacements) {
        content = content.replaceAll(i, text_replacements[i]);
      }
    }
    ws.send(
      JSON.stringify({
        command: "post",
        content:
          settings.uwu ?
            content
              .replace(/(?:r|l)/g, "w")
              .replace(/(?:R|L)/g, "W")
              .replace(/n([aeiou])/g, "ny$1")
              .replace(/N([aeiou])/g, "Ny$1")
              .replace(/ove/g, "uv")
          : content,
        replies: replies.map((reply) => reply._id),
        attachments: attachments,
      }),
    );
    document.getElementById("ms-msg").value = "";
    resizePostBox();
    attachments = [];
    replies = [];
    updateDetailsMsg();
  } else {
    editpost(edit_id);
  }
}

function sendLcPost() {
  if (!editing) {
    last_cmd = "post";
    var content = document.getElementById("ml-msg").value;
    if (replace_text) {
      for (const i in text_replacements) {
        content = content.replaceAll(i, text_replacements[i]);
      }
    }
    ws.send(
      JSON.stringify({
        command: "post",
        content: content,
        replies: replies,
        attachments: attachments,
        chat: "livechat",
      }),
    );
    document.getElementById("ml-msg").value = "";
    attachments = [];
    replies = [];
    updateDetailsMsg();
  }
}

function postInbox() {
  last_cmd = "post_inbox";
  ws.send(
    JSON.stringify({
      command: "post_inbox",
      content: document
        .getElementById("mm-content-inbox")
        .value.replaceAll("\\n", "\n"),
      replies: [],
      attachments: [],
    }),
  );
  document.getElementById("mm-content-inbox").value = "";
}

function toggleProfileCSS() {
  const style = document
    .getElementById("ud-iframe")
    .contentDocument.querySelector("#ud-style");
  style.innerHTML = style.innerHTML === "" ? style.dataset.css : "";
}

function togglePostTheme() {
  const user = document.querySelector("#user-display").dataset.username;
  blocked_theme_users[user] = !(
    blocked_theme_users[user] ?? settings.display_post_themes
  );
  if (blocked_theme_users[user] === settings.display_post_themes) {
    delete blocked_theme_users[user];
  }
  localStorage.setItem(
    "beardeer:blockedThemeUsers",
    JSON.stringify(blocked_theme_users),
  );
  if (
    confirm(
      "Done. This will apply to all posts in the future. To apply retroactively, reload the page. Reload now?",
    )
  ) {
    location.reload();
  }
}

function ban() {
  C31E957AB65D0AD2;
  last_cmd = "post";
  if (document.getElementById("mm-until-ban").value != "") {
    var buntil =
      new Date(document.getElementById("mm-until-ban").value).getTime() / 1000;
  } else {
    var buntil = 0;
  }
  ws.send(
    JSON.stringify({
      command: "ban",
      username: document.getElementById("mm-username-ban").value,
      banned_until: buntil,
      ban_reason: document.getElementById("mm-reason-ban").value,
    }),
  );
  document.getElementById("mm-username-ban").value = "";
  document.getElementById("mm-until-ban").value = "";
  document.getElementById("mm-reason-ban").value = "";
}

function genInviteCode() {
  last_cmd = "gen_invite";
  ws.send(JSON.stringify({ command: "gen_invite" }));
}

function resetInvites() {
  last_cmd = "reset_invites";
  ws.send(JSON.stringify({ command: "reset_invites" }));
}

function populateProfileSettings() {
  last_cmd = "populate_profile_settings";
  ws.send(JSON.stringify({ command: "get_user", username }));
}

function setProperty(property, overridenValue /* optional */) {
  last_cmd = `set_${property}`;
  let value =
    overridenValue ??
    document.getElementById(`mc-${property.replace(/_/g, "-")}`).value;
  if (property === "bio" && replace_text) {
    for (const i in text_replacements) {
      value = value.replaceAll(i, text_replacements[i]);
    }
  }
  ws.send(JSON.stringify({ command: "set_property", property, value }));
  if (overridenValue !== undefined) {
    document.getElementById(`mc-${property.replace(/_/g, "-")}`).value =
      overridenValue;
  }
}

function updateDetailsMsg() {
  if (editing) {
    document.getElementById("ms-details").innerHTML =
      `Editing post ${hescape(edit_id)} - <span class="text-clickable" onclick="clearAll();">Quit editing</span>`;
  } else if (replies.length == 0 && attachments.length == 0) {
    document.getElementById("ms-details").innerText = "";
  } else if (replies.length == 0) {
    if (attachments.length == 1) {
      var plurals = "";
    } else {
      var plurals = "s";
    }
    document.getElementById("ms-details").innerHTML =
      `${attachments.length} attachment${plurals} - <span class="text-clickable" onclick="clearAll();">Remove all</span>`;
  } else if (attachments.length == 0) {
    if (replies.length == 1) {
      var plurals = "y";
    } else {
      var plurals = "ies";
    }
    document.getElementById("ms-details").innerHTML =
      `${replies.length} repl${plurals} - <span class="text-clickable" onclick="clearAll();">Remove all</span>`;
  } else {
    if (replies.length == 1) {
      var plurals = "y";
    } else {
      var plurals = "ies";
    }
    if (attachments.length == 1) {
      var plurals_b = "";
    } else {
      var plurals_b = "s";
    }
    document.getElementById("ms-details").innerHTML =
      `${replies.length} repl${plurals}, ${attachments.length} attachment${plurals_b} - <span class="text-clickable" onclick="clearAll();">Remove all</span>`;
  }
  document.getElementById("ms-replies").innerHTML = "";
  document.getElementById("ms-replies").append(replyElement(replies));
}

function addAttachment() {
  if (!editing) {
    var ata = window.prompt("Add an attachment via whitelisted URL");
    if (![null, ""].includes(ata)) {
      if (attachments.length != 5) {
        attachments.push(ata);
      }
    }
    updateDetailsMsg();
  }
}

function addUpload() {
  if (!editing) {
    if (settings.upload_key && settings.upload_service) {
      document.getElementById("ms-attach").click();
    } else {
      displayError("Please set up uploading in settings!");
    }
  }
}

async function attachFile() {
  var iter = 0;
  var fl = document.getElementById("ms-attach").files;
  if (fl.length != 0) {
    displayError("Uploading...");
    var uploaded = true;
  } else {
    var uploaded = false;
  }
  for (const i in fl) {
    if (fl[i] instanceof File) {
      iter += 1;
      if (1 + attachments.length <= 5) {
        try {
          if (settings.upload_service == "imgbb") {
            var f = await uploadFile(fl[i]);
          } else if (settings.upload_service == "fraud") {
            var f = await uploadFileFraud(fl[i]);
          } else {
            throw "No service";
          }
          attachments.push(f);
        } catch (err) {
          uploaded = false;
          console.warn(err);
          displayError("Couldn't upload file.");
        }
      }
    }
  }
  if (uploaded) {
    closePopup();
  }
  document.getElementById("ms-attach").value = "";
  updateDetailsMsg();
}

function reply(id) {
  if (!editing) {
    if (replies.length != 5) {
      replies.push(id);
    }
    document.getElementById("ms-msg").focus();
    updateDetailsMsg();
  }
}

function resizePostBox() {
  const input = document.querySelector("#ms-msg");
  requestAnimationFrame(() => {
    input.style.minHeight = "auto";
    input.style.minHeight = input.scrollHeight + "px";
  });
}

function deletepost(id) {
  var wdp = confirm("Are you sure you want to delete this post?");
  if (wdp) {
    last_cmd = "delete_post";
    ws.send(JSON.stringify({ command: "delete_post", id: id }));
  }
}

function editer(id, post) {
  edit_id = id;
  editing = true;
  if (id in posts) {
    document.getElementById("ms-msg").value = posts[id].content;
  }
  document.getElementById("ms-msg").focus();
  updateDetailsMsg();
  resizePostBox();
}

function editpost(id) {
  last_cmd = "edit_post";
  var content = document.getElementById("ms-msg").value;
  if (replace_text) {
    for (const i in text_replacements) {
      content = content.replaceAll(i, text_replacements[i]);
    }
  }
  ws.send(JSON.stringify({ command: "edit_post", id: id, content: content }));
  document.getElementById("ms-msg").value = "";
  attachments = [];
  replies = [];
  editing = false;
  updateDetailsMsg();
}

function removepost(id, dba) {
  try {
    const post = document.getElementById(id);
    post.classList.remove("post");
    post.style.background = "";
    post.style.border = "";
    post.classList.remove("light-bg");
    if (dba) {
      post.innerHTML =
        "<small class='reply' style='vertical-align:top;'><i>post deleted by author</i></small>";
    } else {
      post.innerHTML =
        "<small class='reply' style='vertical-align:top;'><i>post deleted by moderator</i></small>";
    }
    var repliesMade = document.getElementsByClassName("reply-" + id);
    for (const x in repliesMade) {
      repliesMade[x].innerText = `→ post deleted`;
    }
  } catch {}
  document.querySelectorAll(`[data-reaction-post-${id}]`).forEach((r) => {
    const count = r.querySelector(".count");
    count.textContent--;
    r.removeAttribute(`data-reaction-post-${id}`);
    if (count.textContent === "0") {
      r.remove();
    } else if (r.dataset.reactionPostAuthor === id) {
      r.removeAttribute(`data-reaction-post-author`);
      r.classList.remove("reaction-author");
    }
  });
}

function editedpost(id, content) {
  try {
    document.getElementById("content-" + id).innerHTML = emojify(
      md.render(content),
    );
  } catch {}
  document.querySelectorAll(`[data-reply="${id}"]`).forEach((reply) => {
    reply.innerHTML = emojify(md.renderInline(content));
  });
}

function clearAll() {
  if (editing) {
    document.getElementById("ms-msg").value = "";
  }
  editing = false;
  replies = [];
  attachments = [];
  updateDetailsMsg();
}

function forceKick() {
  last_cmd = "force_kick";
  ws.send(
    JSON.stringify({
      command: "force_kick",
      username: document.getElementById("mm-username-forcekick").value,
    }),
  );
  document.getElementById("mm-username-forcekick").value = "";
}

function banish() {
  last_cmd = "banish_to_the_SHADOW_REALM";
  ws.send(
    JSON.stringify({
      command: "banish_to_the_SHADOW_REALM",
      ip: document.getElementById("mm-ip-banish").value,
    }),
  );
  document.getElementById("mm-ip-banish").value = "";
}

function showUserPrompt() {
  var un = prompt("Username?");
  if (un) {
    showUser(un);
  }
}

function setServerPrompt() {
  var un = prompt("Server URL?");
  if (un) {
    localStorage.setItem("beardeer:serverurl", un);
  } else {
    if (localStorage.getItem("beardeer:serverurl")) {
      localStorage.removeItem("beardeer:serverurl");
    }
  }
  window.location.reload();
}

function showUser(user) {
  last_cmd = "get_user";
  ws.send(JSON.stringify({ command: "get_user", username: user }));
}

function getIPs() {
  last_cmd = "get_ips";
  ws.send(
    JSON.stringify({
      command: "get_ips",
      username: document.getElementById("mm-username-ip").value,
    }),
  );
}

function clearIPs() {
  document.getElementById("mm-ips").innerText = "";
  document.getElementById("mm-username-ip").value = "";
}

function deleteAcc() {
  last_cmd = "delete_account";
  ws.send(
    JSON.stringify({
      command: "delete_account",
      password: document.getElementById("mc-da-password").value,
      listener: "daAccountBossDeer",
    }),
  );
  document.getElementById("mc-da-password").value = "";
}

function changePswd() {
  last_cmd = "change_password";
  ws.send(
    JSON.stringify({
      command: "change_password",
      password: document.getElementById("mc-pw-password").value,
      new_password: document.getElementById("mc-pw-new-password").value,
      listener: "pwAccountBossDeer",
    }),
  );
  document.getElementById("mc-pw-new-password").value = "";
  document.getElementById("mc-pw-password").value = "";
}

function toggleLock() {
  last_cmd = "toggle_lock";
  ws.send(JSON.stringify({ command: "toggle_lock" }));
}

function textinput() {
  // TODO
}

const suggestionsEl = document.querySelector("#ms-suggestions");
function selection(el) {
  const suggestions = determineSuggestions(el);
  suggestionsEl.innerHTML = "";
  if (suggestions === null) return;
  suggestionsEl.append(
    ...suggestions.map(({ desc, string, newPos }) => {
      const btn = document.createElement("button");
      btn.textContent = desc;
      btn.addEventListener("click", () => {
        el.value = string;
        el.setSelectionRange(newPos, newPos);
        el.focus();
        selection(el);
      });
      return btn;
    }),
  );
}

function determineSuggestions(el) {
  suggestionsEl.classList.remove("hidden");
  if (el.selectionStart !== el.selectionEnd) return null;
  const botSuggestions = determineBotSuggestions(el);
  if (botSuggestions !== null) return botSuggestions;
  const pre = el.value.slice(0, el.selectionStart);
  const post = el.value.slice(el.selectionStart);
  const mentionMatch = pre.match(/@([a-zA-Z\-_0-9]*)$/);
  if (mentionMatch) {
    const usernamePrefix = mentionMatch[1];
    const matchingUsers = ulist.filter(
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
      newPos: el.selectionStart + 1 + (user.length - usernamePrefix.length),
    }));
  }
  return null;
}

const BOTS = [
  {
    showIf: () => ulist.includes("bot"),
    prefix: "/",
    commands: [
      "help",
      "ping",
      "whoami",
      "dice",
      "expose ",
      "grrr",
      "me",
      "orange",
      "work",
      "fish",
      "about",
      "golf",
      "glungus",
      "thesoupiscoldandthesaladishot",
      "count ",
      "math ",
      "lb",
      "pi",
      "bal",
      "8ball",
      "glup",
      "notify ",
      "reversefish",
      "hEmulator ",
      "shameposts",
    ],
  },
  {
    showIf: () => ulist.includes("h"),
    prefix: "@h ",
    commands: [
      "elp",
      "quote",
      "cat",
      "death",
      "math ",
      "kill ",
      "balance",
      "labor",
      "reverselabor",
      "shop",
      "buy ",
    ],
  },
  {
    showIf: () => ulist.includes("sb4bot"),
    prefix: "@sb4bot ",
    commands: [
      "help",
      "balance",
      "notify ",
      "reversework",
      "rps ",
      "rng ",
      "wawameter ",
      "work",
    ],
  },
];
function determineBotSuggestions(el) {
  if (el.selectionStart !== el.value.length) return null;
  const bot = BOTS.find(
    (bot) => el.value.startsWith(bot.prefix) && bot.showIf(),
  );
  if (!bot) return null;
  return bot.commands
    .map((command) => bot.prefix + command)
    .filter((command) => command !== el.value && command.startsWith(el.value))
    .map((command) => ({
      desc: command.trim(),
      string: command,
      newPos: command.length,
    }));
}

const msgBox = document.querySelector("#ms-msg");
["touchstart", "keyup", "mouseup", "keydown", "focus"].forEach((e) => {
  msgBox.addEventListener(e, () => selection(msgBox));
});

function setTheme(theme) {
  localStorage.setItem("beardeer:theme", theme);
  document.getElementById("top-style").href = `themes/${theme}.css`;
  document.getElementById("mc-theme-name").innerText =
    themes[localStorage.getItem("beardeer:theme")];
}

function setCustomTheme() {
  var ccss = document.getElementById("mc-theme-custom").value;
  localStorage.setItem("beardeer:customCSS", ccss);
  document.getElementById("custom-style").innerText = ccss;
}

function ping() {
  if (ws.status == WebSocket.OPEN) {
    ws.send(JSON.stringify({ command: "ping", listener: "PingBossDeer" }));
  }
}

setInterval(ping, 2500);

// ==UserScript==
// @name         bossdeer notifications
// @namespace    wlod
// @version      2025-03-28
// @description  shows you dleted posts the history of edited posts
// @author       berry :3
// @match        https://deer.fraudulent.loan/
// @match        https://boss.soktdeer.com/
// @match        https://deer.goog-search.eu.org/
// @grant        none
// ==/UserScript==

// https://files.catbox.moe/62fie9.wav

(function () {
  "use strict";

  window.actuallyLoadPost = loadPost;
  let notifPerms = "";
  let requested = false;
  let lePinged = false;
  let pings = 0;

  Notification.requestPermission().then((result) => {
    notifPerms = result;
    if (result != "granted") {
      document.addEventListener("click", () => {
        if (requested) return;
        requested = true;
        Notification.requestPermission().then((result) => {
          console.log(result);
          notifPerms = result;
        });
      });
    } else {
      console.log(result);
      requested = true;
    }
  });

  document.addEventListener("focus", (e) => {
    if (!lePinged) return;
    pings = 0;
    lePinged = false;
    document.title = "BearDeer";
  });

  loadPost = function (resf, isFetch, isInbox) {
    if (isFetch) return actuallyLoadPost(resf, isFetch, isInbox);
    if (document.hasFocus()) return actuallyLoadPost(resf, isFetch, isInbox); // do not the ping if focused

    if (
      (resf.content.includes(`@${username}`) ||
        resf.replies.find((r) => r.author.username == username)) &&
      !resf.content.match(/^Reaction: (\p{Emoji_Presentation})$/u)
    ) {
      lePinged = true;
      pings++;
      document.title = `(${pings}) BearDeer`;
      if (notifPerms == "granted")
        new Notification(resf?.author.display_name ?? resf?.author.username, {
          body: resf.content,
          icon: resf.author.avatar ?? "assets/default.png",
        });
    }

    actuallyLoadPost(resf, isFetch, isInbox);
  };
})();
