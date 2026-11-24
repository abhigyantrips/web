import { getReaderContent } from "@abhi/reader/routes";
export async function getPages() {
	const c = await getReaderContent();
	return [
		...(["blog", "weeknotes", "projects", "things", "links", "tech", "fields"] as const).flatMap(
			(scope) => c[scope].map((entry) => ({ path: `${scope}/${entry.id}`, scope, entry }))
		),
		...c.folders.map((entry) => ({
			path: `snippets/${entry.data.permalink}`,
			scope: "snippets",
			entry,
		})),
	];
}
