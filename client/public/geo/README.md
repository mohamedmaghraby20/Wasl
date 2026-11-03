# Türkiye province boundaries

`tr-provinces.json` is a bundled, same-origin snapshot used to map a browser location to a
supported Wasl city. The homepage requests browser location permission automatically once per
visit, then loads the snapshot only if coordinates are available; it is not in the eager bundle.

- Source: SimpleMaps, Türkiye ADM1 — https://simplemaps.com/gis/country/tr
- License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Retrieved: 2026-11-02
- Source file SHA-256: `f1b3d0618c7721a092b6904958b09147b5c8d8b4dc2c0c51743170b9e965d362`
- Original source payload: 982,226 bytes, 81 features, 9,856 vertices, 87 rings, no holes.
- Adaptation: province `properties.id` codes were mapped to existing Wasl city IDs through an
  explicit table; only `id` and `geometry` were retained; coordinates were rounded to six decimal
  places (about 0.11 m); the result is 220,290 bytes (78,957 bytes gzip).
- Bundled snapshot SHA-256: `492f5cc5b2c290628e61ea89417774138dd7dc48b6f6c2532e43029cd60b7024`.

Attribution is also shown in the site footer. The boundaries are a generalized
province-selection aid, not survey-grade or authoritative boundary identification. Points on a
boundary, in the sea, or outside the mapped polygons resolve to no city so the visitor can choose
manually instead of receiving a nearest-city guess.

The reported point must fall inside exactly one province. Browser accuracy describes uncertainty,
not a reason to discard a point inside a known city. Even when that radius overlaps neighboring
provinces, discovery uses the province containing the estimated point. This is a city estimate,
not a guarantee of the visitor's physical location; manual correction remains available.
Boundary vintage, simplification tolerance and survey accuracy are not supplied by the publisher.

No credentials, mapping SDK, server endpoint or runtime third-party mapping service is used.
Only this static asset must load on first use; HTTP, parse and mapping failures preserve the
selection and allow manual correction or a fresh attempt on reload. Coordinates remain in short-lived browser callbacks,
never in storage, URLs, query keys, logs or discovery requests. Browser/OS positioning itself can
use network services; local matching does not imply offline device positioning.

Geolocation requires a secure context (HTTPS in production; trustworthy localhost/loopback in
development), browser/OS permission, and an allowing Permissions Policy. Physical device fixes,
production HTTPS/iframe policy and cross-browser hardware behavior must be smoke-tested on the
deployment. Review source and city-ID changes before deliberately replacing this snapshot;
there is no automatic runtime download from the publisher.
