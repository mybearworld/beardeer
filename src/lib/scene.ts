import { select } from "./select";

const elements = {
  scene: select<HTMLDivElement>(".scene"),
} as const;

export const switchToScene = (scene: string) => {
  for (const child of elements.scene.children) {
    child.classList.toggle("hidden", child.id !== scene);
  }
};
