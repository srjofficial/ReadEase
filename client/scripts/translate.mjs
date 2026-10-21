import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.resolve(__dirname, '../src/locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');
const ML_PATH = path.join(LOCALES_DIR, 'ml.json');
const SRC_DIR = path.resolve(__dirname, '../src');

/**
 * Free Google Translate fallback (0 API key required)
 */
async function translateTextGoogle(text, targetLang = 'ml', sourceLang = 'en') {
  if (!text || !text.trim()) return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item) => item[0]).join('');
    }
    return text;
  } catch (err) {
    console.warn(`  [Warning] Failed to translate: "${text}". Error: ${err.message}`);
    return text; // fallback to English on network failure
  }
}

/**
 * Scan source directory recursively for t('key', 'fallback') calls
 */
function extractKeysFromCode(dir, extracted = {}) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        extractKeysFromCode(fullPath, extracted);
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Matches t('key.name', 'Fallback text') or t("key.name", "Fallback text")
      const regex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const [, key, fallback] = match;
        if (!extracted[key]) {
          extracted[key] = fallback;
        }
      }
    }
  }
  return extracted;
}

async function run() {
  console.log('🌐 ReadEase Option B: Automated i18n Translation Pipeline\n');

  if (!fs.existsSync(LOCALES_DIR)) {
    fs.mkdirSync(LOCALES_DIR, { recursive: true });
  }

  const enCatalog = fs.existsSync(EN_PATH)
    ? JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
    : {};
  const mlCatalog = fs.existsSync(ML_PATH)
    ? JSON.parse(fs.readFileSync(ML_PATH, 'utf8'))
    : {};

  console.log(`🔍 Scanning src/ for new translation keys...`);
  const codeExtracted = extractKeysFromCode(SRC_DIR);
  let newKeysCount = 0;

  for (const [key, fallback] of Object.entries(codeExtracted)) {
    if (!enCatalog[key]) {
      enCatalog[key] = fallback;
      newKeysCount++;
    }
  }

  if (newKeysCount > 0) {
    console.log(`✨ Found and added ${newKeysCount} new keys to en.json`);
  } else {
    console.log(`✅ All code keys are already cataloged in en.json`);
  }

  // Find missing translations in Malayalam
  const missingKeys = Object.keys(enCatalog).filter((key) => !mlCatalog[key] || !mlCatalog[key].trim());

  if (missingKeys.length === 0) {
    console.log(`\n🎉 All ${Object.keys(enCatalog).length} keys are already fully translated to Malayalam (ml.json)!`);
  } else {
    console.log(`\n🔄 Found ${missingKeys.length} untranslated strings for Malayalam. Translating in real-time...`);
    for (let i = 0; i < missingKeys.length; i++) {
      const key = missingKeys[i];
      const englishText = enCatalog[key];
      process.stdout.write(`  [${i + 1}/${missingKeys.length}] Translating "${key}"... `);

      const translated = await translateTextGoogle(englishText, 'ml', 'en');
      mlCatalog[key] = translated;
      console.log(`-> "${translated}"`);

      // Small delay to be polite to the translation endpoint
      await new Promise((r) => setTimeout(r, 100));
    }
    console.log(`\n✅ Completed translating ${missingKeys.length} keys to Malayalam!`);
  }

  // Save catalogs
  fs.writeFileSync(EN_PATH, JSON.stringify(enCatalog, null, 2) + '\n', 'utf8');
  fs.writeFileSync(ML_PATH, JSON.stringify(mlCatalog, null, 2) + '\n', 'utf8');

  console.log(`💾 Saved ${EN_PATH}`);
  console.log(`💾 Saved ${ML_PATH}`);
  console.log('\n🚀 Translations are ready and compiled for 0ms runtime rendering!\n');
}

run().catch((err) => {
  console.error('Fatal error during translation:', err);
  process.exit(1);
});
