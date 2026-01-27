# GameShop Nepal - Product Requirements Document

## Original Problem Statement
Build a premium e-commerce website similar to gameshopnepal.com/ottsathi.com for selling digital products (gaming subscriptions, OTT services, software licenses, top-ups) in Nepal with:
- Homepage with customer reviews at top with Trustpilot link
- Product grid with square images and category filtering
- Product pages with variations and WhatsApp ordering
- Full-featured admin panel for content management
- Pitch black background with gold accent theme

## User Personas
1. **Customers**: Nepali gamers and digital product buyers looking for gaming subscriptions, OTT services, software licenses without international payment cards
2. **Admin**: Store owner managing products, reviews, pages, and social links

## Core Requirements (Implemented)
- [x] Homepage with customer reviews section at top
- [x] "Check All Reviews" button linking to Trustpilot
- [x] Product grid with square (1:1) images
- [x] Category filtering (Gaming, OTT, Software, AI Tools, Top-ups)
- [x] Product pages with multiple variations (plans, duration)
- [x] "Order Now via WhatsApp" button with pre-filled message
- [x] JWT email/password authentication for admin
- [x] Admin dashboard with stats
- [x] Admin product management (CRUD with variations)
- [x] Admin review management (CRUD with custom dates)
- [x] Admin page management (About/Contact/FAQ with HTML editor)
- [x] Admin social links management
- [x] Pitch black background with gold (#F5A623) accent colors
- [x] Responsive design for mobile

## What's Been Implemented (January 27, 2025)

### Backend (FastAPI + MongoDB)
- User authentication (register/login with JWT)
- Products API with variations support
- Categories API  
- Reviews API with custom date support
- Pages API (about, contact, faq)
- Social Links API
- Seed data with 12 products across 5 categories

### Frontend (React)
- Homepage with reviews, trust badges, product grid
- Product detail page with variation selection
- WhatsApp integration for ordering
- About, Contact, FAQ pages
- Admin panel with full CRUD for all entities
- Rajdhani + Outfit fonts (gaming/premium aesthetic)

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn/UI
- Backend: FastAPI, MongoDB
- Auth: JWT-based

## Prioritized Backlog

### P0 (Critical) - DONE
- All core e-commerce functionality implemented

### P1 (Important)
- [ ] Image upload for products (currently URL-based)
- [ ] Search functionality for products
- [ ] Sold-out product management
- [ ] Order history/tracking (if needed)

### P2 (Nice to have)
- [ ] Flash sales/countdown timer
- [ ] Combo deals section
- [ ] Email notifications
- [ ] Analytics dashboard

## Next Tasks
1. Add image upload capability for products
2. Implement product search functionality
3. Add flash sale/promotional banners
