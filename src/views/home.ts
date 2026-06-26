import { html } from "hono/html";
import type { User } from "@/db/schema.js";
import { layout } from "@/views/layout.js";

export function homeView(user: User) {
  return layout(
    "Fridge",
    html`<h1 class="page-title">Hello, ${user.name}!</h1>
<form method="post" action="/logout">
  <button class="btn btn-md btn-secondary" type="submit">Sign out</button>
</form>`,
  );
}
