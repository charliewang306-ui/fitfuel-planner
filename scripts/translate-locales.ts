#!/usr/bin/env tsx
/**
 * FitMeal i18n Machine Translation Script
 * 
 * Security Rules:
 * 1. ONLY reads OpenAI API key from process.env.OPENAI_API_KEY
 * 2. Exits with error if key is not set
 * 3. NEVER prints the key value
 * 4. All logs sanitize potential key fragments
 * 
 * Usage:
 *   OPENAI_API_KEY=sk-xxx npm run i18n:mt
 */

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// ========== SECURITY: API KEY VALIDATION ==========
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY environment variable is not set.');
  console.error('');
  console.error('Please set it before running this script:');
  console.error('  OPENAI_API_KEY=sk-xxx npm run i18n:mt');
  console.error('');
  console.error('For setup instructions, see README.md');
  process.exit(1);
}

// Sanitize logs - replace any potential key fragments
function sanitizeLog(text: string): string {
  return text.replace(/sk-[a-zA-Z0-9]{20,}/g, '****');
}

// ========== CONFIGURATION ==========
const SOURCE_LANG = 'en';
const SOURCE_DIR = path.join(process.cwd(), 'client/src/i18n/locales/en');
const LOCALES_DIR = path.join(process.cwd(), 'client/src/i18n/locales');

const TARGET_LANGS = [
  'zh-CN',  // Simplified Chinese
  'zh-TW',  // Traditional Chinese
  'es',     // Spanish
  'fr',     // French
  'de',     // German
  'ja',     // Japanese
  'ko',     // Korean
  'pt-BR',  // Brazilian Portuguese
  'ru',     // Russian
  'ar',     // Arabic
];

// Glossary for consistent terminology
const GLOSSARY: Record<string, Record<string, string>> = {
  'zh-CN': {
    'Protein': '蛋白质',
    'Fat': '脂肪',
    'Carbs': '碳水化合物',
    'Fiber': '纤维',
    'Water': '水',
    'Calories': '卡路里',
    'kcal': '千卡',
    'Macro': '宏量营养素',
    'Macros': '宏量营养素',
    'Protein Powder': '蛋白粉',
    'Whey': '乳清',
    'Plant': '植物',
    'Subscription': '订阅',
    'Trial': '试用',
    'PRO': 'PRO',
    'Dashboard': '看板',
    'Timeline': '时间线',
    'Settings': '设置',
    'Profile': '个人资料',
  },
  'zh-TW': {
    'Protein': '蛋白質',
    'Fat': '脂肪',
    'Carbs': '碳水化合物',
    'Fiber': '纖維',
    'Water': '水',
    'Calories': '卡路里',
    'kcal': '千卡',
    'Macro': '宏量營養素',
    'Macros': '宏量營養素',
    'Protein Powder': '蛋白粉',
    'Whey': '乳清',
    'Plant': '植物',
    'Subscription': '訂閱',
    'Trial': '試用',
    'PRO': 'PRO',
    'Dashboard': '看板',
    'Timeline': '時間線',
    'Settings': '設定',
    'Profile': '個人資料',
  },
};

// ========== OPENAI CLIENT ==========
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ========== HELPER FUNCTIONS ==========
function getAllJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).filter(f => f.endsWith('.json'));
}

function readJson(filePath: string): Record<string, any> {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn(`⚠️  Warning: Failed to parse ${filePath}, using empty object`);
    return {};
  }
}

function writeJson(filePath: string, data: Record<string, any>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function flattenKeys(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

function unflattenKeys(flat: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const glossary = GLOSSARY[targetLang] || {};
  const glossaryPrompt = Object.keys(glossary).length > 0
    ? `\n\nTerminology glossary (use these exact translations):\n${Object.entries(glossary).map(([k, v]) => `"${k}" → "${v}"`).join('\n')}`
    : '';

  const langName = {
    'zh-CN': 'Simplified Chinese',
    'zh-TW': 'Traditional Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'ko': 'Korean',
    'pt-BR': 'Brazilian Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
  }[targetLang] || targetLang;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for a nutrition tracking app. Translate the following UI text to ${langName}. Keep formatting placeholders like {variable} intact. Be concise and natural.${glossaryPrompt}`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
    });

    const translated = response.choices[0]?.message?.content?.trim() || text;
    return translated;
  } catch (error: any) {
    // Sanitize error messages before logging
    const errorMsg = sanitizeLog(error.message || String(error));
    console.error(`  ⚠️  Translation failed: ${errorMsg}`);
    return text; // Fallback to original text
  }
}

// ========== MAIN TRANSLATION LOGIC ==========
async function translateLocales() {
  console.log('🌍 FitMeal i18n Machine Translation');
  console.log('====================================\n');

  // Check source directory
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const sourceFiles = getAllJsonFiles(SOURCE_DIR);
  if (sourceFiles.length === 0) {
    console.error(`❌ No JSON files found in ${SOURCE_DIR}`);
    process.exit(1);
  }

  console.log(`📂 Source: ${SOURCE_DIR}`);
  console.log(`📄 Files: ${sourceFiles.join(', ')}\n`);

  let totalTranslated = 0;
  let totalSkipped = 0;

  for (const targetLang of TARGET_LANGS) {
    console.log(`\n🔄 Translating to ${targetLang}...`);
    const targetDir = path.join(LOCALES_DIR, targetLang);

    for (const filename of sourceFiles) {
      const sourceFile = path.join(SOURCE_DIR, filename);
      const targetFile = path.join(targetDir, filename);

      const sourceData = readJson(sourceFile);
      const targetData = readJson(targetFile);

      const sourceFlat = flattenKeys(sourceData);
      const targetFlat = flattenKeys(targetData);

      let translatedCount = 0;
      let skippedCount = 0;

      for (const [key, sourceValue] of Object.entries(sourceFlat)) {
        if (targetFlat[key] && targetFlat[key] !== sourceValue) {
          // Already translated and different from source - keep it
          skippedCount++;
          continue;
        }

        // Translate missing or identical keys
        console.log(`  📝 ${key}...`);
        const translated = await translateText(sourceValue, targetLang);
        targetFlat[key] = translated;
        translatedCount++;

        // Rate limiting - avoid hitting API too fast
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Write back
      const updatedData = unflattenKeys(targetFlat);
      writeJson(targetFile, updatedData);

      console.log(`  ✅ ${filename}: ${translatedCount} translated, ${skippedCount} kept`);
      totalTranslated += translatedCount;
      totalSkipped += skippedCount;
    }
  }

  console.log('\n====================================');
  console.log(`✨ Translation complete!`);
  console.log(`   Translated: ${totalTranslated} keys`);
  console.log(`   Kept: ${totalSkipped} keys`);
  console.log('====================================\n');
}

// ========== RUN ==========
translateLocales().catch((error) => {
  const sanitized = sanitizeLog(String(error));
  console.error('\n❌ Fatal error:', sanitized);
  process.exit(1);
});
