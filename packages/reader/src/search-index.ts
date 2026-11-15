import type { SearchEntry } from "./search.ts";

export interface SearchDocument {
	app: string;
	title: string;
	description?: string;
	url: string;
	date: Date;
	published?: boolean;
}

/** Interfaces supply their own routes; only public metadata enters the browser index. */
export function buildSearchIndex(documents: SearchDocument[]): SearchEntry[] {
	return documents
		.filter((document) => document.published !== false)
		.map(({ app, title, description = "", url, date }) => ({
			app,
			title,
			description,
			url,
			date: date.toISOString(),
		}));
}
