import assert from "node:assert/strict";
import { test } from "node:test";
import { monthWeeks, weekSegment } from "../src/calendar.ts";
import { isPublished } from "../src/publication.ts";
import { buildSearchIndex } from "../src/search-index.ts";

test("search index exposes public metadata only", () => {
	const document = {
		app: "blog",
		title: "A post",
		description: "A description",
		url: "/blog/post/",
		date: new Date("2026-11-01"),
		body: "Private body text",
	};
	const index = buildSearchIndex([document, { ...document, published: false }]);
	assert.deepEqual(index, [
		{
			app: "blog",
			title: "A post",
			description: "A description",
			url: "/blog/post/",
			date: "2026-11-01T00:00:00.000Z",
		},
	]);
	assert.equal(isPublished({ data: {} }), true);
	assert.equal(isPublished({ data: { published: false } }), false);
});

test("calendar placement clips multiweek events to the selected row", () => {
	const weeks = monthWeeks("2026-11");
	assert.deepEqual(weekSegment(weeks[0], new Date("2026-10-30"), new Date("2026-11-03")), {
		column: 1,
		span: 3,
	});
	assert.equal(weekSegment(weeks[1], new Date("2026-10-30"), new Date("2026-11-03")), null);
});
