// 配信用ビルド: ソースを dist/ にコピーし、JS/CSS を同名のまま minify する。
// index.html / sw.js の参照パスは変えないため、ソースは未圧縮のまま開発でき、
// 配信物だけが圧縮される。GitHub Actions から実行される想定。
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

// 配信に含めるトップレベルのファイル / ディレクトリ
const INCLUDE_FILES = ['index.html', 'manifest.json', 'sw.js', 'browserconfig.xml', 'favicon.ico', 'app_icon.png'];
const INCLUDE_DIRS = ['css', 'js', 'icons', 'static'];

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
function listFiles(dir, ext) {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (p.endsWith(ext)) out.push(p);
    }
  })(dir);
  return out;
}
const kb = n => (n / 1024).toFixed(0) + 'KB';

async function main() {
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of INCLUDE_FILES) {
    const s = path.join(ROOT, f);
    if (fs.existsSync(s)) fs.copyFileSync(s, path.join(OUT, f));
  }
  for (const d of INCLUDE_DIRS) {
    const s = path.join(ROOT, d);
    if (fs.existsSync(s)) copyDir(s, path.join(OUT, d));
  }
  // GitHub Pages が Jekyll 処理しないように
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  // --- JS minify (同名・複数ファイルを個別に。toplevel は触らずグローバル共有を維持) ---
  let jsB = 0, jsA = 0;
  for (const f of listFiles(path.join(OUT, 'js'), '.js')) {
    const code = fs.readFileSync(f, 'utf8'); jsB += Buffer.byteLength(code);
    const res = await minify(code, {
      compress: { toplevel: false },
      mangle: { toplevel: false },
      format: { comments: false }
    });
    if (res.error) throw res.error;
    fs.writeFileSync(f, res.code, 'utf8'); jsA += Buffer.byteLength(res.code);
  }
  // --- CSS minify (同名) ---
  let cssB = 0, cssA = 0;
  for (const f of listFiles(path.join(OUT, 'css'), '.css')) {
    const css = fs.readFileSync(f, 'utf8'); cssB += Buffer.byteLength(css);
    const r = new CleanCSS({ level: 2 }).minify(css);
    if (r.errors && r.errors.length) throw new Error(r.errors.join('\n'));
    fs.writeFileSync(f, r.styles, 'utf8'); cssA += Buffer.byteLength(r.styles);
  }
  console.log(`JS : ${kb(jsB)} -> ${kb(jsA)} (${(100 - jsA / jsB * 100).toFixed(0)}% 削減)`);
  console.log(`CSS: ${kb(cssB)} -> ${kb(cssA)} (${(100 - cssA / cssB * 100).toFixed(0)}% 削減)`);
  console.log('dist/ build complete');
}
main().catch(e => { console.error(e); process.exit(1); });
