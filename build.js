/**
 * build.js - SEO対応ビルドスクリプト
 *
 * 月次更新手順:
 *   data.js を更新して git push するだけ。
 *   GitHub Actions が自動的にこのスクリプトを実行してデプロイします。
 */

const fs   = require('fs');
const path = require('path');

const SITE_URL = 'https://z-ai-cafe.github.io/katsumaQA';
const CH_NAME  = '勝間和代が徹底的にマニアックな話をするYouTube';
const CH_URL   = 'https://www.youtube.com/channel/UCWoiNwdr7EEjgs2waxe_QpA';

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

function ytEmbedUrl(videoId, seconds) {
  return 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?start=' + seconds + '&rel=0';
}

// ── 静的Q&AカードHTML生成 ─────────────────────────────────────────────
function generateStaticCards(data) {
  var html = '';
  var currentMonth = null;

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
        + '<div class="yt-source">出典: <a href="' + CH_URL + '" target="_blank" rel="noopener">' + CH_NAME + '</a></div>'
        + '<div class="yt-actions">'
          + '<button class="yt-embed-btn" onclick="toggleEmbed(this,\'' + escHtml(d.videoId) + '\',' + d.seconds + ',\'' + escHtml(d.timestamp) + '\')">'
          + '&#9654; ' + escHtml(d.timestamp) + ' から再生'
          + '</button>'
        + '</div>'
        + '<div class="yt-embed-wrap" style="display:none;"></div>'
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

// ── OGP画像 SVG テンプレート ─────────────────────────────────────────
function generateOgpSvg() {
  return '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">'
    // 背景
    + '<rect width="1200" height="630" fill="#1a2744"/>'
    // 左アクセントライン
    + '<rect x="0" y="0" width="10" height="630" fill="#2563eb"/>'
    // タイトルエリア背景
    + '<rect x="60" y="60" width="1080" height="510" rx="16" fill="#ffffff" fill-opacity="0.04"/>'
    // 大タイトル 1行目
    + '<text x="100" y="210"'
    + ' font-family="Noto Sans JP,Hiragino Sans,Yu Gothic,Meiryo,sans-serif"'
    + ' font-size="76" font-weight="bold" fill="#ffffff">'
    + '&#21202;&#38291;&#22563; &#20844;&#38283;&#36074;&#21839;&#12521;&#12452;&#12502;</text>'
    // 大タイトル 2行目（アクセントカラー）
    + '<text x="100" y="310"'
    + ' font-family="Noto Sans JP,Hiragino Sans,Yu Gothic,Meiryo,sans-serif"'
    + ' font-size="76" font-weight="bold" fill="#60a5fa">'
    + 'Q&amp;A&#12450;&#12540;&#12459;&#12452;&#12502;</text>'
    // 説明文
    + '<text x="100" y="410"'
    + ' font-family="Noto Sans JP,Hiragino Sans,Yu Gothic,Meiryo,sans-serif"'
    + ' font-size="34" fill="#94a3b8">'
    + '&#20844;&#38283;&#12521;&#12452;&#12502;&#12391;&#12398;&#36074;&#21839;&#12392;&#22238;&#31572;&#12398;&#35201;&#32204;&#12539;&#12479;&#12452;&#12512;&#12473;&#12479;&#12531;&#12503;&#20184;&#12365;&#12450;&#12540;&#12459;&#12452;&#12502;</text>'
    // 区切り線
    + '<line x1="100" y1="470" x2="1100" y2="470" stroke="#334155" stroke-width="1"/>'
    // チャンネル名
    + '<text x="100" y="560"'
    + ' font-family="Noto Sans JP,Hiragino Sans,Yu Gothic,Meiryo,sans-serif"'
    + ' font-size="26" fill="#64748b">'
    + '&#21202;&#38291;&#21644;&#20195;&#12364;&#24449;&#24213;&#30340;&#12395;&#12510;&#12491;&#12450;&#12483;&#12463;&#12394;&#35441;&#12434;&#12377;&#12427;YouTube</text>'
    + '</svg>';
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

// ── OGP画像 (ogp.png) 生成 ───────────────────────────────────────────
try {
  var sharp = require('sharp');
  var svgBuffer = Buffer.from(generateOgpSvg());
  sharp(svgBuffer)
    .png()
    .toFile(path.join(distDir, 'ogp.png'), function(err) {
      if (err) {
        console.error('OGP画像生成エラー: ' + err.message);
      } else {
        console.log('ogp.png 生成完了');
      }
    });
} catch (e) {
  console.warn('sharp が見つかりません。npm ci を実行してください: ' + e.message);
}

console.log('BUILD COMPLETE: dist/index.html (' + QA_DATA.length + ' Q&A items)');
console.log('sitemap.xml lastmod: ' + today);
