# التحول التجاري عبر الهاتف المحمول — ورشة تفاعلية مباشرة

الملف النهائي: **`index.html`** — ملف HTML واحد قائم بذاته (Vanilla JS) مربوط بـ Firebase Realtime Database:
`https://mobile-d6aea-default-rtdb.firebaseio.com/`

## النشر
- ارفع `index.html` كما هو إلى أي استضافة ملفات ثابتة (مثل Netlify Drop).
- في Google Sites استخدم **Embed → By URL** (رابط الصفحة المنشورة)، لا Embed Code.
- لا تنشره كـ Artifact على Claude.ai؛ تلك الصفحات تمنع الاتصال بـ Firebase.

## قواعد قاعدة البيانات
التطبيق يعمل بلا تسجيل دخول Firebase، لذا يجب أن تسمح القواعد بالقراءة والكتابة. في Firebase Console ← Realtime Database ← Rules:

```json
{ "rules": { ".read": true, ".write": true } }
```

## المعاينة دون لمس البيانات الحقيقية
أضف `?demo=1` إلى الرابط (مثال: `index.html?demo=1`) ليعمل الموقع بقاعدة محاكاة محلية داخل المتصفح.

## لوحة الإدارة
زر الترس ⚙️ أعلى الصفحة ← الرمز السري: `3719`.

## تعديل المصدر (للمطوّر)
- المحتوى العلمي: `src/content/*.txt` (صيغة نصية بسيطة: شرائح، تمارين، رسوم بيانية).
- الواجهة والمنطق: `src/styles.css` و`src/js/*.js`.
- إعادة البناء: `node src/build.js` ← يُنتج `index.html`.
