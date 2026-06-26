import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

/** Wrap page content in the HTML document shell (loads the compiled stylesheet). */
export function layout(title: string, body: Html) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/dist.css" />
  </head>
  <body>
    <main class="page">${body}</main>
  </body>
</html>`;
}
