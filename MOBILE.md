# Mobile interface scaffolding plan

Status: local implementation is scaffolded and automatic production redirects remain
disabled. Hosted Cloudflare settings, deployment, live-origin validation, and redirect
activation remain rollout steps. The requirements below describe the agreed direction.

## Purpose and ownership

Add `apps/mobile/`, deployed independently at `https://abhi.mobile`. It presents the
same content and applications as Computer through a mobile interface. Now remains
the canonical public writing site; Chhotu remains the publishing application.

Computer and Mobile are sibling readers. Neither may import the other's source,
Astro config, styles, public directory, generated HTML, or build output. Both read
shared collections from `content/` and use `@abhi/reader` workspace exports.

## 1. Scaffold the Astro application

- Create a private ESM package named `abhi-mobile` under `apps/mobile/`. The existing
  `apps/*` workspace pattern already includes it.
- Add its own Astro config, strict TypeScript config, Cloudflare Wrangler config,
  layouts, page routes, styles, and assets. Use `https://abhi.mobile` as its site
  origin and preserve the readers' trailing-slash convention.
- Declare `@abhi/reader: workspace:*`. Import the common collections from
  `content/collections.ts` and the journal/taxonomy/event collections from
  `content/computer/collections.ts`. The latter directory is a historical name,
  not a dependency on the Computer application.
- Keep framework versions centralized in the root `pnpm-workspace.yaml` catalog.
  Declare Astro, Astro integrations, Tailwind packages, and Wrangler with
  `catalog:` wherever the app uses them. Do not copy version numbers into Mobile,
  install an independent Astro release, or create an app-local lockfile. Add any
  newly shared Astro dependency to the catalog before consuming it.
- Give Mobile its own Sätteri configuration. Import local plugins from
  `@abhi/reader/plugins/*` and enable the installed figure and paragraph-anchor
  plugins explicitly. Keep its prose styling in its own `src/styles/prose.css`.
- Add root `dev:mobile` (port 4324), `build:mobile`, and `check:mobile` commands.
  Include Mobile in aggregate build/check commands and regenerate the one root
  `pnpm-lock.yaml`.

## 2. Build the mobile application shell and content routes

- Inventory Computer's actual routes and application registry at implementation
  time. Match its applications and public content coverage, including the intended
  About Me/Whoami application. If that app is absent from the current registry,
  implement it explicitly; moving its shared components alone did not create it.
- Build touch-oriented screens, application navigation, and controls. Reuse content
  and reader behavior; keep desktop windows, launcher placement, cursors, and
  window-management state in Computer.
- Import shared Whoami MDX and its existing responsive components directly. Its
  components and assets already live under `content/whoami/`.
- Generate routes directly from collections, applying the shared publication
  predicate. Preserve equivalent paths between Computer and Mobile wherever
  practical. Maintain an explicit mapping for any interface-only paths.
- Build search records from post titles/descriptions and application metadata.
  Reuse the shared index builder and browser matching/ranking utilities. Do not
  include article body text or individual snippets. The Snippets app itself stays
  searchable; snippet-level search is deferred.
- Use shared snippet aggregation, reading-time/date helpers, and calendar
  calculations. Each app owns its rendering and link policy. Keep canonical Now
  links for destinations served only by Now.

## 3. Add viewport-based interface redirects

Introduce one shared browser helper/configuration in `packages/reader/` and invoke
it from each interface's document head. Keep this separate from Sätteri's authored
link plugins: selecting an interface depends on the visitor's viewport at runtime.

Use an initial boundary of **768 CSS pixels**, defined once in the shared helper:

- Below 768px: Computer redirects to `https://abhi.mobile`.
- At or above 768px: Mobile redirects to `https://abhi.computer`.
- Neither rule redirects Now or Chhotu.

This threshold is an initial implementation choice and may be tuned, but both
interfaces must always consume the same value and complementary comparisons.

Implementation requirements:

1. Measure the actual layout viewport with `matchMedia('(min-width: 768px)')`.
   Use CSS pixels, not device pixels, user-agent strings, touch capability, or
   operating-system detection. Include the normal viewport meta tag before the
   decision runs.
