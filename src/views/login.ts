import { html } from "hono/html";
import { layout } from "@/views/layout.js";

export function loginView(opts: { error?: string; returnTo?: string } = {}) {
  return layout(
    "Sign in · Fridge",
    html`<h1 class="page-title">Fridge</h1>
<form class="form" method="post" action="/login">
  ${opts.error ? html`<p class="form-error" role="alert">${opts.error}</p>` : ""}
  ${opts.returnTo ? html`<input type="hidden" name="return" value="${opts.returnTo}" />` : ""}
  <label class="field">Name
    <input class="form-input" type="text" name="name" autocomplete="username" required />
  </label>
  <label class="field">Password
    <input class="form-input" type="password" name="password" autocomplete="current-password" required />
  </label>
  <button class="btn btn-md btn-primary" type="submit">Sign in</button>
</form>`,
  );
}
