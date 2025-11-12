# FitMeal - 水+营养智能管家

A Progressive Web Application (PWA) for intelligent nutrition and hydration tracking with AI-powered meal suggestions, barcode scanning, and personalized fitness goals.

## Features

- 🎯 **Smart Nutrition Tracking** - Automated daily targets based on weight and fitness goals
- 📊 **Real-time Dashboard** - Visual progress tracking with circular charts
- 📷 **Barcode Scanning** - Quick food entry via camera with Open Food Facts fallback
- 🤖 **AI Suggestions** - Linear Programming-based optimal meal combinations
- 💧 **Water Tracking** - Interactive bottle animation with goal-based formulas
- ⏰ **Timeline Reminders** - Meal scheduling with countdown timers
- 🔬 **OCR Scanning** - AI-powered nutrition label extraction
- 📝 **Recipe Breakdown** - Parse ingredients with AI
- 💎 **Premium Subscription** - 7-day trial, $14.99/month via Stripe
- 🌐 **Multilingual** - 11 languages with machine translation

## Technology Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- TanStack React Query v5
- Wouter (routing)
- Framer Motion (animations)

### Backend
- Express.js + TypeScript
- PostgreSQL (Neon serverless)
- Drizzle ORM
- Session-based auth

### AI & External Services
- OpenAI GPT-4o (suggestions, OCR, recipes, i18n)
- Stripe (subscriptions)
- Open Food Facts API (barcode lookup)
- @zxing/library (barcode scanning)

## Setup Instructions

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd fitmeal
npm install
\`\`\`

### 2. Environment Variables

Copy the example environment file:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` and configure the following:

#### Required Environment Variables

**Database** (automatically configured on Replit):
\`\`\`
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=5432
PGUSER=...
PGPASSWORD=...
PGDATABASE=...
\`\`\`

**OpenAI API Key** (required for AI features):
\`\`\`
OPENAI_API_KEY=sk-your-api-key-here
\`\`\`

**Stripe** (required for PRO subscriptions):
\`\`\`
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
\`\`\`

**Session Secret**:
\`\`\`
SESSION_SECRET=your-random-secret-here
\`\`\`

### 3. How to Get API Keys

#### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with \`sk-\`)
6. Add to \`.env\`: \`OPENAI_API_KEY=sk-...\`

**On Replit:**
1. Open your Repl
2. Go to **Tools** → **Secrets** (lock icon in left sidebar)
3. Add secret: \`OPENAI_API_KEY\` = \`sk-...\`
4. Restart your Repl

**On Vercel:**
1. Go to your project dashboard
2. Click **Settings** → **Environment Variables**
3. Add \`OPENAI_API_KEY\` = \`sk-...\`
4. Redeploy

**On GitHub Actions:**
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: \`OPENAI_API_KEY\`, Value: \`sk-...\`

#### Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click **Developers** → **API Keys**
3. Copy **Publishable key** (starts with \`pk_test_\`)
4. Copy **Secret key** (starts with \`sk_test_\`)
5. Add both to \`.env\`

### 4. Database Setup

\`\`\`bash
# Push schema to database
npm run db:push
\`\`\`

The database will automatically create all required tables and seed initial data.

### 5. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

The app will be available at \`http://localhost:5000\`

## i18n (Internationalization)

### Supported Languages

- English (en) - Source language
- Simplified Chinese (zh-CN)
- Traditional Chinese (zh-TW)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Korean (ko)
- Brazilian Portuguese (pt-BR)
- Russian (ru)
- Arabic (ar)

### Translation Workflow

**Important:** Only maintain English translations in \`client/src/i18n/locales/en/*.json\`. All other languages are auto-generated.

#### 1. Add New Translation Keys

Edit \`client/src/i18n/locales/en/common.json\` (or create new JSON files):

\`\`\`json
{
  "welcome": "Welcome to FitMeal",
  "dashboard": {
    "title": "Dashboard",
    "subtitle": "Track your nutrition"
  }
}
\`\`\`

#### 2. Machine Translate to All Languages

\`\`\`bash
# Set your OpenAI API key first
export OPENAI_API_KEY=sk-...

# Run machine translation
tsx scripts/translate-locales.ts
\`\`\`

This will automatically:
- Detect new keys in English
- Translate them to all 10 target languages
- Preserve existing human-edited translations
- Use terminology glossary for consistency

#### 3. Check Translation Completeness

\`\`\`bash
tsx scripts/check-locales.ts
\`\`\`

This reports missing or extra keys across all locales.

### Security Rules for i18n Scripts

⚠️ **CRITICAL SECURITY REQUIREMENTS:**

1. Scripts ONLY read API key from \`process.env.OPENAI_API_KEY\`
2. Scripts exit with error if key is not set
3. Scripts NEVER print the API key value
4. All logs sanitize potential key fragments to \`****\`
5. Scripts are in \`/scripts\` directory (NOT bundled to frontend)
6. \`.env\` files are in \`.gitignore\`
7. Frontend code NEVER accesses \`OPENAI_API_KEY\`

### Using Translations in Code

\`\`\`tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.subtitle')}</p>
    </div>
  );
}
\`\`\`

## Project Structure

\`\`\`
fitmeal/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities
│   │   └── i18n/          # Internationalization
│   │       └── locales/   # Translation files
│   │           ├── en/    # English (SOURCE - maintain this)
│   │           ├── zh-CN/ # Auto-generated
│   │           └── ...    # Auto-generated
├── server/                # Backend Express app
│   ├── routes.ts         # API routes
│   └── storage.ts        # Database layer
├── shared/               # Shared types & utilities
│   ├── schema.ts        # Drizzle schema & types
│   └── utils.ts         # Shared utilities
├── scripts/             # Build & i18n scripts
│   ├── translate-locales.ts  # MT translation
│   └── check-locales.ts      # Translation checker
├── .env.example         # Environment template
└── README.md
\`\`\`

## Development Scripts

\`\`\`bash
npm run dev          # Start dev server (frontend + backend)
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Sync database schema

# i18n scripts (use tsx directly)
tsx scripts/translate-locales.ts  # Generate translations
tsx scripts/check-locales.ts      # Check completeness
\`\`\`

## Deployment

### Replit

1. Import repository to Replit
2. Set secrets in **Tools** → **Secrets**
3. Run button automatically starts the app

### Vercel

1. Import GitHub repository
2. Add environment variables in project settings
3. Deploy

## License

MIT

## Support

For issues or questions:
- Email: support@fitmeal.app
- Create an issue in this repository
