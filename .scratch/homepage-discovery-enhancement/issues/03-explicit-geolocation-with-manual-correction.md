# 03: Explicit geolocation with manual correction

**What to build:** Let visitors explicitly use their location to choose a supported Türkiye city, see that city reflected in the existing dropdown and discovery results, and correct it manually without losing control of their location data.

**Blocked by:** 02 — City-aware upcoming event discovery.

**Status:** ready-for-agent

**Labels:** ready-for-agent

- [ ] Verify and select a coordinate-to-city mapping method against existing Türkiye province/city identifiers. Record accuracy, licensing, privacy, runtime/network and credential requirements; do not assume a provider is already configured or choose a nearest-city approximation as province identification.
- [ ] Complete mapping and its browser/server integration as needed for a working end-to-end location action, not only a provider investigation or browser permission stub. If credentials are truly required and unavailable, report the blocker rather than claiming the feature works.
- [ ] Request browser location only after an explicit “Use my location” action. Never request automatically on arrival/return or enable background location watching.
- [ ] A successful supported result updates the same editable dropdown, active discovery context and city-only browser persistence used by manual selection. Visitors can immediately choose another city or explicitly refresh location.
- [ ] Permission denial, unsupported geolocation, timeout, mapping/network failure, unmatched coordinates and outside-Türkiye results preserve the current valid city or nationwide state, explain briefly and leave manual selection usable.
- [ ] Do not silently map outside-country coordinates to a nearby Turkish city. Do not persist precise coordinates or introduce durable coordinate logging/location analytics; disclose and minimize any coordinate transfer required by the selected mapping method.
- [ ] Delayed/stale responses cannot overwrite a newer manual selection or newer location request. Busy/error feedback is accessible and does not disable unrelated public search/discovery.
- [ ] Deterministic browser tests stub permissions, coordinates and mapping for success and each failure class; verify explicit-only prompting, dropdown synchronization, manual correction, return visits, stale responses and city-only persistence.
- [ ] Verify Arabic/English copy, keyboard use and RTL/LTR presentation, and record a supported-browser location/mapping smoke check where the environment permits it.
