# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Salento Stay** is a static Italian vacation rental website deployed on Netlify. It showcases holiday homes in Salento (Puglia, Italy) across four locations: Porto Cesareo, Torre Lapillo, Torre Colimena, and San Pietro in Bevagna.

The site has no build system, bundler, or package manager — it is plain HTML, CSS, and JavaScript files served directly from the root directory.

## Deployment

- **Platform**: Netlify
- **Publish directory**: `.` (root)
- **Netlify Functions directory**: `netlify/functions`
- Deploy by pushing to the `main` branch

The `netlify.toml` config points functions to `netlify/functions/`. The actual proxy function file is misnamed at the root as `netlify:/functions:/smoobu-proxy.js` — the correct path for Netlify to pick it up should be `netlify/functions/smoobu-proxy.js`.

## Architecture

### Page Structure

- `index.html` — Homepage with destination grid, property listings, and contact CTAs
- `strutture-1.html` / `strutture-2.html` — Paginated full property listings
- `strutture-{location}.html` — Location-filtered listing pages (porto-cesareo, torre-lapillo, torre-colimena, san-pietro-in-bevagna)
- `{property-slug}.html` — Individual property detail pages with image carousels, availability calendar, and booking widget
- `prev-gratuito-form.html` — Free quote request form (submits to JotForm)
- `booking-widget.html` — Standalone booking widget (Stripe + Smoobu integration)

### Styling

Single shared stylesheet: `styles.css` (loaded with `?v=1.1` cache-busting on some pages). CSS variables are defined in `:root` and used throughout. No CSS preprocessor.

### Booking/Availability Integration

- **Smoobu** is the PMS (property management system) used for availability and reservations
- **`netlify/functions/smoobu-proxy.js`**: Serverless function that proxies requests to `https://login.smoobu.com/api`, restricted to whitelisted paths:
  - `/apartments/{id}/availability`
  - `/rates/apartments/{id}`
  - `/reservations`
- Frontend pages use **Flatpickr** (from CDN) for date picking, with availability dates fetched through the proxy
- **Stripe** (from CDN) is used in `booking-widget.html` for payment processing
- CORS in the proxy is restricted to `https://salento-stay.com`

### Quote Form

`prev-gratuito-form.html` submits to **JotForm** (`https://eu-submit.jotform.com/submit/241973094878372/`). Date fields are split into day/month/year hidden inputs populated via JavaScript on submit.

### Images

Images are stored directly in the root and in `FOTO_CASE/{property-name}/` subdirectories. Property detail pages reference images by relative path.

## Key Conventions

- All content is in **Italian**
- Contact: WhatsApp `+39 3881051865`, phone `+39 3881051865`
- No JavaScript framework — interactions (carousels, date pickers, availability checks) are implemented with vanilla JS inline in each HTML file
- Individual property pages embed their own `<style>` blocks for page-specific CSS rather than extending `styles.css`
- The `strutture-1.html` page contains placeholder Airbnb links (`https://www.airbnb.it/rooms/...`) that need real URLs
