# FitFuel Planner - 水+营养智能管家

## Overview

FitFuel Planner is a Progressive Web Application (PWA) designed to help users manage their daily nutrition and hydration. It calculates personalized daily nutritional targets, tracks food and water intake, and provides AI-powered suggestions. The vision is to provide an intelligent, comprehensive, and user-friendly tool to empower individuals in achieving their health and fitness goals.

**Key Capabilities:**
- **Supabase OAuth Authentication:** Apple and Google login with automatic language detection and secure session management.
- Automated daily nutrition target calculation and real-time progress tracking.
- AI Meal Planner: Personalized 3-meal daily plans with one-click logging.
- AI Coach: Conversational nutrition guidance with dual-path evening strategy.
- AI Snack Suggestions: Goal-specific snack recommendations with barcode scanning fallback.
- Barcode and OCR scanning for quick food entry.
- Protein Powder Preset System: Multi-brand preset management.
- Linear Programming-based meal optimization.
- Multi-unit and multi-language support (12 languages).
- **Multilingual Food Names:** Food items support dynamic language switching with AI-powered translations in all 12 supported languages. Food names automatically update when users change language preferences.
- **Complete Localization System:** All UI content including login page, food logs, AI Meal Plan, and all app pages dynamically adapt to user's language selection with real-time updates.
- Meal planning with shopping list generation and user food contribution.
- Automated AI Reminders and PWA support with offline capabilities.
- Admin Panel for user, subscription, and AI usage monitoring.
- Enhanced water tracking with dynamic guidance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework & Build System:** React 18 with TypeScript, Vite, and Wouter.
- **UI Framework:** shadcn/ui, Tailwind CSS, Framer Motion for animations. Mobile-first responsive design following Material Design principles.
- **Authentication:** Supabase OAuth with Apple and Google providers. Login page features noise texture background, dual-language support, and graceful configuration error handling.
- **Internationalization:** i18next with browser language detection, localStorage preference caching, and 12-language support (zh-CN, zh-TW, en, es, pt, hi, ar, fr, de, ja, ko, ru). All pages including login dynamically adapt to user language with automatic RTL support for Arabic.
- **State Management:** TanStack React Query for server state; local React state for UI; localStorage for onboarding and language preferences.
- **Dashboard Design:** 5-section layout including Today Summary, Today's Nutrition, Quick Actions, Weekly Trends, and Reference & Formula.
- **Admin Pages:** Dedicated dashboards for user management, subscriptions, AI usage, and audit logs with role-based access control.
- **Input System:** 3-level input system for recipe breakdown (smart quick-add buttons, visual slider, manual input).
- **Date Rollover:** Device-local timezone-aware date rollover system.
- **Meal Scheduling:** Sleep-aware system adhering to user-defined eating windows.
- **Streak Tracking:** Daily check-in system with configurable criteria.

### Backend Architecture

- **Server Framework:** Express.js with TypeScript, following RESTful API design.
- **API Endpoints:** Manages user profiles, daily targets, food/water logs, food database, barcode lookups, AI suggestions, daily summaries, meal plans, reminders, weight tracking, OCR, recipe breakdowns, and USDA integration. Includes AI endpoints with usage limits and admin APIs.
- **Business Logic:** Daily target calculation engine using scientific formulas (e.g., Mifflin-St Jeor). Nutritional calculations normalized to per-100g and unit conversion utilities. Dynamic water intake guidance.
- **Admin Infrastructure:** `requireAdmin()` middleware and `recordAudit()` for logging.
- **OAuth Token Monitoring:** Automated JWT expiry tracking system for Apple/Google OAuth. Daily scheduler checks token status and sends warnings at 30-day and 7-day thresholds. Admin dashboard displays color-coded alerts (green/yellow/orange/red) based on days remaining. API endpoint `/api/system/integration-tokens` provides real-time status.
- **Subscription System:** Single-tier model with Stripe Checkout integration and webhook handling.

### Data Storage

