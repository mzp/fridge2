import { html } from "hono/html";
import type { User } from "@/db/schema.js";
import type { PantryItem, PantryItemFormValues, PantryStatus } from "@/models/pantry.js";
import { layout } from "@/views/layout.js";

function statusLabel(status: PantryStatus): string {
  return status === "in_stock" ? "In stock" : "Consumed";
}

function statusClass(status: PantryStatus): string {
  return status === "in_stock" ? "pantry-status-in-stock" : "pantry-status-consumed";
}

function statusBadge(item: PantryItem) {
  const status = item.row.status as PantryStatus;
  return html`<span class="pantry-status ${statusClass(status)}">${statusLabel(status)}</span>`;
}

function itemDetails(item: PantryItem) {
  const expiry = item.expiryDate();
  return html`<dl class="pantry-details">
    <div>
      <dt>Stock date</dt>
      <dd>${item.row.stockDate ?? "Not set"}</dd>
    </div>
    <div>
      <dt>Best before</dt>
      <dd>${item.row.bestBeforeDays == null ? "Not set" : `${item.row.bestBeforeDays} days`}</dd>
    </div>
    <div>
      <dt>Expiry</dt>
      <dd>${expiry?.toString() ?? "Not tracked"}</dd>
    </div>
  </dl>`;
}

export function pantryListView(user: User, items: PantryItem[]) {
  const body = html`<section class="pantry">
    <div class="page-heading">
      <h1 class="page-title">Pantry</h1>
      <a class="btn btn-md btn-primary" href="/pantry/new">Add item</a>
    </div>
    ${
      items.length === 0
        ? html`<p class="empty-state">Your pantry is empty.</p>`
        : html`<div class="pantry-list">
          ${items.map((item) => {
            return html`<article class="pantry-item">
              <div class="pantry-item-main">
                <h2 class="pantry-item-name">
                  <a href="/pantry/${item.row.id}">${item.row.name}</a>
                </h2>
                ${statusBadge(item)}
              </div>
              ${itemDetails(item)}
              <div class="pantry-actions">
                <a class="btn btn-sm btn-secondary" href="/pantry/${item.row.id}/edit">Edit</a>
                ${
                  item.row.status === "in_stock"
                    ? html`<form method="post" action="/pantry/${item.row.id}/consume">
                      <button class="btn btn-sm btn-secondary" type="submit">
                        Mark as consumed
                      </button>
                    </form>`
                    : ""
                }
                <form method="post" action="/pantry/${item.row.id}/delete">
                  <button class="btn btn-sm btn-danger" type="submit">Delete</button>
                </form>
              </div>
            </article>`;
          })}
        </div>`
    }
  </section>`;

  return layout("Pantry · Fridge", body, { user });
}

export function pantryDetailView(user: User, item: PantryItem, calendarReturn?: string) {
  const body = html`<section class="pantry-detail">
    <div class="page-heading">
      <h1 class="page-title">${item.row.name}</h1>
      ${statusBadge(item)}
    </div>
    <article class="pantry-item">
      ${itemDetails(item)}
      <div class="pantry-actions">
        <a class="btn btn-md btn-primary" href="/pantry/${item.row.id}/edit">Edit</a>
        <a class="btn btn-md btn-secondary" href="${calendarReturn ?? "/pantry"}">
          ${calendarReturn ? "Back to calendar" : "Back to pantry"}
        </a>
      </div>
    </article>
  </section>`;

  return layout(`${item.row.name} · Pantry · Fridge`, body, { user });
}

function statusOptions(status: PantryStatus) {
  return status === "in_stock"
    ? html`<option value="in_stock" selected>In stock</option>
        <option value="consumed">Consumed</option>`
    : html`<option value="in_stock">In stock</option>
        <option value="consumed" selected>Consumed</option>`;
}

export function pantryFormView(
  user: User,
  opts: {
    values: PantryItemFormValues;
    error?: string;
    itemId?: string;
  },
) {
  const editing = opts.itemId !== undefined;
  const heading = editing ? "Edit pantry item" : "Add pantry item";
  const action = editing ? `/pantry/${opts.itemId}` : "/pantry";
  const body = html`<section class="pantry-form-page">
    <h1 class="page-title">${heading}</h1>
    <form class="form" method="post" action="${action}">
      ${opts.error ? html`<p class="form-error" role="alert">${opts.error}</p>` : ""}
      <label class="field">
        Name
        <input
          class="form-input"
          type="text"
          name="name"
          value="${opts.values.name}"
          maxlength="200"
          required
        />
      </label>
      <label class="field">
        Stock date
        <input
          class="form-input"
          type="date"
          name="stockDate"
          value="${opts.values.stockDate}"
        />
      </label>
      <label class="field">
        Best-before days
        <input
          class="form-input"
          type="number"
          name="bestBeforeDays"
          value="${opts.values.bestBeforeDays}"
          min="0"
          max="2147483647"
          step="1"
        />
      </label>
      <label class="field">
        Status
        <select class="form-input" name="status">${statusOptions(opts.values.status)}</select>
      </label>
      <div class="form-actions">
        <button class="btn btn-md btn-primary" type="submit">
          ${editing ? "Save changes" : "Add item"}
        </button>
        <a class="btn btn-md btn-secondary" href="/pantry">Cancel</a>
      </div>
    </form>
  </section>`;

  return layout(`${heading} · Fridge`, body, { user });
}
