// حل مشكلة require في ES modules
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

global.require = createRequire(import.meta.url);
global.__filename = fileURLToPath(import.meta.url);
global.__dirname = dirname(global.__filename);

// تحميل الإعدادات
await import('./settings.js');

// تشغيل البوت الرئيسي
await import('./index.js');
