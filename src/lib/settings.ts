import { z } from "zod/v4";
import { select } from "./elements";
import bright from "../themes/bright.css?inline";
import cosmicLatte from "../themes/cosmic-latte.css?inline";
import deer from "../themes/deer.css?inline";
import helium from "../themes/helium.css?inline";
import midnight from "../themes/midnight.css?inline";
import roarer1 from "../themes/roarer1.css?inline";
import souple from "../themes/souple.css?inline";

const elements = {
  theme: select("style", "#theme"),
  customCSS: select("style", "#custom-css"),
} as const;

export const themeStyles = {
  Deer: deer,
  Helium: helium,
  Midnight: midnight,
  Bright: bright,
  "Cosmic Latte": cosmicLatte,
  "Roarer 1": roarer1,
  Souple: souple,
} as const;
export const themes = Object.keys(
  themeStyles,
) as readonly (keyof typeof themeStyles)[];

const settingsSchema = z.object({
  enterSends: z.boolean(),
  theme: z.enum(themes),
  customCSS: z.string(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Setting = keyof Settings;

const defaultSettings: Settings = {
  enterSends: true,
  theme: "Deer",
  customCSS: "",
};

let settings: Partial<Settings> = {};
try {
  const stored = localStorage.getItem("beardeer:settings");
  if (stored) {
    settings = settingsSchema.partial().parse(JSON.parse(stored));
  }
} catch (e) {}

export const getSetting = <TSetting extends Setting>(
  setting: TSetting,
): Settings[TSetting] => settings[setting] ?? defaultSettings[setting];
export const setSetting = <TSetting extends Setting>(
  setting: TSetting,
  value: Settings[TSetting],
) => {
  settings[setting] = value;
  localStorage.setItem("beardeer:settings", JSON.stringify(settings));
  if (setting === "theme") {
    elements.theme.innerHTML = themeStyles[value as Settings["theme"]];
  }
  if (setting === "customCSS") {
    elements.customCSS.innerHTML = value as Settings["customCSS"];
  }
};

elements.theme.innerHTML = themeStyles[getSetting("theme")];
elements.customCSS.innerHTML = getSetting("customCSS");
