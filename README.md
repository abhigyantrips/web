# abhi.now workspace

This repository owns Now, Computer, Chhotu, and their shared source content. Now's
existing Git history is retained; the other applications were imported as source
snapshots. The sibling repositories have not been changed.

```text
apps/now/       abhi.now — canonical public writing, feeds, sitemap
apps/computer/  abhi.computer — desktop and native content windows
apps/chhotu/    chhotu.abhi.now — authenticated publishing Worker and PWA
content/        shared Markdown/MDX, images, schemas, loaders, authored components
packages/reader/  shared reader utilities and local Sätteri plugins
content/computer/  existing journal, links, tech and fields
scripts/        image-processing Git hook
```

Install with `pnpm install --frozen-lockfile` from this directory. The root
lockfile covers all apps. Each app retains its own Astro/Wrangler configuration,
runtime, environment files, deployment, and public origin. Keep secrets inside the
relevant application's ignored `.env` / `.dev.vars` files.

| Command                                                        | Action                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev:now`                                                 | Now on port 4321                                                  |
| `pnpm dev:computer`                                            | Computer on port 4322                                             |
| `pnpm dev:chhotu`                                              | Chhotu on port 4323; configure its local OAuth origin accordingly |
| `pnpm build`                                                   | Build all three apps independently                                |
| `pnpm build:now` / `pnpm build:computer` / `pnpm build:chhotu` | Build one app                                                     |
| `pnpm check`                                                   | Diagnostics for all three apps                                    |
| `pnpm format` / `pnpm format:check`                            | Write / check Prettier formatting                                 |

Chhotu's background development-server instructions are in
[its AGENTS.md](apps/chhotu/AGENTS.md). Existing local OAuth callbacks may use a
separate port; its app-local `pnpm dev` retains the normal Astro default.

## Content and rendering

Now and Computer load the same local collection definitions from
`content/collections.ts`. Both public Blog selections exclude unpublished posts.
Computer's existing collections remain under `content/computer/`; adding them to
Now's public routes is a future editorial decision. Authored image paths stay
relative to their Markdown files. Whoami's responsive components and assets live
beside its MDX; article fonts live beside the shared posts, and the naïve-design
article contains its own torn-paper generator. No shared content imports an app.
Computer-specific collection definitions live in `content/computer/collections.ts`
so another reader can opt into them without importing Computer's source.

Computer generates article, weeknote, snippet collection, facet and project pages
inside its desktop windows. It renders MDX and interactive components locally;
its search index reads the same checkout, without fetching Now's deployed feeds.
Its address and Open link still show the canonical public Now URL. Build-time
navigation keeps supported links within the current application local and sends
other destinations to their public URL in a separate tab. Ordinary full-page
navigation handles location and preferences; no iframe messaging bridge is used.
External media iframes authored in articles continue to work.

Now's `/embed` variants, receiver, transformation middleware and embed cache are
retired. Its normal pages, plaintext variants, feeds, sitemap and social cards
remain. Both readers import their content assets directly and own their prose styles in
`src/styles/prose.css`. Computer has no dependency on Now's config, source, or
public directory, and no HTML response-rewriting middleware.

`@abhi/reader` provides reading-time/date formatting, publication filtering,
snippet aggregation, search-index construction, browser search matching, and
calendar calculations through separate subpath exports. Browser imports do not
load collection queries. Launcher search indexes titles and descriptions only;
individual snippets are excluded, while the Snippets application remains searchable.
Each app queries collections and chooses its own routes. Computer's
`getContentPages()` enumerates its routes directly from those collections.

Each Astro config independently enables its installed Sätteri figure and paragraph
anchor plugins. Local plugins in `packages/reader/src/plugins/` provide prose dash
conversion and configurable authored-link rewriting. Now uses dash conversion;
Computer additionally rewrites same-application links locally and opens other HTTP
links canonically in a new tab. Literal Markdown, HTML, and MDX links are handled
during compilation; dynamically generated component links must supply their own
URLs. The current route policy recognizes route shapes rather than checking an
additional collection manifest. No content queries run inside Markdown plugins.

Run `pnpm test` for the shared reader and Computer state/motion tests.

All three apps use Astro 7.4.11 and shared Astro integration and Tailwind versions
from the catalog in `pnpm-workspace.yaml`. Each app declares the packages it uses
with `catalog:`; update their shared versions in the catalog and regenerate
`pnpm-lock.yaml`. Astro belongs to the apps, not the workspace root.
A filtered Computer install can use `pnpm --filter abhi-computer... install`;
its workspace dependencies include `@abhi/reader`, without installing Now.

## Cloudflare rollout

Keep all three existing Workers and domain bindings. In each Worker's Settings >
Build, connect `abhigyantrips/web` with production branch `main`. Set the root
directory to the application's directory so Cloudflare finds its Wrangler config:

| Worker / domain                   | Root directory  |
| --------------------------------- | --------------- |
| `abhi-now` / `abhi.now`           | `apps/now`      |
| `abhi-computer` / `abhi.computer` | `apps/computer` |
| `chhotu` / `chhotu.abhi.now`      | `apps/chhotu`   |

For all three, use this build command:

```sh
pnpm --dir ../.. install --frozen-lockfile && pnpm build
```

Use `pnpm exec wrangler deploy` as the deploy command. Set build variables
`SKIP_DEPENDENCY_INSTALL=true` (the build command installs the workspace explicitly)
and `NODE_VERSION=24`. The root `packageManager` field pins pnpm 10.29.3. Keep
runtime bindings and secrets on their existing Workers, including Chhotu's OAuth
credentials and session secret; its `APP_ORIGIN` remains `https://chhotu.abhi.now`.

