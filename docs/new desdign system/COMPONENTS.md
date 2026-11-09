# Component contracts and candidate anatomy

Each component requires semantic HTML, keyboard and focus support, appropriate labels, responsive layout and RTL. The list is a proposed minimum; it must not replace the actual Wasl component inventory. Existing variants and functionality must be mapped and retained.

| Family | Required anatomy / variants | Relevant states |
|---|---|---|
| Buttons | primary, secondary, outline, destructive, icon; text + optional icon | default, hover, focus, disabled, loading |
| Links | inline, standalone, navigation; identifiable without color alone | hover, focus, active |
| Form | label, control, hint, validation message; inputs, textarea, checkbox, radio, switch, select | empty, filled, focus, invalid, disabled, required |
| Search/filter | labeled search input + submit/clear where applicable; filter chips, selects and active-filter summary | typed, selected, loading, empty results, reset |
| Navigation | header, signed-out and signed-in controls, mobile menu, breadcrumbs, tabs, pagination | current, hover, focus, expanded, notification unread |
| Card primitive | border, optional media/header, body, optional separated footer | default, interactive, focus, loading |
| Event card | image, date, title, location/mode, organizer, availability and action as supported | open, full, approval, waitlist, past, saved if supported |
| Community card | image/avatar, name, description, location, member/visibility data and action as supported | public, approval, member, pending, waitlist if supported |
| Lists & data | avatar, badges, metadata, list/table and pagination | empty, loading, error, overflowing content |
| Feedback | alerts, toast, inline validation, progress and skeleton | success, warning, error, info, loading; text + icon |
| Overlays | dialog, confirmation, dropdown, tooltip, sheet | open, focus trapped where appropriate, dismiss, focus restored |
| Profile & auth | avatar, profile header, sign-in/up fields and feedback | signed out, signed in, loading, validation/error |
| Detail patterns | event/community hero, metadata, description, participation panel | public browsing, auth required to participate, approval/waitlist where applicable |

Card composition: the media aligns to card edges, content is padded, title and metadata align to the same inline start, footer is separated by a border and kept at the bottom when cards are equal-height. Never rely on absolute positioning for dynamic descriptions. The parent decides 1/2/3+ columns according to available width. Use logical start/end alignment in RTL and avoid forcing names, dates or locations into one truncated line without a way to access content.

A review should check real long Arabic and English strings, missing images, narrow viewports, zoom, and examples of every existing variant. Don't depict waitlist, pricing, ratings or controls unsupported by actual code as live features.
