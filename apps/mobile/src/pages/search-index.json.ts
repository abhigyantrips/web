import { getSearchIndex } from "../lib/search-index";
export async function GET() {
	return Response.json(await getSearchIndex());
}