2. Execute an early synchronous client-side check before the interface shell
   paints. Static Cloudflare responses cannot reliably know the browser viewport;
   do not implement this as a permanent HTTP redirect or a server-side UA rule.
3. Use `location.replace()` so Back does not bounce through the wrong interface.
   Preserve the pathname, query parameters, and fragment. Resolve known path
   differences through the explicit route mapping. For an unmatched route, leave
   the visitor on the requested site instead of silently sending them to a home
   page or a nonexistent destination.
4. Provide explicit "Use Computer" / "Use Mobile" links, carrying
   `?interface=computer` or `?interface=mobile`. A valid explicit selection takes
   precedence over viewport width on both sites and survives internal navigation.
   An "Automatic" choice clears it. Do not assume localStorage or cookies can be
   shared between these distinct domains.
5. In automatic mode, evaluate on initial loads and Astro client navigations. Do
   not move an active reader to another origin merely because they resize a window
   or open a software keyboard; apply the current viewport choice on the next page
   navigation. Register navigation handlers once and avoid redirect loops.
6. Restrict automatic cross-origin redirects to the configured production host
   pair. Disable them by default on localhost, preview deployments, and test
   hosts; allow an explicit local origin pair for testing. Never hardcode a
   development redirect to the live site. Redirect only document navigation,
   never assets, feeds, JSON endpoints, or API requests.
7. Keep the requested site usable if JavaScript is unavailable. Redirect failures
   must not hide the document indefinitely.

Do not enable production redirects until Mobile's routes and deployment are live
and validated. Roll back redirect activation independently if needed.

## 4. Keep styling within each interface's viewport scope

- **Computer owns larger screens.** Stop adding narrow-screen layouts, mobile
  navigation variants, touch-only shells, or small-screen overrides to Computer.
- **Mobile owns smaller screens.** Do not add desktop window layouts, wide-screen
  navigation variants, or large-screen overrides to Mobile.
- Ordinary fluid sizing, text wrapping, accessibility, zoom support, and responsive
  components embedded in shared content are still appropriate. These rules apply
  to each interface shell, not to removing the responsiveness of shared Whoami
  components or authored article media.
- After redirects are live, audit existing Computer small-screen shell rules and
  remove obsolete ones deliberately. Do not strip them before the replacement is
  available. Mobile does not need an alternate desktop shell for users who force
  it open with the interface override.

## 5. Configure independent Cloudflare deployment

- Create a Mobile Worker with root directory `apps/mobile` and custom domain
  `abhi.mobile`. Keep its Wrangler Worker name consistent with that dashboard
  configuration.
- Build command:

  ```sh
  pnpm --dir ../.. --filter "abhi-mobile..." install --frozen-lockfile && pnpm build
  ```

- Deploy command: `pnpm exec wrangler deploy`.
- Use the same build settings as the other apps: `SKIP_DEPENDENCY_INSTALL=true`,
  `NODE_VERSION=24`, and the root-pinned pnpm version.
- Watch `apps/mobile/**`, `content/**`, `packages/reader/**`, `package.json`,
  `pnpm-lock.yaml`, and `pnpm-workspace.yaml`. Computer and Now retain their own
  equivalent watch paths; neither depends on Mobile's app directory.
- The shared package is consumed as source and needs no separate build. Computer
  continues using only the `abhi-computer...` filtered install, without a Now or
  Mobile filter.

## 6. Validate before enabling redirects

- Build/check each reader independently and verify filtered installation includes
  workspace dependencies without requiring another reader's source package.
- Confirm public content coverage, draft exclusion, Whoami assets, snippets,
  metadata-only launcher search, calendar placement, and authored link behavior.
- Test redirects at 767px and 768px in both directions, on deep links, with query
  parameters/fragments, explicit interface overrides, direct loads, and Astro
  navigation. Verify resize/keyboard behavior, Back history, missing route mapping,
  preview/local defaults, and JavaScript-disabled fallback.
- Inspect each shell at widths within its own scope. Confirm Computer has gained
  no extra mobile layout and Mobile has gained no alternate desktop layout.
- Deploy Mobile first, validate its actual origin, then enable the redirect pair.
  Update the root README with the implemented routes, commands, and threshold.
