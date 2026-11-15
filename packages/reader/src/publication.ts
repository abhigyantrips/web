/** Collections without a publication flag are public by default. */
export function isPublished(entry: { data: object }) {
	return !("published" in entry.data) || entry.data.published !== false;
}
