import { Marked } from "marked";

const marked = new Marked({
  renderer: {
    html(token) {
      return token.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/, "&quot;");
    },
  },
});

export const parseMarkdown = (
  markdown: string,
  options?: { inline?: boolean },
) =>
  (options?.inline ? marked.parseInline : marked.parse)(markdown, {
    breaks: true,
  }) as string;
