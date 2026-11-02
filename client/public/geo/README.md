# Türkiye province boundaries

`tr-provinces.json` is a bundled, same-origin snapshot used only to map an explicitly requested
browser location to a supported Wasl city. It is loaded lazily after the visitor chooses
“Use my location”; it is not part of the eager homepage bundle.

- Source: SimpleMaps, Türkiye ADM1 — https://simplemaps.com/gis/country/tr
- License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Retrieved: 2026-11-02
- Source file SHA-256: `f1b3d0618c7721a092b6904958b09147b5c8d8b4dc2c0c51743170b9e965d362`
- Original source payload: 982,226 bytes, 81 features, 9,856 vertices, 87 rings, no holes.
- Adaptation: province `properties.id` codes were mapped to existing Wasl city IDs through an
  explicit table; only `id` and `geometry` were retained; coordinates were rounded to six decimal
  places (about 0.11 m); the result is 220,290 bytes (78,957 bytes gzip).
- Bundled snapshot SHA-256: `492f5cc5b2c290628e61ea89417774138dd7dc48b6f6c2532e43029cd60b7024`.

Attribution is also shown next to the homepage location action. The boundaries are a generalized
province-selection aid, not survey-grade or authoritative boundary identification. Points on a
boundary, in the sea, or outside the mapped polygons resolve to no city so the visitor can choose
manually instead of receiving a nearest-city guess.

The browser's reported accuracy radius plus a 100 m conservative margin is checked against
every polygon edge using a local metre-scale projection. An intersecting radius stays unresolved.
The margin is a UX safeguard, not a certified bound on this generalized dataset's errors.
Boundary vintage, simplification tolerance and survey accuracy are not supplied by the publisher.

No credentials, mapping SDK, server endpoint or runtime third-party mapping service is used.
Only this static asset must load on first use; HTTP, parse and mapping failures preserve the
selection and allow retry/manual correction. Coordinates remain in short-lived browser callbacks,
never in storage, URLs, query keys, logs or discovery requests. Browser/OS positioning itself can
use network services; local matching does not imply offline device positioning.

Geolocation requires a secure context (HTTPS in production; trustworthy localhost/loopback in
development), browser/OS permission, and an allowing Permissions Policy. Physical device fixes,
production HTTPS/iframe policy and cross-browser hardware behavior must be smoke-tested on the
deployment. Review source and city-ID changes before deliberately replacing this snapshot;
there is no automatic runtime download from the publisher.
