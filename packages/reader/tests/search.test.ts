import assert from "node:assert/strict";
import { test } from "node:test";
import { searchEntries, type SearchEntry } from "../src/search.ts";

const entries: SearchEntry[] = [
	{
		app: "blog",
		title: "Quiet mornings",
		description: "Coffee and café sketches",
		url: "/blog/quiet-mornings/",
		date: "2026-11-01",
	},
	{
		app: "blog",
		title: "Coffee",
		description: "A morning ritual",
		url: "/blog/coffee/",
		date: "2026-10-01",
	},
];

test("search matches titles and descriptions, including terms across both fields", () => {
	assert.deepEqual(searchEntries(entries, "quiet cafe"), [entries[0]]);
	assert.deepEqual(searchEntries(entries, "MORNING RITUAL"), [entries[1]]);
});

test("title matches rank above description matches", () => {
	assert.deepEqual(searchEntries(entries, "coffee"), [entries[1], entries[0]]);
});

test("blank queries and terms outside searchable metadata return no matches", () => {
	assert.deepEqual(searchEntries(entries, "  "), []);
	assert.deepEqual(searchEntries(entries, "quiet missing"), []);
	assert.deepEqual(searchEntries(entries, "blog"), []);
});
