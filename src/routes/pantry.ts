import { Hono } from "hono";
import { Temporal } from "temporal-polyfill";
import type { Db } from "@/db/index.js";
import type { User } from "@/db/schema.js";
import { logger } from "@/logger.js";
import { type AppEnv, requireAuth } from "@/middlewares/session.js";
import {
  PantryItem,
  type PantryItemFormValues,
  type PantryItemInput,
  type PantryStatus,
} from "@/models/pantry.js";
import { pantryDetailView, pantryFormView, pantryListView } from "@/views/pantry.js";

const emptyForm: PantryItemFormValues = {
  name: "",
  stockDate: "",
  bestBeforeDays: "",
  status: "in_stock",
};

function formValues(body: Record<string, string | File>): PantryItemFormValues {
  const status = body["status"] === "consumed" ? "consumed" : "in_stock";
  return {
    name: String(body["name"] ?? ""),
    stockDate: String(body["stockDate"] ?? ""),
    bestBeforeDays: String(body["bestBeforeDays"] ?? ""),
    status,
  };
}

function validate(values: PantryItemFormValues): { input: PantryItemInput } | { error: string } {
  const name = values.name.trim();
  if (name.length === 0) {
    return { error: "Name is required." };
  }
  if (name.length > 200) {
    return { error: "Name must be 200 characters or fewer." };
  }

  if (values.stockDate !== "") {
    try {
      Temporal.PlainDate.from(values.stockDate, { overflow: "reject" });
    } catch {
      return { error: "Stock date must be a valid date." };
    }
  }

  let bestBeforeDays: number | null = null;
  if (values.bestBeforeDays !== "") {
    if (!/^\d+$/.test(values.bestBeforeDays)) {
      return { error: "Best-before days must be a non-negative whole number." };
    }
    bestBeforeDays = Number(values.bestBeforeDays);
    if (!Number.isSafeInteger(bestBeforeDays) || bestBeforeDays > 2_147_483_647) {
      return { error: "Best-before days is too large." };
    }
  }

  return {
    input: {
      name,
      stockDate: values.stockDate || null,
      bestBeforeDays,
      status: values.status,
    },
  };
}

function valuesFor(item: PantryItem): PantryItemFormValues {
  return {
    name: item.row.name,
    stockDate: item.row.stockDate ?? "",
    bestBeforeDays: item.row.bestBeforeDays?.toString() ?? "",
    status: item.row.status as PantryStatus,
  };
}

function logNotFound(path: string, userId: string, itemId: string | number): void {
  logger.warn({ path, userId, itemId }, "pantry item not found");
}

function pantryId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function calendarReturn(value: string | undefined): string | undefined {
  if (value === "/calendar" || value?.startsWith("/calendar?")) {
    return value;
  }
  return undefined;
}

export function createPantryRoutes(db: Db) {
  const app = new Hono<AppEnv>();

  app.get("/pantry", requireAuth, async (c) => {
    const user = c.var.user as User;
    return c.html(pantryListView(user, await PantryItem.all(db, user.id)));
  });

  app.get("/pantry/new", requireAuth, (c) => {
    return c.html(pantryFormView(c.var.user as User, { values: emptyForm }));
  });

  app.get("/pantry/:id", requireAuth, async (c) => {
    const user = c.var.user as User;
    const idParam = c.req.param("id");
    const id = pantryId(idParam);
    if (id === null) {
      logNotFound(c.req.path, user.id, idParam);
      return c.notFound();
    }
    const item = await PantryItem.find(db, user.id, id);
    if (!item) {
      logNotFound(c.req.path, user.id, id);
      return c.notFound();
    }
    return c.html(pantryDetailView(user, item, calendarReturn(c.req.query("return"))));
  });

  app.post("/pantry", requireAuth, async (c) => {
    const user = c.var.user as User;
    const values = formValues(await c.req.parseBody());
    const result = validate(values);
    if ("error" in result) {
      logger.warn(
        { path: c.req.path, userId: user.id, error: result.error },
        "invalid pantry item",
      );
      return c.html(pantryFormView(user, { values, error: result.error }), 400);
    }
    await PantryItem.create(db, user.id, result.input);
    return c.redirect("/pantry", 303);
  });

  app.get("/pantry/:id/edit", requireAuth, async (c) => {
    const user = c.var.user as User;
    const idParam = c.req.param("id");
    const id = pantryId(idParam);
    if (id === null) {
      logNotFound(c.req.path, user.id, idParam);
      return c.notFound();
    }
    const item = await PantryItem.find(db, user.id, id);
    if (!item) {
      logNotFound(c.req.path, user.id, id);
      return c.notFound();
    }
    return c.html(pantryFormView(user, { values: valuesFor(item), itemId: item.row.id }));
  });

  app.post("/pantry/:id", requireAuth, async (c) => {
    const user = c.var.user as User;
    const idParam = c.req.param("id");
    const id = pantryId(idParam);
    if (id === null) {
      logNotFound(c.req.path, user.id, idParam);
      return c.notFound();
    }
    const values = formValues(await c.req.parseBody());
    const result = validate(values);
    if ("error" in result) {
      logger.warn(
        { path: c.req.path, userId: user.id, itemId: id, error: result.error },
        "invalid pantry item",
      );
      return c.html(pantryFormView(user, { values, error: result.error, itemId: id }), 400);
    }
    const item = await PantryItem.update(db, user.id, id, result.input);
    if (!item) {
      logNotFound(c.req.path, user.id, id);
      return c.notFound();
    }
    return c.redirect("/pantry", 303);
  });

  app.post("/pantry/:id/delete", requireAuth, async (c) => {
    const user = c.var.user as User;
    const idParam = c.req.param("id");
    const id = pantryId(idParam);
    if (id === null) {
      logNotFound(c.req.path, user.id, idParam);
      return c.notFound();
    }
    if (!(await PantryItem.delete(db, user.id, id))) {
      logNotFound(c.req.path, user.id, id);
      return c.notFound();
    }
    return c.redirect("/pantry", 303);
  });

  app.post("/pantry/:id/consume", requireAuth, async (c) => {
    const user = c.var.user as User;
    const idParam = c.req.param("id");
    const id = pantryId(idParam);
    if (id === null) {
      logNotFound(c.req.path, user.id, idParam);
      return c.notFound();
    }
    if (!(await PantryItem.consume(db, user.id, id))) {
      logNotFound(c.req.path, user.id, id);
      return c.notFound();
    }
    return c.redirect("/pantry", 303);
  });

  return app;
}
