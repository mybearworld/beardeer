import { select } from "./elements";

const elements = {
  scene: select("div", ".scene"),
} as const;

const sceneListeners = new Map<string, Set<() => void>>();
export const switchToScene = (scene: string) => {
  for (const child of elements.scene.children) {
    child.classList.toggle("hidden", child.id !== scene);
  }
  sceneListeners.get(scene)?.forEach((listener) => listener());
};

export const onScene = (scene: string, listener: () => void) => {
  let listeners = sceneListeners.get(scene);
  if (!listeners) {
    listeners = new Set();
    sceneListeners.set(scene, listeners);
  }
  listeners.add(listener);
};
export const onSceneOnce = (scene: string, listener: () => void) => {
  onScene(scene, () => {
    listener();
    sceneListeners.get(scene)?.delete(listener);
  });
};
