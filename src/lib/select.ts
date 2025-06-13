export const select = <H extends HTMLElement>(
  query: string,
  base?: HTMLElement | DocumentFragment
) => {
  const element = (base || document).querySelector(query);
  if (element === null) {
    throw new Error(`Element ${query} does not exist.`);
  }
  return element as H;
};