- **Database:** PostgreSQL (via Neon serverless driver) with Drizzle ORM.
- **Schema Design:** Includes `user_profiles`, `daily_targets`, `food_items`, `food_barcodes`, `food_logs`, `water_logs`, `checkin_weights`, `reminders`, `meal_plans`, `meal_plan_items`, `protein_powder_presets`, `ai_meal_plans`, `ai_coach_sessions`, `integration_tokens`, and `audit_log`.
- **Data Normalization:** Food items store nutrition per 100g; timestamps in UTC, dates in YYYY-MM-DD.
- **Protein Powder Presets:** User-scoped presets storing per-scoop nutrition.
- **Multilingual Food Names:** `food_items` table includes `names` JSONB field storing translations for all 12 languages (zh-CN, zh-TW, en, es, pt, hi, ar, fr, de, ja, ko, ru). API endpoints `/api/foods/search?lang=XX` and `/api/foodlogs/today?lang=XX` return localized food names. AI-powered translation function (`translateFoodName`) generates culturally appropriate names. Admin endpoint `/api/admin/translate-foods` enables batch translation. Cross-language search enabled via JSONB field casting in `searchFoodItems()`.
- **Dynamic Localization System:** Frontend automatically refetches with new language when user changes preferences via React Query's language-keyed query mechanism. All UI components (including MacroBar, Timeline, AIMealPlan) use i18n translations with no hardcoded strings. AI Meal Plan endpoint (`/api/ai/meal-plan/list/:date?lang=XX`) localizes both food names (via database JSONB mapping) and meal titles (via OpenAI translation helper `translateText()`). Fallback values use English as baseline with graceful error handling.

### PWA Capabilities

- Service worker registration for offline support.
- Web App Manifest for installability.
- Mobile-optimized viewport and standalone display mode.

### Native iOS App Support

- **Capacitor Integration**: Project configured with Capacitor 7 for iOS app wrapper.
- **App Configuration**: 
  - App ID: `com.shapelyeat.app`
  - App Name: `FitFuel Planner`
  - Web directory: `dist` (Vite build output)
- **iOS Platform**: Native Xcode project created in `ios/` directory.
- **Build Process**: Web app can be packaged as native iOS app for App Store distribution.
- **Documentation**: Complete iOS build guide available in `iOS_BUILD_GUIDE.md`.
- **App Store Compliance**: 
  - Platform detection via `isIOSApp()` from `@/lib/platform`
  - Stripe payment UI hidden in iOS builds to comply with App Store guidelines
  - iOS users see "Unlock Premium" and "Restore Purchases" buttons instead
  - Web/Android users continue to use Stripe Checkout flow

## External Dependencies

- **Authentication:** Supabase (@supabase/supabase-js) for OAuth authentication with Apple and Google providers. Requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_REDIRECT_URL` environment variables.
- **AI Integration:** OpenAI API (GPT-4o) for AI Meal Planner, AI Coach (Nutrition Commander, Workout Cycle Coach, Mindset Coach with conversation memory and strict module boundaries), nutrition suggestions, snack recommendations, OCR, and recipe breakdown. AI coach enhances sports nutrition expertise, time calculation, and context-aware recommendations. AI snack suggestions are streamlined to provide two goal-specific options.
- **AI Quota Management:** Real-time quota tracking with `/api/ai/coach/quota` endpoint showing remaining conversations. Frontend displays color-coded quota badges (green/yellow/red) and provides friendly error messages with reset countdown when quota is exceeded. System warns users when approaching limit (≤3 remaining).
- **Internationalization:** i18next and i18next-browser-languagedetector for automatic language detection and multi-language support.
- **Linear Programming Optimization:** `javascript-lp-solver`.
- **Barcode Scanning:** `@zxing/library` with Open Food Facts API fallback.
- **USDA FoodData Central Integration:** Direct integration for comprehensive food database access.
- **Database Hosting:** Neon serverless PostgreSQL (`@neondatabase/serverless`).
- **Font Hosting:** Google Fonts CDN (Inter, JetBrains Mono).
- **Session Management:** `connect-pg-simple` for PostgreSQL-backed sessions.
- **Payment Processing:** Stripe for subscription management.