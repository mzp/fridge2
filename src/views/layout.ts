import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { User } from "@/db/schema.js";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

// Distinguish environments at a glance (matches the previous implementation).
const appTitle = process.env["NODE_ENV"] === "production" ? "Fridge" : "Fridge[dev]";

/**
 * Page shell: document head (loads the compiled stylesheet), a header with the
 * brand and — when a user is signed in — their name and a sign-out button, then the
 * page content in a centered container.
 */
export function layout(title: string, body: Html, opts: { user?: User } = {}) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/dist.css" />
  </head>
  <body class="app-body">
    <header class="site-header">
      <nav class="site-nav">
        <a class="brand" href="/">${appTitle}</a>
        ${
          opts.user
            ? html`<a class="nav-link" href="/calendar">Calendar</a>
            <form class="nav-auth" method="post" action="/logout">
              <span class="nav-user">${opts.user.name}</span>
              <button class="btn btn-sm btn-secondary" type="submit">Sign out</button>
            </form>`
            : ""
        }
      </nav>
    </header>
    <main class="page">${body}</main>
  </body>
</html>`;
}
