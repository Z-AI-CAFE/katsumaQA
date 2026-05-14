/**
 * build.js - SEO対応ビルドスクリプト
 *
 * 月次更新手順:
 *   data.js を更新して git push するだけ。
 *   Netlify が自動的にこのスクリプトを実行してデプロイします。
 */

const fs   = require('fs');
const path = require('path');

const SITE_URL = 'https://benevolent-blini-453251.netlify.app';

// ── data.js を読み込んで QA_DATA / ALL_TAGS を取得 ──────────────────
const dataContent = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
// eslint-disable-next-line no-new-func
const loadData = new Function(dataContent + '\n; return { QA_DATA, ALL_TAGS };');
const { QA_DATA, ALL_TAGS } = loadData();

if (!QA_DATA || !Array.isArray(QA_DATA)) {
  console.error('ERROR: QA_DATA が見つかりません。data.js の形式を確認してください。');
  process.exit(1);
}

console.log('データ読み込み完了: ' + QA_DATA.length + ' 件');

// ── ヘルパー関数 ──────────────────────────────────────────────────────
function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ytUrl(videoId, seconds) {
  return 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId) + '&t=' + seconds + 's';
}

// ── 静的Q&AカードHTML生成 ─────────────────────────────────────────────
function generateStaticCards(data) {
  var html = '';
  var currentMonth = null;
  var ytIcon = '<svg class="yt-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>';

  data.forEach(function(d) {
    var monthKey = d.year + '_' + String(d.month).padStart(2, '0');
    if (monthKey !== currentMonth) {
      currentMonth = monthKey;
      html += '\n<div class="month-group-header">' + escHtml(d.monthLabel) + '</div>\n';
    }
    html += '<div class="qa-card">'
      + '<div class="card-meta">'
        + '<span class="q-num">Q' + d.qNum + '</span>'
        + '<span class="month-badge">' + escHtml(d.monthLabel) + '</span>'
        + '<span class="name-badge">' + escHtml(d.name) + '</span>'
        + '<span class="tag-badge">' + escHtml(d.tag) + '</span>'
      + '</div>'
      + '<div class="q-section">'
        + '<div class="q-label">Q</div>'
        + '<div class="q-text">' + escHtml(d.question) + '</div>'
      + '</div>'
      + '<div class="a-section">'
        + '<div class="a-label">A</div>'
        + '<div class="a-text">' + escHtml(d.answer) + '</div>'
      + '</div>'
      + '<div class="card-footer">'
        + '<a class="yt-link" href="' + ytUrl(d.videoId, d.seconds) + '" target="_blank" rel="noopener">'
          + ytIcon + escHtml(d.timestamp) + ' から見る'
        + '</a>'
      + '</div>'
    + '</div>';
  });
  return html;
}

// ── JSON-LD (FAQPage) 構造化データ生成 ───────────────────────────────
function generateJsonLd(data) {
  var items = data.slice(0, 30).map(function(d) {
    return {
      '@type': 'Question',
      'name': d.question,
      'acceptedAnswer': { '@type': 'Answer', 'text': d.answer }
    };
  });
  var schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': items
  };
  return '<script type="application/ld+json">\n' + JSON.stringify(schema, null, 2) + '\n<\/script>';
}

// ── sitemap.xml 生成 ─────────────────────────────────────────────────
function generateSitemap(today) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + '  <url>\n'
    + '    <loc>' + SITE_URL + '/</loc>\n'
    + '    <lastmod>' + today + '</lastmod>\n'
    + '    <changefreq>monthly</changefreq>\n'
    + '    <priority>1.0</priority>\n'
    + '  </url>\n'
    + '</urlset>\n';
}

// ── robots.txt 生成 ───────────────────────────────────────────────────
function generateRobots() {
  return 'User-agent: *\n'
    + 'Allow: /\n'
    + 'Sitemap: ' + SITE_URL + '/sitemap.xml\n';
}

// ── index.html を読み込んでプレースホルダーを置換 ────────────────────
var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

html = html.replace('<!-- JSON_LD_PLACEHOLDER -->', generateJsonLd(QA_DATA));

html = html.replace(
  '<div class="qa-list" id="qa-list"></div>',
  '<div class="qa-list" id="qa-list">' + generateStaticCards(QA_DATA) + '\n</div>'
);

// ── dist/ に出力 ──────────────────────────────────────────────────────
var today   = new Date().toISOString().slice(0, 10);
var distDir = path.join(__dirname, 'dist');

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'),  html,                   'utf8');
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), generateSitemap(today), 'utf8');
fs.writeFileSync(path.join(distDir, 'robots.txt'),  generateRobots(),       'utf8');
fs.copyFileSync( path.join(__dirname, 'data.js'),   path.join(distDir, 'data.js'));

console.log('BUILD COMPLETE: dist/index.html (' + QA_DATA.length + ' Q&A items)');
console.log('sitemap.xml lastmod: ' + today);
