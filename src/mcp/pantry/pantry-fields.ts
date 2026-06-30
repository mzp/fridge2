import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";

/**
 * Shared Zod fields and result helpers for the pantry MCP tools. The tools each
 * live in their own file (one tool per file), but they describe the same item
 * shape, so the field definitions are defined once here.
 */

const isRealDate = (value: string): boolean => {
  try {
    Temporal.PlainDate.from(value, { overflow: "reject" });
    return true;
  } catch {
    return false;
  }
};

/** A pantry item's id (a positive integer). */
export const idField = z.number().int().positive().describe("The pantry item's id.");

/** Item name: required, trimmed, bounded like the web form. */
export const nameField = z.string().trim().min(1).max(200).describe('Item name, e.g. "milk".');

/** Stock date as YYYY-MM-DD, or null when the shelf life isn't tracked. */
export const stockDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Stock date must be formatted as YYYY-MM-DD.")
  .refine(isRealDate, "Stock date must be a valid calendar date.")
  .nullable()
  .describe("The day the item was stocked (YYYY-MM-DD), or null when not tracked.");

/** Days from the stock date until the item goes off, or null when not tracked. */
export const bestBeforeDaysField = z
  .number()
  .int()
  .min(0)
  .max(2_147_483_647)
  .nullable()
  .describe("Days from the stock date until it goes off, or null when not tracked.");

/** Item status. */
export const statusField = z
  .enum(["in_stock", "consumed"])
  .describe('Either "in_stock" or "consumed".');

/** Tool result for an item that does not exist (or belongs to another user). */
export const notFoundResult = (id: number): CallToolResult => ({
  content: [{ type: "text", text: `No pantry item with id ${id}.` }],
  isError: true,
});

/** Tool result wrapping a JSON payload as text. */
export const jsonResult = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

/** Tool result wrapping a plain text message. */
export const textResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});
