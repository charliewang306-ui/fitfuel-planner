#!/usr/bin/env tsx
/**
 * FitMeal i18n Locale Checker
 * 
 * Checks for missing translation keys across all locales
 * and generates a report.
 * 
 * Usage:
 *   npm run i18n:check
 */

import fs from 'fs';
import path from 'path';

const SOURCE_LANG = 'en';
const LOCALES_DIR = path.join(process.cwd(), 'client/src/i18n/locales');
const SOURCE_DIR = path.join(LOCALES_DIR, SOURCE_LANG);

const TARGET_LANGS = [
  'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ja', 'ko', 'pt-BR', 'ru', 'ar'
];

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
  } catch {
    return {};
  }
}

function flattenKeys(obj: Record<string, any>, prefix = ''): Set<string> {
  const result = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value, fullKey).forEach(k => result.add(k));
    } else {
      result.add(fullKey);
    }
  }
  return result;
}

function checkLocales() {
  console.log('🔍 FitMeal i18n Locale Check');
  console.log('============================\n');

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const sourceFiles = getAllJsonFiles(SOURCE_DIR);
  if (sourceFiles.length === 0) {
    console.error(`❌ No JSON files found in ${SOURCE_DIR}`);
    process.exit(1);
  }

  let hasErrors = false;

  for (const filename of sourceFiles) {
    console.log(`\n📄 ${filename}`);
    const sourceFile = path.join(SOURCE_DIR, filename);
    const sourceKeys = flattenKeys(readJson(sourceFile));

    console.log(`  Source (${SOURCE_LANG}): ${sourceKeys.size} keys`);

    for (const targetLang of TARGET_LANGS) {
      const targetFile = path.join(LOCALES_DIR, targetLang, filename);
      const targetKeys = flattenKeys(readJson(targetFile));

      const missing = Array.from(sourceKeys).filter(k => !targetKeys.has(k));
      const extra = Array.from(targetKeys).filter(k => !sourceKeys.has(k));

      if (missing.length > 0 || extra.length > 0) {
        hasErrors = true;
        console.log(`\n  ⚠️  ${targetLang}:`);
        if (missing.length > 0) {
          console.log(`    Missing ${missing.length} keys:`);
          missing.forEach(k => console.log(`      - ${k}`));
        }
        if (extra.length > 0) {
          console.log(`    Extra ${extra.length} keys (not in source):`);
          extra.forEach(k => console.log(`      + ${k}`));
        }
      } else {
        console.log(`  ✅ ${targetLang}: ${targetKeys.size} keys (complete)`);
      }
    }
  }

  console.log('\n============================');
  if (hasErrors) {
    console.log('⚠️  Some locales have missing or extra keys.');
    console.log('   Run "npm run i18n:mt" to sync translations.');
    process.exit(1);
  } else {
    console.log('✅ All locales are complete!');
  }
}

checkLocales();
