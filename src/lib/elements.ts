export const select = <H extends keyof HTMLElementTagNameMap>(
  elementName: H,
  query: string,
  base?: Element | DocumentFragment | Document,
) => {
  const element = (base || document).querySelector(query);
  if (element === null) {
    throw new Error(`Element ${query} does not exist.`);
  }
  if (element.tagName !== elementName.toUpperCase()) {
    throw new Error(
      `Element ${query} is not a ${elementName}, but a ${element.tagName.toLowerCase()}.`,
    );
  }
  return element as HTMLElementTagNameMap[H];
};
export const clone = (el: HTMLTemplateElement) => {
  return el.content.cloneNode(true) as DocumentFragment;
};
