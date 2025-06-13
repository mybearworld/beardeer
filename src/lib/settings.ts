import { z } from "zod/v4";

const settingsSchema = z.object({
  enterSends: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Setting = keyof Settings;

const defaultSettings: Settings = {
  enterSends: true,
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
};
