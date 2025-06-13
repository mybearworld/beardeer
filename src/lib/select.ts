export const select = <H extends keyof HTMLElementTagNameMap>(
  elementName: H,
  query: string,
  base?: HTMLElement | DocumentFragment
) => {
  const element = (base || document).querySelector(query);
  if (element === null) {
    throw new Error(`Element ${query} does not exist.`);
  }
  if (element.tagName !== elementName.toUpperCase()) {
    throw new Error(
      `Element ${query} is not a ${elementName}, but a ${element.tagName.toLowerCase()}.`
    );
  }
  return element as HTMLElementTagNameMap[H];
};