These app roots supersede the earlier repository-root dashboard recommendation.
See Cloudflare's [monorepo setup](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/)
and [custom dependency installation](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/#skip-dependency-install).

Include these watch
paths for both readers: `content/**`, `packages/reader/**`, their own `apps/<name>/**`, `package.json`,
`pnpm-lock.yaml`, and `pnpm-workspace.yaml`. Chhotu watches `apps/chhotu/**` and
root package/workspace/lockfile changes; content-only commits need not redeploy it.
Both readers build the same content commit, with independent deploys and rollbacks.
Changing these hosted Git settings and deploying remain rollout steps; local
migration does not modify the Cloudflare account.

Switch Chhotu to this repository when deploying its new Worker. It still commits
to `abhigyantrips/web` on `main`, now under `content/snippets`. Its endpoints,
PWA origin/identity, authentication, draft format, atomic commits, duplicate and
retry recovery, and expected-HEAD checks are preserved. Installed editors submit
collection IDs and content, not repository paths, so the updated server supplies
the new paths without an editor protocol change. An old collections snapshot
gets the usual 409 and refresh if HEAD changed. Unrelated code commits still
require refreshing; concurrency protection has not been relaxed. During cutover,
stop publishing through the old Worker until the new code and paths are live.
A successful commit continues to be reported separately from deployment success.

## Formatting

Prettier remains the formatter for the three Astro apps, with their existing
Astro, TypeScript import-organizer and Tailwind plugins. Tailwind sorting uses each
app's stylesheet. Shared authored content, public assets and generated outputs are excluded from
bulk formatting. Oxfmt delegates Astro/MDX to
Prettier and cannot load the existing import-organizer plugin; consolidating does
not require changing formatting behavior. See [Oxfmt language support](https://oxc.rs/docs/guide/usage/formatter/language-support)
and [plugin limitations](https://oxc.rs/docs/guide/usage/formatter/unsupported-features).

The existing image hook continues to run from `.hooks/pre-commit` in this checkout.
Its portable source is now `scripts/pre-commit`. On a fresh checkout install it
with `mkdir -p .hooks && cp scripts/pre-commit .hooks/pre-commit && chmod +x .hooks/pre-commit`
and `git config core.hooksPath .hooks`. It preserves ICC profiles and orientation
while removing other EXIF data before staging images.
