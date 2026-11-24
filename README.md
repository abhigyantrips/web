# abhi.now workspace

This repository owns Now, Computer, Mobile, Chhotu, and their shared source content. Now's
existing Git history is retained; the other applications were imported as source
snapshots. The sibling repositories have not been changed.

```text
apps/now/       abhi.now — canonical public writing, feeds, sitemap
apps/computer/  abhi.computer — desktop and native content windows
apps/mobile/    abhi.mobile — touch-oriented sibling reader
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
| `pnpm dev:mobile`                                              | Mobile on port 4324                                               |
| `pnpm dev:chhotu`                                              | Chhotu on port 4323; configure its local OAuth origin accordingly |
| `pnpm build`                                                   | Build all four apps independently                                 |
| `pnpm build:now` / `pnpm build:computer` / `pnpm build:chhotu` | Build one app                                                     |
| `pnpm check`                                                   | Diagnostics for all four apps                                     |
| `pnpm format` / `pnpm format:check`                            | Write / check Prettier formatting                                 |

Chhotu's background development-server instructions are in
[its AGENTS.md](apps/chhotu/AGENTS.md). Existing local OAuth callbacks may use a
separate port; its app-local `pnpm dev` retains the normal Astro default.

## Content and rendering

Now, Computer, and Mobile load the same local collection definitions from
`content/collections.ts`. All public Blog selections exclude unpublished posts.
Computer's existing collections remain under `content/computer/`; adding them to
Now's public routes is a future editorial decision. Authored image paths stay
relative to their Markdown files. Whoami's responsive components and assets live
beside its MDX; article fonts live beside the shared posts, and the naïve-design
article contains its own torn-paper generator. No shared content imports an app.
Computer-specific collection definitions live in `content/computer/collections.ts`
so another reader can opt into them without importing Computer's source.

Computer generates article, weeknote, snippet collection, project, and About Me pages
inside its desktop windows. It renders MDX and interactive components locally;
its search index reads the same checkout, without fetching Now's deployed feeds.
Its address and Open link still show the canonical public Now URL. Build-time
navigation keeps supported links within the current application local and sends
other destinations to their public URL in a separate tab. Ordinary full-page
navigation handles location and preferences; no iframe messaging bridge is used.
External media iframes authored in articles continue to work.

Now's `/embed` variants, receiver, transformation middleware and embed cache are
retired. Its normal pages, plaintext variants, feeds, sitemap and social cards
remain. All readers import their content assets directly and own their prose styles in
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

All four apps use Astro 7.4.11 and shared Astro integration and Tailwind versions
from the catalog in `pnpm-workspace.yaml`. Each app declares the packages it uses
with `catalog:`; update their shared versions in the catalog and regenerate
`pnpm-lock.yaml`. Astro belongs to the apps, not the workspace root.
A filtered Computer install can use `pnpm --filter abhi-computer... install`;
its workspace dependencies include `@abhi/reader`, without installing Now.

Mobile scaffolding, viewport redirects, dependency ownership, and viewport styling
boundaries follow [MOBILE.md](MOBILE.md). Mobile owns its configuration, assets,
prose, and touch shell; it imports no Computer application source. Start it with
`pnpm dev:mobile` (port 4324), build with `pnpm build:mobile`, and run diagnostics
with `pnpm check:mobile`. Aggregate build/check commands include it.

Mobile serves `/blog/`, `/weeknotes/`, `/projects/`, `/snippets/` (including folders
and collection timelines), `/journal/`, `/things/`, `/links/`, `/tech/:id/`,
`/fields/:id/`, `/whoami/`, `/settings/`, `/colophon/`, and `/search/`. Each public
article has the same path as Computer. `/desktop/` maps to `/`; `/credits/` maps
to `/colophon/`. Computer's icon study stays Computer-only; Mobile's Search stays
Mobile-only. Unknown routes never trigger an interface redirect. Individual snippet
search is deferred. Shared Whoami facet links, RSS feeds, and other Now-only
resources retain canonical Now destinations. About Me is registered in Computer too.

The shared head helper uses `matchMedia('(min-width: 768px)')`: narrower viewports
select Mobile and larger viewports select Computer. **Production automatic
redirects are disabled** by `INTERFACE_REDIRECTS_ENABLED` in
`packages/reader/src/interface.ts`. Deploy and validate Mobile first, then enable
that single switch in both builds; roll back that switch independently. Existing
Computer small-screen rules remain until rollout. Neither Now nor Chhotu uses
this helper.

Settings in each reader provides Use Computer, Use Mobile, and Automatic choices.
Explicit choices travel as `?interface=computer` / `?interface=mobile`; per-origin
session storage and internal links retain the selection. Automatic clears the
selection. Redirects use `location.replace()` and preserve queries and fragments.
They run before the shell paints and on Astro navigation, with no resize listener.
Local and preview hosts do not automatically redirect. To test a local pair,
set both `PUBLIC_READER_COMPUTER_ORIGIN=http://localhost:4322` and
`PUBLIC_READER_MOBILE_ORIGIN=http://localhost:4324` when starting/building each
reader. Never set those local testing variables in production.

The root pins `@emnapi/runtime` to 1.11.3 for Astro's checker: its installed WASM
bridge requires that stable peer, while automatic peer resolution selected an
incompatible 2.0 beta.

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

Prettier remains the formatter for the four Astro apps, with their existing
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

### Mobile deployment

Mobile's independent Worker configuration is in `apps/mobile/wrangler.jsonc`:
Worker `abhi-mobile`, custom domain `abhi.mobile`, root directory `apps/mobile`.
Use this Cloudflare build command:

```sh
pnpm --dir ../.. --filter "abhi-mobile..." install --frozen-lockfile && pnpm build
```

Deploy with `pnpm exec wrangler deploy`. Configure `SKIP_DEPENDENCY_INSTALL=true`,
`NODE_VERSION=24`, and the root-pinned pnpm version. Watch `apps/mobile/**`,
`content/**`, `packages/reader/**`, `package.json`, `pnpm-lock.yaml`, and
`pnpm-workspace.yaml`. Keep Computer and Now's filtered builds independent of
Mobile. The Worker/domain and hosted build settings must be configured in
Cloudflare during rollout; repository scaffolding does not change those settings.

Before activation, validate the live Mobile origin and both interface directions
at 767px and 768px, deep links, explicit choices, Astro navigation, history,
resize/keyboard behavior, preview/local defaults, and JavaScript-disabled pages.
