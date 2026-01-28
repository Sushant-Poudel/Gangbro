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

## Core Requirements (All Implemented)
- [x] Homepage with customer reviews section at top
- [x] "Check All Reviews" button linking to Trustpilot
- [x] Product grid with square (1:1) images
- [x] Category filtering
- [x] Product pages with multiple variations (plans, duration)
- [x] "Order Now via WhatsApp" button with pre-filled message
- [x] JWT authentication for admin (hardcoded: gsnadmin/gsnadmin)
- [x] Admin dashboard with stats
- [x] Admin product management (CRUD with variations, tags, ordering)
- [x] Admin review management (CRUD with custom dates)
- [x] Admin category management (create custom categories)
- [x] Admin FAQ management (CRUD with ordering)
- [x] Admin page management (About, Terms with HTML editor)
- [x] Admin social links management
- [x] Image upload from device (not URL-based)
- [x] Pitch black background with gold (#F5A623) accent colors
- [x] Responsive design for mobile
- [x] Terms and Conditions page
- [x] Product tags (Popular, Sale, New, Limited, Hot, Best Seller)
- [x] Product ordering/reordering

## What's Been Implemented (January 28, 2025)

### Latest Session
- **Product ordering**: Products can be reordered in admin panel using up/down arrows
- **Product tags**: Admin can add tags like "Popular", "Sale", "New" etc. to products
- **FAQ Management**: Full CRUD for FAQs with ordering capability in admin panel
- **Terms & Conditions page**: New /terms route with editable content via admin Pages
- **Social media icons fixed**: Icons now properly display based on platform name (includes Discord)
- **Removed Contact page**: Route and links removed as per user request
- **Removed Admin button**: Hidden from public navigation

### Backend (FastAPI + MongoDB)
- User authentication (JWT with fixed credentials: gsnadmin/gsnadmin)
- Products API with variations, tags, and sort_order
- Categories API  
- Reviews API with custom date support
- FAQs API with CRUD and reordering
- Pages API (about, terms)
- Social Links API
- Image upload API with local file storage

### Frontend (React)
- Homepage with reviews and product grid
- Product detail page with variation selection
- WhatsApp integration for ordering
- About, FAQ, Terms pages
- Admin panel with full CRUD for: Products, Categories, Reviews, FAQs, Pages, Social Links
- Mobile-responsive admin panel

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn/UI
- Backend: FastAPI, MongoDB
- Auth: JWT-based (hardcoded credentials)

## Admin Credentials
- **URL**: /admin/login
- **Username**: gsnadmin
- **Password**: gsnadmin

## API Endpoints
- `POST /api/auth/login` - Admin login
- `GET/POST/PUT/DELETE /api/products` - Product management
- `PUT /api/products/reorder` - Reorder products
- `GET/POST/PUT/DELETE /api/categories` - Category management
- `GET/POST/PUT/DELETE /api/reviews` - Review management
- `GET/POST/PUT/DELETE /api/faqs` - FAQ management
- `PUT /api/faqs/reorder` - Reorder FAQs
- `GET/PUT /api/pages/{page_key}` - Page content (about, terms)
- `GET/POST/PUT/DELETE /api/social-links` - Social link management
- `POST /api/upload` - Image upload

## Prioritized Backlog

### P0 (Critical) - ALL DONE
- All core e-commerce functionality implemented
- Admin panel complete with all features

### P1 (Important)
- [ ] Search functionality for products
- [ ] Product stock/sold-out management improvements

### P2 (Nice to have)
- [ ] Flash sales/countdown timer
- [ ] Combo deals section
- [ ] Recent purchases ticker (social proof)
- [ ] Email notifications
- [ ] Analytics dashboard

## Next Tasks
1. Add product search functionality on homepage
2. Add flash sale/promotional banners
3. Consider adding recent purchases ticker for social proof
