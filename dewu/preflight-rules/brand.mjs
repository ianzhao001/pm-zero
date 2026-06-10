import { lineOf, matches, push } from '../../../system/shared/context-package-core/preflight-core/engine.mjs';

const BOTTOM_TABS = ['得物', '购买', '探索', '我'];

function classWindows(ctx, className, size = 1400) {
  const re = new RegExp(`class\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["']`, 'gi');
  return matches(ctx.html, re).map(match => ({
    index: match.index,
    before: ctx.html.slice(Math.max(0, match.index - 240), match.index),
    after: ctx.html.slice(match.index, match.index + size),
    text: ctx.html.slice(Math.max(0, match.index - 240), match.index + size),
  }));
}

function hasAll(text, names) {
  return names.every(name => text.indexOf(name) >= 0);
}

function stripTags(text) {
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[`"'{}()[\];:,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function topTabItems(text) {
  const items = [];
  const re = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
  for (const match of matches(text, re)) {
    items.push({
      attrs: match[1],
      label: stripTags(match[2]),
    });
  }
  return items;
}

function cssRulesForClass(ctx, className) {
  const re = new RegExp(`\\.${className}\\b[^{}]*\\{[^{}]*\\}`, 'gis');
  return matches(ctx.html, re).map(match => ({
    index: match.index,
    text: match[0],
  }));
}

function cssNumber(rule, prop) {
  const re = new RegExp(`${prop}\\s*:\\s*([0-9.]+)px`, 'i');
  const match = re.exec(rule);
  return match ? Number(match[1]) : null;
}

function hasScreenshotEvidenceV4(ctx) {
  return /DEWU_SCREENSHOT_EVIDENCE_V4|DEWU_SCREENSHOT_EVIDENCE_V8|data-evidence\s*=\s*["']dewu-screenshot-v[48]/i.test(ctx.html);
}

function hasScreenshotEvidenceV8(ctx) {
  return /DEWU_SCREENSHOT_EVIDENCE_V8|data-evidence\s*=\s*["']dewu-screenshot-v8/i.test(ctx.html);
}

function hasPxInRange(rule, prop, min, max) {
  const value = cssNumber(rule, prop);
  return value !== null && value >= min && value <= max;
}

const PROFILE_NICKNAME_POOL = [
  '道u_5dbd337a7a...',
  '道u_5dbd337a7a…',
  'LIANG李昂',
  'Jp_莹清',
  '真子美妆工具',
  '汽水味的笑笑',
  'jjjjia1',
  '曹植牙',
  'MAO的名字',
  '寒汐熵',
  'sbzesmsjh',
  '得物小懂王',
  '暴走黄龙虾4th',
  '一朵熊a',
  '护鸟痴汉',
];

function checkB01Signature(ctx) {
  const count = matches(ctx.html, /@ianzhao/g).length;
  if (count < 1) push(ctx.errors, 'B01', '缺少 @ianzhao 签名', 1);
}

function checkB02BottomTabs(ctx) {
  const windows = classWindows(ctx, 'tabbar');
  for (const window of windows) {
    const source = hasAll(window.after, BOTTOM_TABS) ? window.after : window.text;
    const idx = BOTTOM_TABS.map(name => source.indexOf(name));
    if (idx.every(value => value >= 0) && !(idx[0] < idx[1] && idx[1] < idx[2] && idx[2] < idx[3])) {
      push(ctx.errors, 'B02', '底部 Tab 顺序必须为 得物 / 购买 / 探索 / 我', lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB03TopTabs(ctx) {
  const fixedOrder = ['推荐', '极光街', '灵感', '关注', '穿搭'];
  const windows = classWindows(ctx, 'top-tabs');
  for (const window of windows) {
    const text = window.after;
    const present = fixedOrder.filter(name => text.indexOf(name) >= 0);
    if (present.length < 3) continue;
    if (present.length < fixedOrder.length) {
      push(ctx.errors, 'B03', '顶部社区 Tab 缺少固定频道：推荐 / 极光街 / 灵感 / 关注 / 穿搭', lineOf(ctx.html, window.index));
      return;
    }
    const idx = fixedOrder.map(name => text.indexOf(name));
    for (let i = 1; i < idx.length; i += 1) {
      if (idx[i - 1] > idx[i]) {
        push(ctx.errors, 'B03', '顶部社区 Tab 顺序异常：推荐 / 极光街 / 活动位 / 灵感 / 关注 / 穿搭', lineOf(ctx.html, window.index));
        return;
      }
    }
    const slot = stripTags(text.slice(idx[1] + '极光街'.length, idx[2]));
    const hasActivitySlot = /[\u4e00-\u9fffA-Za-z0-9]/.test(slot);
    if (!hasActivitySlot) {
      push(ctx.errors, 'B03', '顶部社区 Tab 第 3 位必须保留运营活动/活动名展示位', lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB04LegacyTokens(ctx) {
  const re = /#(?:FF2E4D|FF4657|D7D7DE|5A5A66|2B2F36)\b|oklch\(/gi;
  for (const m of matches(ctx.html, re)) {
    push(ctx.errors, 'B04', '得物 DS 禁止旧 token：' + m[0], lineOf(ctx.html, m.index));
  }
}

function checkB05BrandAccentToken(ctx) {
  if (!/--accent\s*:\s*#01C2C3/i.test(ctx.html) && !/var\(--accent\)/.test(ctx.html)) {
    push(ctx.errors, 'B05', '得物品牌规则要求声明或使用 --accent 品牌 token', 1);
  }
}

function checkB06FiveTabGrid(ctx) {
  const re = /\.tabbar\b[^{}]*\{[^{}]*grid-template-columns\s*:\s*repeat\(\s*5\s*,/gi;
  for (const m of matches(ctx.html, re)) {
    push(ctx.errors, 'B06', '得物底部导航必须保持四 Tab，不允许 five-tab grid', lineOf(ctx.html, m.index));
  }
}

function checkB07MainPriceRed(ctx) {
  const redValue = /(var\(--(?:dewu-red|semantic-danger|danger|promo-red)\)|#(?:FF4F66|FF2E4D|FF4657|E02020|D0021B)\b)/i;
  const cssRe = /\.(?:main-)?price\b[^{}]*\{[^{}]*color\s*:\s*([^;}]+)/gi;
  const inlineClassFirstRe = /class\s*=\s*["'][^"']*\b(?:main-)?price\b[^"']*["'][^>]*style\s*=\s*["'][^"']*color\s*:\s*([^;"']+)/gi;
  const inlineStyleFirstRe = /style\s*=\s*["'][^"']*color\s*:\s*([^;"']+)[^"']*["'][^>]*class\s*=\s*["'][^"']*\b(?:main-)?price\b/gi;

  for (const re of [cssRe, inlineClassFirstRe, inlineStyleFirstRe]) {
    for (const m of matches(ctx.html, re)) {
      if (redValue.test(m[1])) {
        push(ctx.errors, 'B07', '主价格/金额信息不得使用红色促销语义，应使用 N140 或品牌中性色', lineOf(ctx.html, m.index));
      }
    }
  }
}

function checkB08BottomTabIcons(ctx) {
  const windows = classWindows(ctx, 'tabbar');
  for (const window of windows) {
    const source = hasAll(window.after, BOTTOM_TABS) ? window.after : window.text;
    if (!hasAll(source, BOTTOM_TABS)) continue;
    if (!/<svg\b/i.test(source) || /<i\s*>\s*<\/i>/i.test(source)) {
      push(ctx.errors, 'B08', '得物底部 Tab 必须使用真实 SVG stroke icon 或真实图标资产，不能是纯文字/占位点', lineOf(ctx.html, window.index));
      return;
    }
  }
  if (windows.some(window => hasAll(window.after, BOTTOM_TABS) || hasAll(window.text, BOTTOM_TABS)) && /\.tab::before\b|\bcontent\s*:\s*["']["'][^{}]*width\s*:\s*(?:17|18|20)px/i.test(ctx.html)) {
    push(ctx.errors, 'B08', '得物底部 Tab 禁止用 CSS 伪元素模拟 icon', 1);
  }
}

function checkB09BottomTabActiveColor(ctx) {
  const hasDewuTabbar = classWindows(ctx, 'tabbar').some(window => hasAll(window.after, BOTTOM_TABS) || hasAll(window.text, BOTTOM_TABS));
  if (!hasDewuTabbar) return;
  const accentColor = /(var\(--accent\)|#01C2C3\b)/i;
  const cssRules = [
    /\.tab\.active\b[^{}]*\{[^{}]*color\s*:\s*([^;}]+)/gi,
    /\.tabbar\b[^{}]*\.active\b[^{}]*\{[^{}]*color\s*:\s*([^;}]+)/gi,
  ];
  for (const re of cssRules) {
    for (const m of matches(ctx.html, re)) {
      if (accentColor.test(m[1])) {
        push(ctx.errors, 'B09', '得物底部 Tab active 使用 --n140，不使用 --accent', lineOf(ctx.html, m.index));
        return;
      }
    }
  }
  const inlineRe = /class\s*=\s*["'][^"']*\btab\b[^"']*\bactive\b[^"']*["'][^>]*style\s*=\s*["'][^"']*color\s*:\s*([^;"']+)/gi;
  for (const m of matches(ctx.html, inlineRe)) {
    if (accentColor.test(m[1])) {
      push(ctx.errors, 'B09', '得物底部 Tab active 使用 --n140，不使用 --accent', lineOf(ctx.html, m.index));
      return;
    }
  }
}

function checkB10Type2NoTabs(ctx) {
  const routeConfigRe = /state\s*:\s*["']Type\s*2["'][\s\S]{0,360}?(?:tabs|top)\s*:\s*true/gi;
  for (const m of matches(ctx.html, routeConfigRe)) {
    push(ctx.errors, 'B10', 'Type 2 Push 页面不得渲染顶部社区 Tab 或底部 TabBar', lineOf(ctx.html, m.index));
    return;
  }
  const explicitTypeRe = /data-(?:page-type|state|route-state)\s*=\s*["']Type\s*2["'][\s\S]{0,1800}?(?:class\s*=\s*["'][^"']*\b(?:top-tabs|tabbar)\b|<[^>]+\b(?:top-tabs|tabbar)\b)/gi;
  for (const m of matches(ctx.html, explicitTypeRe)) {
    push(ctx.errors, 'B10', 'Type 2 Push 页面不得渲染顶部社区 Tab 或底部 TabBar', lineOf(ctx.html, m.index));
    return;
  }
}

function checkB11FeedGridColumns(ctx) {
  const cssRules = [
    /\.feed-grid\b[^{}]*\{[^{}]*grid-template-columns\s*:\s*(?:1fr\s*(?:;|})|repeat\(\s*1\s*,)[^{}]*\}/gi,
    /\.feed-grid\b[^{}]*\{[^{}]*display\s*:\s*flex[^{}]*flex-direction\s*:\s*column[^{}]*\}/gi,
  ];
  for (const re of cssRules) {
    for (const m of matches(ctx.html, re)) {
      push(ctx.errors, 'B11', '社区 Feeds 不能使用单列 .feed-grid；讨论/评论/排行请改用 list class', lineOf(ctx.html, m.index));
      return;
    }
  }
}

function checkB12BottomTabStrokeOnly(ctx) {
  const windows = classWindows(ctx, 'tabbar', 2200);
  const filledShapeRe = /<(?:path|rect|circle|ellipse|polygon|g|svg)\b[^>]*\bfill\s*=\s*["'](?!none\b|transparent\b)(?:currentColor|#[0-9a-f]{3,8}|var\(--n140\)|var\(--accent\)|[a-z]+)["']/i;
  const filledCssRe = /\.(?:logo-body|tab-icon-fill)\b[^{}]*\{[^{}]*\bfill\s*:\s*(?!none\b|transparent\b)/i;
  for (const window of windows) {
    const source = hasAll(window.after, BOTTOM_TABS) ? window.after : window.text;
    if (!hasAll(source, BOTTOM_TABS)) continue;
    if (/\blogo-body\b|\btab-icon-fill\b/i.test(source) || filledShapeRe.test(source) || filledCssRe.test(ctx.html)) {
      push(ctx.errors, 'B12', '截图基线要求底部 Tab icon 为 stroke-only 线框风格，不允许填充块或生成式复杂图标', lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB13FeedLikeConsistency(ctx) {
  const windows = classWindows(ctx, 'like', 900);
  if (windows.length < 2) return;
  const paths = [];
  for (const window of windows) {
    const path = /<path\b[^>]*\bd\s*=\s*["']([^"']+)["']/i.exec(window.after);
    if (path) paths.push(path[1].replace(/\s+/g, ' ').trim());
  }
  if (!paths.length) return;
  const hasHeart = paths.some(path => /M10\s+17s|heart|C?\s*0\s+4\.3|6-3\.7-6-8/i.test(path));
  if (hasHeart || new Set(paths).size > 1) {
    push(ctx.errors, 'B13', '截图基线中 Feed 点赞只使用统一 thumbs-up 描边图标，不允许 heart 或混合点赞样式', lineOf(ctx.html, windows[0].index));
  }
}

function checkB14RecommendNoInventedChipRow(ctx) {
  const topTabs = classWindows(ctx, 'top-tabs', 2600);
  if (!topTabs.length || !/class\s*=\s*["'][^"']*\bfeed-grid\b/i.test(ctx.html)) return;
  const forbidden = /先鉴别后发货|今日热帖|穿搭灵感|\bchip-row\b/i;
  for (const window of topTabs) {
    const feedIndex = ctx.html.slice(window.index).search(/class\s*=\s*["'][^"']*\bfeed-grid\b/i);
    if (feedIndex < 0) continue;
    const between = ctx.html.slice(window.index, window.index + feedIndex);
    if (forbidden.test(between)) {
      push(ctx.errors, 'B14', '截图基线要求推荐 Tab 顶部频道后直接进入双列 Feed，不允许无截图依据的 chip row 或品牌背书行', lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB15FeedCardNoAuthNewLabels(ctx) {
  const windows = classWindows(ctx, 'feed-card', 1400);
  const labelRe = /\b(?:auth-mark|new-mark|feed-label|card-label)\b|>\s*(?:AUTH|NEW)\s*</i;
  for (const window of windows) {
    if (labelRe.test(window.after)) {
      push(ctx.errors, 'B15', '截图基线的社区 Feed 卡不出现 AUTH/NEW 标签；不要添加无截图依据的卡片角标', lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB16TopTabUnderlineScreenshotPriority(ctx) {
  const hasCommunityTabs = classWindows(ctx, 'top-tabs', 1800).some(window => hasAll(window.after, ['推荐', '极光街', '灵感', '关注', '穿搭']));
  if (!hasCommunityTabs) return;
  const blackUnderlineRe = /\.top-tabs\b[^{}]*(?:\.active|span\.active|active)::?after\b[^{}]*\{[^{}]*background\s*:\s*(?:var\(--n140\)|#14151A\b)/gi;
  for (const m of matches(ctx.html, blackUnderlineRe)) {
    push(ctx.errors, 'B16', '截图优先：得物社区顶部 active 下划线使用 --accent，不允许旧本地规则用 --n140 覆盖截图', lineOf(ctx.html, m.index));
    return;
  }
}

function checkB17RecommendTopTabActive(ctx) {
  const windows = classWindows(ctx, 'top-tabs', 1800);
  for (const window of windows) {
    if (!hasAll(window.after, ['推荐', '极光街', '灵感', '关注', '穿搭'])) continue;
    const items = topTabItems(window.after);
    const active = items.find(item => /\bactive\b/.test(item.attrs));
    if (!active || active.label !== '推荐') {
      push(ctx.errors, 'B17', '截图基线要求得物推荐页顶部 active Tab 必须是「推荐」，活动名只能保留在第 3 位展示位', lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB18BuyCategoryMenuIcon(ctx) {
  const windows = classWindows(ctx, 'commerce-tabs', 1800);
  for (const window of windows) {
    const containerEnd = window.after.indexOf('</div>');
    const container = containerEnd >= 0 ? window.after.slice(0, containerEnd + '</div>'.length) : window.after;
    if (!hasAll(container, ['推荐', '潮玩', '男装', '美妆', '鞋类', '女装', '分类'])) continue;
    const items = topTabItems(container);
    const last = items[items.length - 1];
    if (!last || !/^(?:分类|三\s*分类)$/.test(last.label)) {
      push(ctx.errors, 'B18', '购买页顶部交易频道最后一项必须是带菜单图标的「分类」', lineOf(ctx.html, window.index));
      return;
    }
    const categoryStart = container.indexOf('分类');
    const beforeCategory = categoryStart >= 0 ? container.slice(Math.max(0, categoryStart - 260), categoryStart) : '';
    if (!/\bcommerce-menu\b|<svg\b|☰|三/.test(last.attrs + beforeCategory)) {
      push(ctx.errors, 'B18', '截图事实：购买页「分类」前必须有菜单图标/三横线，不允许裸文字分类 Tab', lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB19BuySpacingBaseline(ctx) {
  if (!/class\s*=\s*["'][^"']*\bcommerce-tabs\b/i.test(ctx.html)) return;
  const tabs = cssRulesForClass(ctx, 'commerce-tabs')[0];
  const grid = cssRulesForClass(ctx, 'channel-grid')[0];
  const trust = cssRulesForClass(ctx, 'trust-row')[0];
  const product = cssRulesForClass(ctx, 'product-card')[0];
  const media = cssRulesForClass(ctx, 'product-media')[0];
  const productTitle = /\.product-card\s+strong\b[^{}]*\{[^{}]*\}/gis.exec(ctx.html);
  if (hasScreenshotEvidenceV4(ctx)) {
    if (!tabs || !hasPxInRange(tabs.text, 'height', 50, 56)) {
      push(ctx.errors, 'B19', '截图级购买页频道栏高度必须落在 50-56px 区间', lineOf(ctx.html, tabs?.index || 1));
      return;
    }
    if (!grid || !hasPxInRange(grid.text, 'height', 132, 152)) {
      push(ctx.errors, 'B19', '截图级购买页频道宫格高度必须落在 132-152px 区间', lineOf(ctx.html, grid?.index || 1));
      return;
    }
    if (!trust || !hasPxInRange(trust.text, 'height', 34, 40)) {
      push(ctx.errors, 'B19', '截图级购买页信任背书行高度必须落在 34-40px 区间', lineOf(ctx.html, trust?.index || 1));
      return;
    }
    const mediaMin = hasScreenshotEvidenceV8(ctx) ? 126 : 112;
    const mediaMax = hasScreenshotEvidenceV8(ctx) ? 150 : 132;
    if (!product || cssNumber(product.text, 'padding') > 10 || !media || !hasPxInRange(media.text, 'height', mediaMin, mediaMax)) {
      push(ctx.errors, 'B19', '截图级购买页商品卡必须使用紧凑 padding 与商品图高度区间', lineOf(ctx.html, product?.index || media?.index || 1));
      return;
    }
    if (!productTitle || cssNumber(productTitle[0], 'font-size') !== 15 || !/-webkit-line-clamp\s*:\s*2/i.test(productTitle[0])) {
      push(ctx.errors, 'B19', '截图级购买页商品标题必须为 15px 且最多 2 行', lineOf(ctx.html, productTitle?.index || 1));
    }
    return;
  }
  if (!tabs || cssNumber(tabs.text, 'height') !== 48 || !/gap\s*:\s*18px/i.test(tabs.text)) {
    push(ctx.errors, 'B19', '购买页顶部频道间距必须按截图基线：commerce-tabs height 48px, gap 18px', lineOf(ctx.html, tabs?.index || 1));
    return;
  }
  if (!grid || cssNumber(grid.text, 'padding') !== 14 || !/gap\s*:\s*14px\s+8px/i.test(grid.text)) {
    push(ctx.errors, 'B19', '购买页频道宫格必须按截图基线：padding 14px 10px, gap 14px 8px', lineOf(ctx.html, grid?.index || 1));
    return;
  }
  if (!trust || cssNumber(trust.text, 'height') !== 38) {
    push(ctx.errors, 'B19', '购买页信任背书行必须按截图基线压缩到 38px 高度', lineOf(ctx.html, trust?.index || 1));
    return;
  }
  if (!product || cssNumber(product.text, 'padding') !== 10 || !media || cssNumber(media.text, 'height') !== 108) {
    push(ctx.errors, 'B19', '购买页商品卡必须按截图基线使用 10px padding 与 108px 商品图高度', lineOf(ctx.html, product?.index || media?.index || 1));
    return;
  }
  if (!productTitle || cssNumber(productTitle[0], 'font-size') > 15) {
    push(ctx.errors, 'B19', '购买页商品标题字号必须收敛到 15px 或更小，避免高保真间距失真', lineOf(ctx.html, productTitle?.index || 1));
  }
}

function checkB20NoPhoneInternalHorizontalOverflow(ctx) {
  const internalRuleRe = /\.(?:phone-screen|body|profile-body|utility-list|utility-row|profile-top|profile-main|channel-grid|product-grid)\b[^{}]*\{[^{}]*\}/gis;
  for (const m of matches(ctx.html, internalRuleRe)) {
    const rule = m[0];
    if (/overflow-x\s*:\s*(?:auto|scroll)/i.test(rule)) {
      push(ctx.errors, 'B20', 'Dewu 手机内部不得出现横向滚动条；只有外层 canvas/rail 可以横向滚动', lineOf(ctx.html, m.index));
      return;
    }
    if (/overflow-y\s*:\s*auto/i.test(rule) && !/overflow-x\s*:\s*hidden/i.test(rule)) {
      push(ctx.errors, 'B20', 'Dewu 纵向滚动内容区必须显式声明 overflow-x:hidden', lineOf(ctx.html, m.index));
      return;
    }
    if (/\bright\s*:\s*-[0-9.]+px/i.test(rule)) {
      push(ctx.errors, 'B20', 'Dewu 手机内部提醒点/图标不得用负 right 撑出横向溢出', lineOf(ctx.html, m.index));
      return;
    }
  }
}

function checkB21UploadedTypographyAndWrap(ctx) {
  const limits = hasScreenshotEvidenceV8(ctx) ? [
    ['feed-card strong', /\.feed-card\s+strong\b[^{}]*\{[^{}]*\}/gis, 15, '得物 Feed 标题'],
    ['product-card strong', /\.product-card\s+strong\b[^{}]*\{[^{}]*\}/gis, 15, '购买页商品标题'],
    ['product-card .price', /\.product-card\s+\.price\b[^{}]*\{[^{}]*\}/gis, 13, '购买页价格'],
    ['product-card .buyers', /\.product-card\s+\.buyers\b[^{}]*\{[^{}]*\}/gis, 13, '购买页付款人数'],
    ['explore-head h2', /\.explore-head\s+h2\b[^{}]*\{[^{}]*\}/gis, 30, '探索页标题'],
    ['utility-row h3', /\.utility-row\s+h3\b[^{}]*\{[^{}]*\}/gis, 19, '探索页入口标题'],
    ['utility-row p', /\.utility-row\s+p\b[^{}]*\{[^{}]*\}/gis, 13, '探索页说明文字'],
    ['profile-name', /\.profile-name\b[^{}]*\{[^{}]*\}/gis, 18, '我页昵称'],
    ['profile-meta', /\.profile-meta\b[^{}]*\{[^{}]*\}/gis, 14, '我页签名'],
    ['profile-stats', /\.profile-stats\b[^{}]*\{[^{}]*\}/gis, 14, '我页统计'],
    ['creator-item', /\.creator-item\b[^{}]*\{[^{}]*\}/gis, 13, '我页创作中心入口'],
    ['module-head h3', /\.module-head\s+h3\b[^{}]*\{[^{}]*\}/gis, 16, '我页模块标题'],
    ['tile', /\.tile\b[^{}]*\{[^{}]*\}/gis, 17, '我页资产卡标题'],
  ] : hasScreenshotEvidenceV4(ctx) ? [
    ['feed-card strong', /\.feed-card\s+strong\b[^{}]*\{[^{}]*\}/gis, 16, '得物 Feed 标题'],
    ['product-card strong', /\.product-card\s+strong\b[^{}]*\{[^{}]*\}/gis, 15, '购买页商品标题'],
    ['product-card .price', /\.product-card\s+\.price\b[^{}]*\{[^{}]*\}/gis, 16, '购买页价格'],
    ['product-card .buyers', /\.product-card\s+\.buyers\b[^{}]*\{[^{}]*\}/gis, 12, '购买页付款人数'],
    ['explore-head h2', /\.explore-head\s+h2\b[^{}]*\{[^{}]*\}/gis, 30, '探索页标题'],
    ['utility-row h3', /\.utility-row\s+h3\b[^{}]*\{[^{}]*\}/gis, 19, '探索页入口标题'],
    ['utility-row p', /\.utility-row\s+p\b[^{}]*\{[^{}]*\}/gis, 13, '探索页说明文字'],
    ['profile-name', /\.profile-name\b[^{}]*\{[^{}]*\}/gis, 20, '我页昵称'],
    ['profile-meta', /\.profile-meta\b[^{}]*\{[^{}]*\}/gis, 14, '我页签名'],
    ['profile-stats', /\.profile-stats\b[^{}]*\{[^{}]*\}/gis, 14, '我页统计'],
    ['creator-item', /\.creator-item\b[^{}]*\{[^{}]*\}/gis, 13, '我页创作中心入口'],
    ['module-head h3', /\.module-head\s+h3\b[^{}]*\{[^{}]*\}/gis, 18, '我页模块标题'],
    ['tile', /\.tile\b[^{}]*\{[^{}]*\}/gis, 17, '我页资产卡标题'],
  ] : [
    ['product-card strong', /\.product-card\s+strong\b[^{}]*\{[^{}]*\}/gis, 15, '购买页商品标题'],
    ['product-card .price', /\.product-card\s+\.price\b[^{}]*\{[^{}]*\}/gis, 16, '购买页价格'],
    ['explore-head h2', /\.explore-head\s+h2\b[^{}]*\{[^{}]*\}/gis, 24, '探索页标题'],
    ['utility-row h3', /\.utility-row\s+h3\b[^{}]*\{[^{}]*\}/gis, 18, '探索页入口标题'],
    ['utility-row p', /\.utility-row\s+p\b[^{}]*\{[^{}]*\}/gis, 13, '探索页说明文字'],
    ['profile-name', /\.profile-name\b[^{}]*\{[^{}]*\}/gis, 20, '我页昵称'],
    ['profile-meta', /\.profile-meta\b[^{}]*\{[^{}]*\}/gis, 13, '我页签名'],
    ['profile-stats', /\.profile-stats\b[^{}]*\{[^{}]*\}/gis, 13, '我页统计'],
    ['creator-item', /\.creator-item\b[^{}]*\{[^{}]*\}/gis, 13, '我页创作中心入口'],
    ['module-head h3', /\.module-head\s+h3\b[^{}]*\{[^{}]*\}/gis, 18, '我页模块标题'],
    ['tile', /\.tile\b[^{}]*\{[^{}]*\}/gis, 17, '我页资产卡标题'],
  ];
  for (const [, re, max, label] of limits) {
    for (const m of matches(ctx.html, re)) {
      const value = cssNumber(m[0], 'font-size');
      if (value !== null && value > max) {
        push(ctx.errors, 'B21', `${label}字号必须按上传截图吸收，不得超过 ${max}px；当前 ${value}px`, lineOf(ctx.html, m.index));
        return;
      }
    }
  }
  const productTitle = /\.product-card\s+strong\b[^{}]*\{[^{}]*\}/gis.exec(ctx.html);
  if (productTitle && !/-webkit-line-clamp\s*:\s*2/i.test(productTitle[0])) {
    push(ctx.errors, 'B21', '购买页商品标题必须按截图限制为最多 2 行', lineOf(ctx.html, productTitle.index));
  }
}

function checkB22ProfileHeaderNotCollapsed(ctx) {
  const profileTop = cssRulesForClass(ctx, 'profile-top')[0];
  const profileBody = cssRulesForClass(ctx, 'profile-body')[0];
  if (profileTop && /margin-top\s*:\s*-[0-9.]+px/i.test(profileTop.text)) {
    push(ctx.errors, 'B22', '我页头部不得用负 margin 折叠到状态栏之下，必须保持资料区完整可见', lineOf(ctx.html, profileTop.index));
    return;
  }
  if (profileBody && /margin-top\s*:\s*-[0-9.]+px/i.test(profileBody.text)) {
    push(ctx.errors, 'B22', '我页 body 不得用负 margin 覆盖 profile header；测试阶段必须暴露头部折叠', lineOf(ctx.html, profileBody.index));
  }
}

function checkB23ScreenshotSurfaceGeometry(ctx) {
  if (!hasScreenshotEvidenceV4(ctx)) return;
  const phone = cssRulesForClass(ctx, 'phone-screen')[0];
  const shell = cssRulesForClass(ctx, 'phone-shell')[0];
  if (!phone || cssNumber(phone.text, 'width') !== 393 || cssNumber(phone.text, 'height') !== 852) {
    push(ctx.errors, 'B23', '截图证据模式必须使用 393x852 CSS px 内部 surface；手机壳不得压缩内部坐标', lineOf(ctx.html, phone?.index || 1));
    return;
  }
  if (shell && cssNumber(shell.text, 'padding') !== null && cssNumber(shell.text, 'padding') !== 0) {
    push(ctx.errors, 'B23', '截图证据模式下外层 phone shell 不得用 padding 吃掉 393x852 内部坐标', lineOf(ctx.html, shell.index));
    return;
  }
  if (!/\bapp-title\b[\s\S]{0,260}得物App|得物App[\s\S]{0,260}\bapp-title\b/i.test(ctx.html)) {
    push(ctx.errors, 'B23', '四张截图都有顶部居中「得物App」App chrome，截图级吸收不得省略', 1);
  }
}

function checkB24ScreenshotPixelRhythm(ctx) {
  if (!hasScreenshotEvidenceV4(ctx)) return;
  const utility = cssRulesForClass(ctx, 'utility-row')[0];
  const utilityLarge = /\.utility-row\.large\b[^{}]*\{[^{}]*\}/gis.exec(ctx.html);
  const profileTop = cssRulesForClass(ctx, 'profile-top')[0];
  const creator = cssRulesForClass(ctx, 'creator-card')[0];
  const tile = cssRulesForClass(ctx, 'tile').find(rule => /^\.tile\s*\{/i.test(rule.text));
  const channelGrid = cssRulesForClass(ctx, 'channel-grid')[0];
  const tabbar = cssRulesForClass(ctx, 'tabbar')[0];
  if (utility && !hasPxInRange(utility.text, 'height', 74, 82)) {
    push(ctx.errors, 'B24', '截图级探索页普通 row 高度必须落在 74-82px 区间，不能被 demo 拉松', lineOf(ctx.html, utility.index));
    return;
  }
  if (utilityLarge && !hasPxInRange(utilityLarge[0], 'height', 82, 92)) {
    push(ctx.errors, 'B24', '截图级探索页消息中心 row 高度必须落在 82-92px 区间', lineOf(ctx.html, utilityLarge.index));
    return;
  }
  const profileTopMin = hasScreenshotEvidenceV8(ctx) ? 188 : 214;
  const profileTopMax = hasScreenshotEvidenceV8(ctx) ? 202 : 234;
  if (profileTop && !hasPxInRange(profileTop.text, 'height', profileTopMin, profileTopMax)) {
    push(ctx.errors, 'B24', `截图级我页 profile header 高度必须落在 ${profileTopMin}-${profileTopMax}px 区间，不得折叠或过高`, lineOf(ctx.html, profileTop.index));
    return;
  }
  if (creator && !hasPxInRange(creator.text, 'height', 66, 76)) {
    push(ctx.errors, 'B24', '截图级我页创作中心高度必须落在 66-76px 区间', lineOf(ctx.html, creator.index));
    return;
  }
  if (tile && !hasPxInRange(tile.text, 'height', 44, 52)) {
    push(ctx.errors, 'B24', '截图级我页资产 tile 高度必须落在 44-52px 区间', lineOf(ctx.html, tile.index));
    return;
  }
  if (channelGrid && !hasPxInRange(channelGrid.text, 'height', 132, 152)) {
    push(ctx.errors, 'B24', '截图级购买页频道宫格高度必须落在 132-152px 区间', lineOf(ctx.html, channelGrid.index));
    return;
  }
  if (tabbar && !hasPxInRange(tabbar.text, 'height', 66, 74)) {
    push(ctx.errors, 'B24', '截图级底栏高度必须落在 66-74px 区间', lineOf(ctx.html, tabbar.index));
  }
}

function checkB25ScreenshotVisibleText(ctx) {
  if (!hasScreenshotEvidenceV4(ctx)) return;
  const normalized = stripTags(ctx.html).replace(/[\s，。！？、：；,.!?✨🌊]/g, '');
  const required = hasScreenshotEvidenceV8(ctx) ? [
    '摩哈云游戏机二代',
    '推荐极光街楠檀入驻灵感关注穿搭',
    '宽松灰T配热裤',
    '香奈儿1957发财水',
    '限时补贴',
    'Apple AirPods Pro 3 入耳',
    '消息中心',
    '创作中心',
    '出售',
    '免费领券',
    'LIANG李昂',
    '谁懂啊和对象宅家情侣睡衣太好磕了',
    '社区公约',
  ] : [
    '香奈儿1957香水',
    '推荐极光街夏日焕颜术灵感关注穿搭',
    '当田曦薇遇上朦胧破碎感',
    '度假的意义就是把烦恼丢进海里',
    '夜魔extremese',
    '推荐潮玩男装美妆鞋类女装三分类',
    '100%必中抽奖',
    '消息中心',
    '鉴别服务',
    '玩一玩',
    '买卖闲置',
    '得有钱·借钱',
    '创作中心',
    '退款/售后1',
  ];
  for (const text of required) {
    if (!normalized.includes(text.replace(/\s+/g, ''))) {
      push(ctx.errors, 'B25', `截图级复刻模式缺少可见文字：${text}`, 1);
      return;
    }
  }
}

function checkB26ScreenshotCoordinateAnchors(ctx) {
  if (!hasScreenshotEvidenceV4(ctx)) return;
  const required = [
    ['app-status', 'height'],
    ['top-tabs', 'height'],
    ['feed-grid', 'grid-template-columns'],
    ['commerce-tabs', 'height'],
    ['channel-grid', 'height'],
    ['trust-row', 'height'],
    ['product-media', 'height'],
    ['utility-list', 'padding'],
    ['utility-row', 'height'],
    ['profile-top', 'height'],
    ['creator-card', 'height'],
    ['tile', 'height'],
    ['tabbar', 'height'],
  ];
  for (const [className, prop] of required) {
    const rule = cssRulesForClass(ctx, className)[0];
    if (!rule || !new RegExp(`${prop}\\s*:`, 'i').test(rule.text)) {
      push(ctx.errors, 'B26', `截图级吸收不能只写字号；必须为 .${className} 固化 ${prop} 坐标/节奏锚点`, lineOf(ctx.html, rule?.index || 1));
      return;
    }
  }
}

function checkB27LongScreenshotScrollModel(ctx) {
  if (!hasScreenshotEvidenceV8(ctx)) return;
  const scrollContent = cssRulesForClass(ctx, 'scroll-content')[0];
  const scrollInner = cssRulesForClass(ctx, 'scroll-inner')[0];
  const phone = cssRulesForClass(ctx, 'phone-screen')[0];
  const oldModel = scrollContent && hasPxInRange(scrollContent.text, 'min-height', 1100, 2100);
  const explicitLongLayer = scrollInner && /(?:min-)?height\s*:\s*(?:1[1-9][0-9]{2}|2[0-1][0-9]{2})px/i.test(scrollInner.text);
  const naturalLongContent =
    matches(ctx.html, /class\s*=\s*["'][^"']*\bfeed-card\b/gi).length >= 8
    || matches(ctx.html, /class\s*=\s*["'][^"']*\bproduct-card\b/gi).length >= 8
    || (/\bdetail-hero\b/i.test(ctx.html) && matches(ctx.html, /class\s*=\s*["'][^"']*\bcomment\b/gi).length >= 2)
    || (/\bprofile-scroll-inner\b/i.test(ctx.html) && /\bseller-module\b/i.test(ctx.html) && /\bservice-grid\b/i.test(ctx.html));
  const realScrollModel = scrollContent && /overflow-y\s*:\s*auto/i.test(scrollContent.text) && hasPxInRange(scrollContent.text, 'height', 500, 760) && scrollInner && (explicitLongLayer || naturalLongContent);
  if (!oldModel && !realScrollModel) {
    push(ctx.errors, 'B27', 'v1.0.9 长截图必须按固定 393x852 viewport + 真实可滚动 scroll-content/scroll-inner 建模', lineOf(ctx.html, scrollContent?.index || scrollInner?.index || 1));
    return;
  }
  if (!phone || !/overflow-x\s*:\s*hidden/i.test(phone.text)) {
    push(ctx.errors, 'B27', 'v1.0.9 长截图 phone-screen 必须显式禁止横向溢出', lineOf(ctx.html, phone?.index || 1));
  }
}

function checkB28DetailType2NoBottomTab(ctx) {
  if (!hasScreenshotEvidenceV8(ctx)) return;
  const windows = classWindows(ctx, 'detail-page', 5000);
  for (const window of windows) {
    if (/\btabbar\b|bottom-tabs/i.test(window.after)) {
      push(ctx.errors, 'B28', '内容详情页是 Type 2 push surface：不得出现底部四 Tab', lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB29DetailHeroOverlayAndActionbar(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bdetail-page\b/i.test(ctx.html)) return;
  const requiredClasses = ['detail-hero', 'detail-back', 'detail-count', 'detail-share', 'detail-product-strip', 'detail-author', 'detail-actionbar'];
  for (const className of requiredClasses) {
    if (!new RegExp(`\\b${className}\\b`, 'i').test(ctx.html)) {
      push(ctx.errors, 'B29', `内容详情页缺少截图证据模块：.${className}`, 1);
      return;
    }
  }
  const hero = cssRulesForClass(ctx, 'detail-hero')[0];
  const strip = cssRulesForClass(ctx, 'detail-product-strip')[0];
  const actionbar = cssRulesForClass(ctx, 'detail-actionbar')[0];
  if (!hero || !hasPxInRange(hero.text, 'height', 600, 632)) {
    push(ctx.errors, 'B29', '内容详情页 hero 图区域高度必须接近截图 600-632px', lineOf(ctx.html, hero?.index || 1));
    return;
  }
  if (!strip || !hasPxInRange(strip.text, 'height', 72, 84)) {
    push(ctx.errors, 'B29', '内容详情页商品推荐条高度必须接近截图 72-84px', lineOf(ctx.html, strip?.index || 1));
    return;
  }
  if (!actionbar || !/position\s*:\s*absolute/i.test(actionbar.text) || !hasPxInRange(actionbar.text, 'height', 50, 58)) {
    push(ctx.errors, 'B29', '内容详情页底部互动栏必须固定在 viewport 底部且高度接近 50-58px', lineOf(ctx.html, actionbar?.index || 1));
  }
}

function checkB30LongFeedMasonryDensity(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bfeed-grid\b/i.test(ctx.html)) return;
  const feedGrid = cssRulesForClass(ctx, 'feed-grid')[0];
  if (feedGrid && !/grid-template-columns\s*:\s*repeat\(\s*2\s*,\s*1fr\s*\)/i.test(feedGrid.text)) {
    push(ctx.errors, 'B30', '长截图社区 Feed 必须保持双列瀑布流', lineOf(ctx.html, feedGrid.index));
    return;
  }
  const feedCard = cssRulesForClass(ctx, 'feed-card')[0];
  if (feedCard && /height\s*:\s*[0-9.]+px/i.test(feedCard.text)) {
    push(ctx.errors, 'B30', '长截图社区 Feed 卡片高度必须由图片和文本自适应，不得统一固定卡高制造空白', lineOf(ctx.html, feedCard.index));
    return;
  }
  if (!/\bvideo-marker\b/i.test(ctx.html)) {
    push(ctx.errors, 'B30', '长截图社区 Feed 必须吸收视频卡右上角播放标识模块', 1);
  }
}

function checkB31ProfileScrolledDashboardModules(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bprofile-page\b/i.test(ctx.html)) return;
  const requiredText = ['出售', '切换商家版', '免费领券', '星愿森林', '签到有奖', '必中抽奖', '高价回收', '免费鉴别', '0元抽奖', '领120元券'];
  const normalized = stripTags(ctx.html).replace(/\s+/g, '');
  for (const text of requiredText) {
    if (!normalized.includes(text.replace(/\s+/g, ''))) {
      push(ctx.errors, 'B31', `我页长截图缺少下滑后 dashboard 模块文字：${text}`, 1);
      return;
    }
  }
  if (!/\bseller-module\b/i.test(ctx.html) || !/\bservice-grid\b/i.test(ctx.html)) {
    push(ctx.errors, 'B31', '我页长截图必须沉淀 seller-module 和 service-grid 复用模块', 1);
  }
}

function checkB32CommerceLongProductDensity(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bcommerce-page\b/i.test(ctx.html)) return;
  const requiredText = ['限时补贴', '精选手机', 'Apple AirPods Pro 3 入耳', 'EVANLEY 电子驱蚊器', 'JELLYCAT 害羞系列'];
  const normalized = stripTags(ctx.html).replace(/\s+/g, '');
  for (const text of requiredText) {
    if (!normalized.includes(text.replace(/\s+/g, ''))) {
      push(ctx.errors, 'B32', `购买长截图缺少商品流/频道文字：${text}`, 1);
      return;
    }
  }
  const media = cssRulesForClass(ctx, 'product-media')[0];
  const title = /\.product-card\s+strong\b[^{}]*\{[^{}]*\}/gis.exec(ctx.html);
  const price = cssRulesForClass(ctx, 'price')[0];
  if (!media || !hasPxInRange(media.text, 'height', 126, 150)) {
    push(ctx.errors, 'B32', '购买长截图商品图高度必须落在 126-150px 区间', lineOf(ctx.html, media?.index || 1));
    return;
  }
  if (!title || !/font-size\s*:\s*15px/i.test(title[0]) || !/-webkit-line-clamp\s*:\s*2/i.test(title[0])) {
    push(ctx.errors, 'B32', '购买长截图商品标题必须 15px 且最多 2 行', lineOf(ctx.html, title?.index || 1));
    return;
  }
  if (!price || !/font-size\s*:\s*13px/i.test(price.text)) {
    push(ctx.errors, 'B32', '购买长截图价格字号必须按截图密度收敛为 13px', lineOf(ctx.html, price?.index || 1));
  }
}

function checkB33LongScreenshotActuallyScrollable(ctx) {
  if (!hasScreenshotEvidenceV8(ctx)) return;
  const scrollContent = cssRulesForClass(ctx, 'scroll-content')[0];
  const scrollInner = cssRulesForClass(ctx, 'scroll-inner')[0];
  if (!scrollContent || !/overflow-y\s*:\s*auto/i.test(scrollContent.text) || !hasPxInRange(scrollContent.text, 'height', 500, 720)) {
    push(ctx.errors, 'B33', '长截图必须使用固定高度 .scroll-content 作为真实滚动视口，不能把滚动区本身撑成长图后裁切', lineOf(ctx.html, scrollContent?.index || 1));
    return;
  }
  if (/min-height\s*:\s*(?:1[0-9]{3}|2[0-9]{3})px/i.test(scrollContent.text)) {
    push(ctx.errors, 'B33', '.scroll-content 不得直接承载长截图 min-height；长内容必须放入 .scroll-inner', lineOf(ctx.html, scrollContent.index));
    return;
  }
  const explicitLongLayer = scrollInner && /(?:min-)?height\s*:\s*(?:1[1-9][0-9]{2}|2[0-1][0-9]{2})px/i.test(scrollInner.text);
  const naturalLongContent =
    matches(ctx.html, /class\s*=\s*["'][^"']*\bfeed-card\b/gi).length >= 8
    || matches(ctx.html, /class\s*=\s*["'][^"']*\bproduct-card\b/gi).length >= 8
    || (/\bdetail-hero\b/i.test(ctx.html) && matches(ctx.html, /class\s*=\s*["'][^"']*\bcomment\b/gi).length >= 2)
    || (/\bprofile-scroll-inner\b/i.test(ctx.html) && /\bseller-module\b/i.test(ctx.html) && /\bservice-grid\b/i.test(ctx.html));
  if (!scrollInner || (!explicitLongLayer && !naturalLongContent)) {
    push(ctx.errors, 'B33', '长截图必须提供 .scroll-inner 长内容层，使 scrollHeight 大于 clientHeight；Feed/商品流应优先由自然内容撑高，不用假 min-height 造空白', lineOf(ctx.html, scrollInner?.index || 1));
  }
}

function checkB34BuyTopExactTextAndRhythm(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bcommerce-page\b/i.test(ctx.html)) return;
  const normalized = stripTags(ctx.html).replace(/\s+/g, '');
  const requiredText = [
    '香奈儿1957发财水',
    '推荐潮玩男装美妆鞋类女装三分类',
    '100%必中抽奖',
    '天天低价',
    '礼物指南',
    '限时补贴',
    '疯狂折扣',
    '星宇宙',
    '品牌专区',
    '星愿森林',
    '精选手机',
    '全部频道',
    '先鉴别后发货的开创者',
    '得物荣获人民网“匠心服务奖”',
  ];
  for (const text of requiredText) {
    if (!normalized.includes(text.replace(/\s+/g, ''))) {
      push(ctx.errors, 'B34', `购买顶部截图区域必须逐字吸收：${text}`, 1);
      return;
    }
  }
  const tabs = cssRulesForClass(ctx, 'commerce-tabs')[0];
  const channel = cssRulesForClass(ctx, 'channel-grid')[0];
  const trust = cssRulesForClass(ctx, 'trust-row')[0];
  if (!tabs || !hasPxInRange(tabs.text, 'height', 50, 56) || !channel || !hasPxInRange(channel.text, 'height', 132, 152) || !trust || !hasPxInRange(trust.text, 'height', 34, 40)) {
    push(ctx.errors, 'B34', '购买顶部频道、宫格、信任背书高度必须落入截图节奏区间', lineOf(ctx.html, tabs?.index || channel?.index || trust?.index || 1));
  }
}

function checkB35TypographyFootprint(ctx) {
  if (!hasScreenshotEvidenceV8(ctx)) return;
  if (/fonts\.googleapis\.com|font-family\s*:[^;}"]*(?:Oswald|JetBrains Mono)/i.test(ctx.html)) {
    push(ctx.errors, 'B35', '截图级 Dewu 业务 UI 不得引入外部展示字体，应使用 iOS/PingFang 系统字体 footprint', 1);
    return;
  }
  const rules = [
    ['feed-card strong', /\.feed-card\s+strong\b[^{}]*\{[^{}]*\}/gis, 15, 19, 21, '社区 Feed 标题'],
    ['meta', /\.meta\b[^{}]*\{[^{}]*\}/gis, 12, 16, 18, '社区 meta'],
    ['product-card strong', /\.product-card\s+strong\b[^{}]*\{[^{}]*\}/gis, 15, 18, 21, '购买商品标题'],
    ['price', /\.price\b[^{}]*\{[^{}]*\}/gis, 13, null, null, '购买价格'],
    ['profile-name', /\.profile-name\b[^{}]*\{[^{}]*\}/gis, 18, 21, 23, '我页昵称'],
    ['module-head h3', /\.module-head\s+h3\b[^{}]*\{[^{}]*\}/gis, 16, 17, 19, '模块标题'],
    ['detail-title', /\.detail-title\b[^{}]*\{[^{}]*\}/gis, 18, 24, 27, '详情标题'],
    ['detail-copy', /\.detail-copy\b[^{}]*\{[^{}]*\}/gis, 16, 22, 24, '详情正文'],
  ];
  for (const [, re, fontSize, lineMin, lineMax, label] of rules) {
    const match = re.exec(ctx.html);
    if (!match) {
      push(ctx.errors, 'B35', `缺少截图 typography footprint 规则：${label}`, 1);
      return;
    }
    const rule = match[0];
    if (cssNumber(rule, 'font-size') !== fontSize) {
      push(ctx.errors, 'B35', `${label} 字号必须按截图 footprint 固化为 ${fontSize}px`, lineOf(ctx.html, match.index));
      return;
    }
    if (lineMin !== null) {
      const lineHeight = cssNumber(rule, 'line-height');
      if (lineHeight === null || lineHeight < lineMin || lineHeight > lineMax) {
        push(ctx.errors, 'B35', `${label} 必须显式固化 line-height 且落入截图区间`, lineOf(ctx.html, match.index));
        return;
      }
    }
  }
}

function checkB36ProfileLowerDashboardScrollable(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bprofile-page\b/i.test(ctx.html)) return;
  const profileBody = cssRulesForClass(ctx, 'profile-body')[0];
  const profileInner = cssRulesForClass(ctx, 'profile-scroll-inner')[0] || cssRulesForClass(ctx, 'scroll-inner')[0];
  if (!profileBody || !/overflow-y\s*:\s*auto/i.test(profileBody.text) || !hasPxInRange(profileBody.text, 'height', 580, 594)) {
    push(ctx.errors, 'B36', '我页必须使用固定高度 profile-body 作为真实滚动视口', lineOf(ctx.html, profileBody?.index || 1));
    return;
  }
  if (/min-height\s*:\s*(?:9[0-9]{2}|1[0-9]{3})px/i.test(profileBody.text)) {
    push(ctx.errors, 'B36', '我页 profile-body 不得用 min-height 假装长截图；lower dashboard 必须在内层滚动内容中可访问', lineOf(ctx.html, profileBody.index));
    return;
  }
  if (!profileInner || !hasPxInRange(profileInner.text, 'min-height', 740, 820)) {
    push(ctx.errors, 'B36', '我页必须提供截图级紧凑且可滚动的内层内容承载 lower dashboard，避免用过高 min-height 造空白', lineOf(ctx.html, profileInner?.index || 1));
    return;
  }
  const requiredText = ['出售', '切换商家版', '免费领券', '星愿森林', '签到有奖', '必中抽奖', '高价回收', '免费鉴别', '0元抽奖', '领120元券'];
  const normalized = stripTags(ctx.html).replace(/\s+/g, '');
  for (const text of requiredText) {
    if (!normalized.includes(text.replace(/\s+/g, ''))) {
      push(ctx.errors, 'B36', `我页 lower dashboard 缺少可复用模块文字：${text}`, 1);
      return;
    }
  }
}

function checkB37ProfileDashboardViewportRhythm(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bprofile-page\b/i.test(ctx.html)) return;
  const profileTop = cssRulesForClass(ctx, 'profile-top')[0];
  const profileBody = cssRulesForClass(ctx, 'profile-body')[0];
  if (!profileTop || !hasPxInRange(profileTop.text, 'height', 188, 202)) {
    push(ctx.errors, 'B37', 'v1.0.10 我页资料区必须按截图重标定为 188-202px，不得沿用过高 header', lineOf(ctx.html, profileTop?.index || 1));
    return;
  }
  if (!profileBody || !/overflow-y\s*:\s*auto/i.test(profileBody.text) || !/overflow-x\s*:\s*hidden/i.test(profileBody.text) || !hasPxInRange(profileBody.text, 'height', 580, 594)) {
    push(ctx.errors, 'B37', 'v1.0.10 我页 profile-body 必须是 580-594px 的真实纵向滚动视口，并禁止横向溢出', lineOf(ctx.html, profileBody?.index || 1));
  }
}

function checkB38ProfileDashboardStackRhythm(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bprofile-page\b/i.test(ctx.html)) return;
  const inner = cssRulesForClass(ctx, 'profile-scroll-inner')[0];
  if (!inner || /display\s*:\s*grid/i.test(inner.text) || !/display\s*:\s*flex/i.test(inner.text) || !/flex-direction\s*:\s*column/i.test(inner.text) || !/gap\s*:\s*(?:8|9|10)px/i.test(inner.text)) {
    push(ctx.errors, 'B38', 'v1.0.10 我页 dashboard 必须是紧凑纵向 flex stack，禁止 grid/min-height stretch 拉散模块', lineOf(ctx.html, inner?.index || 1));
    return;
  }
  const ranges = [
    ['creator-card', 66, 76, '创作中心'],
    ['order-module', 104, 116, '订单模块'],
    ['wallet-module', 90, 104, '钱包模块'],
    ['seller-module', 96, 112, '出售模块'],
  ];
  for (const [className, min, max, label] of ranges) {
    const rule = cssRulesForClass(ctx, className)[0];
    if (!rule || !hasPxInRange(rule.text, 'height', min, max)) {
      push(ctx.errors, 'B38', `v1.0.10 我页 ${label} 高度必须落在截图区间 ${min}-${max}px`, lineOf(ctx.html, rule?.index || 1));
      return;
    }
  }
}

function checkB39ProfileDashboardLineIcons(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bprofile-page\b/i.test(ctx.html)) return;
  const requirements = [
    ['order-grid', 5, '订单五项'],
    ['profile-tiles', 4, '资产四宫格'],
    ['coupon-grid', 4, '省钱神券四项'],
    ['service-grid', 8, '服务八宫格'],
  ];
  for (const [className, expected, label] of requirements) {
    const window = classWindows(ctx, className, 4200)[0];
    const sectionEnd = window ? window.after.indexOf('</section>') : -1;
    const sectionSource = window && sectionEnd >= 0 ? window.after.slice(0, sectionEnd) : window?.after || '';
    const literalCount = sectionSource ? matches(sectionSource, /<svg\b/gi).length : 0;
    const helperCount = ctx.mode === 'demo' && sectionSource
      ? matches(sectionSource, /\b(?:svg|iconItem|tile|service)\(\s*['"][^'"]+['"]/gi).length
      : 0;
    const count = literalCount + helperCount;
    if (count < expected) {
      push(ctx.errors, 'B39', `v1.0.10 我页 ${label} 必须使用完整黑色 stroke-only 线框图标，当前 ${count}/${expected}`, lineOf(ctx.html, window?.index || 1));
      return;
    }
  }
  const walletWindow = classWindows(ctx, 'wallet-grid', 1800)[0];
  if (walletWindow) {
    const walletEnd = walletWindow.after.indexOf('</section>');
    const walletSource = walletEnd >= 0 ? walletWindow.after.slice(0, walletEnd) : walletWindow.after;
    if (/<svg\b/i.test(walletSource)) {
      push(ctx.errors, 'B39', 'v1.0.10 我页钱包模块是纯数字/文本资产摘要，不得添加线框图标造成截图节奏错乱', lineOf(ctx.html, walletWindow.index));
    }
  }
}

function checkB40ProfileServiceGridSpacing(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bprofile-page\b/i.test(ctx.html)) return;
  const couponModule = cssRulesForClass(ctx, 'coupon-module')[0];
  const serviceModule = cssRulesForClass(ctx, 'service-module')[0];
  const serviceGrid = cssRulesForClass(ctx, 'service-grid').find(rule => /\brow-gap\s*:/i.test(rule.text));
  const serviceItem = cssRulesForClass(ctx, 'service-item').find(rule => /font-size\s*:\s*12px/i.test(rule.text));
  if (!couponModule || !hasPxInRange(couponModule.text, 'height', 84, 96)) {
    push(ctx.errors, 'B40', 'v1.0.10 我页省钱神券模块高度必须保持 84-96px 紧凑区间，避免大块空白', lineOf(ctx.html, couponModule?.index || 1));
    return;
  }
  if (!serviceModule || !hasPxInRange(serviceModule.text, 'height', 112, 132)) {
    push(ctx.errors, 'B40', 'v1.0.10 我页服务入口模块高度必须保持截图级紧凑密度，不得被拉散', lineOf(ctx.html, serviceModule?.index || 1));
    return;
  }
  if (!serviceGrid || !hasPxInRange(serviceGrid.text, 'row-gap', 8, 12)) {
    push(ctx.errors, 'B40', 'v1.0.10 我页服务八宫格 row-gap 必须落在 8-12px 截图区间', lineOf(ctx.html, serviceGrid?.index || 1));
    return;
  }
  if (!serviceItem || !/font-size\s*:\s*12px/i.test(serviceItem.text)) {
    push(ctx.errors, 'B40', 'v1.0.10 我页服务入口文字必须保持 12px 截图字号', lineOf(ctx.html, serviceItem?.index || 1));
  }
}

function checkB42AllSurfaceTypographyFootprint(ctx) {
  if (!hasScreenshotEvidenceV8(ctx)) return;
  const rules = [
    [/\.search-box\b[^{}]*\{[^{}]*\}/gis, '搜索框文字', 16, 38, 42],
    [/\.top-tabs\s+span\b[^{}]*\{[^{}]*\}/gis, '社区频道 inactive', 16, 28, 32],
    [/\.top-tabs\s+span\.active\b[^{}]*\{[^{}]*\}/gis, '社区频道 active', 19, 29, 33],
    [/\.commerce-tabs\s+span\b[^{}]*\{[^{}]*\}/gis, '购买频道 inactive', 16, 28, 32],
    [/\.commerce-tabs\s+span\.active\b[^{}]*\{[^{}]*\}/gis, '购买频道 active', 19, 29, 33],
    [/\.channel(?![-\w])[^{}]*\{[^{}]*\}/gis, '购买宫格入口', 13, 15, 17],
    [/\.trust-row\b[^{}]*\{[^{}]*\}/gis, '购买信任背书', 15, null, null],
    [/\.product-card\s+\.buyers\b[^{}]*\{[^{}]*\}/gis, '购买付款人数', 13, null, null],
    [/\.utility-row\s+h3\b[^{}]*\{[^{}]*\}/gis, '探索入口标题', 19, null, null],
    [/\.utility-row\s+p\b[^{}]*\{[^{}]*\}/gis, '探索入口说明', 13, null, null],
    [/\.detail-author\s+\.left\b[^{}]*\{[^{}]*\}/gis, '详情作者昵称', 15, null, null],
    [/\.comment\s+p\b[^{}]*\{[^{}]*\}/gis, '详情评论正文', 15, 20, 22],
    [/\.tab\b[^{}]*\{[^{}]*\}/gis, '底部 Tab label', 13, 15, 17],
  ];
  for (const [re, label, fontSize, lineMin, lineMax] of rules) {
    const match = matches(ctx.html, re)[0];
    if (!match) {
      push(ctx.errors, 'B42', `缺少全页面截图字号规则：${label}`, 1);
      return;
    }
    const rule = match[0];
    const font = cssNumber(rule, 'font-size');
    if (font !== fontSize) {
      push(ctx.errors, 'B42', `${label} 字号必须按截图 footprint 固化为 ${fontSize}px；当前 ${font ?? '缺失'}`, lineOf(ctx.html, match.index));
      return;
    }
    if (lineMin !== null) {
      const line = cssNumber(rule, 'line-height');
      if (line === null || line < lineMin || line > lineMax) {
        push(ctx.errors, 'B42', `${label} line-height 必须落在截图区间 ${lineMin}-${lineMax}px`, lineOf(ctx.html, match.index));
        return;
      }
    }
  }
}

function checkB41ProfileNicknameEvidencePool(ctx) {
  if (!hasScreenshotEvidenceV8(ctx) || !/\bprofile-page\b/i.test(ctx.html)) return;
  const profileNameRule = cssRulesForClass(ctx, 'profile-name')[0];
  if (!profileNameRule || !/font-size\s*:\s*18px/i.test(profileNameRule.text) || !hasPxInRange(profileNameRule.text, 'line-height', 21, 23)) {
    push(ctx.errors, 'B41', 'v1.0.10 我页昵称必须按截图收敛为 18px / 21-23px line-height', lineOf(ctx.html, profileNameRule?.index || 1));
    return;
  }
  const windows = classWindows(ctx, 'profile-name', 700);
  for (const window of windows) {
    const end = window.after.search(/<\/div>|<\/span>|<\/h[1-6]>/i);
    const source = stripTags(end >= 0 ? window.after.slice(0, end) : window.after);
    const normalized = source.replace(/[^\u3400-\u9fffA-Za-z0-9_]+/g, '');
    const allowed = PROFILE_NICKNAME_POOL.some(name => {
      const compact = name.replace(/[^\u3400-\u9fffA-Za-z0-9_]+/g, '');
      return normalized.includes(compact);
    });
    if (!allowed) {
      push(ctx.errors, 'B41', `我页昵称必须来自 Dewu 截图证据昵称池，不能自由编造：${source.slice(0, 48)}`, lineOf(ctx.html, window.index));
      return;
    }
  }
}

function checkB43DemoRenderedDomContract(ctx) {
  if (ctx.mode !== 'demo' || !/(Dewu|得物|dewu-screenshot-v8|DEWU_SCREENSHOT_EVIDENCE)/i.test(ctx.html)) return;

  const hiddenEvidencePatterns = [
    /<template\b[^>]*(?:dewu-static-preflight-evidence|preflight|evidence)[^>]*>/i,
    /(?:display\s*:\s*none|hidden\b|aria-hidden\s*=\s*["']true["'])[\s\S]{0,240}(?:preflight|evidence|dewu-static)/i,
    /(?:preflight|evidence|dewu-static)[\s\S]{0,240}(?:display\s*:\s*none|hidden\b|aria-hidden\s*=\s*["']true["'])/i,
  ];
  for (const pattern of hiddenEvidencePatterns) {
    const match = pattern.exec(ctx.html);
    if (match) {
      push(ctx.errors, 'B43', 'Dewu demo 不得使用隐藏 preflight/evidence 模板通过校验；截图规则必须作用于实际可见 DOM', lineOf(ctx.html, match.index));
      return;
    }
  }

  const aliasMatch = /\btabbarx\b/i.exec(ctx.html);
  if (aliasMatch) {
    push(ctx.errors, 'B43', 'Dewu demo 可见底栏必须使用 .tabbar，并接受同一套截图规则；禁止 .tabbarx 等校验绕行别名', lineOf(ctx.html, aliasMatch.index));
    return;
  }

  if (/function\s+Tabbar|const\s+Tabbar|=>\s*`<nav/i.test(ctx.html) && !/<nav\s+class\s*=\s*["']tabbar["']|class\s*=\s*["'][^"']*\btabbar\b/i.test(ctx.html)) {
    push(ctx.errors, 'B43', 'Dewu demo 动态 Tabbar 必须渲染为可校验的 .tabbar，而不是只在脚本字符串或隐藏模板中出现', 1);
  }
}

export default [
  checkB01Signature,
  checkB02BottomTabs,
  checkB03TopTabs,
  checkB04LegacyTokens,
  checkB05BrandAccentToken,
  checkB06FiveTabGrid,
  checkB07MainPriceRed,
  checkB08BottomTabIcons,
  checkB09BottomTabActiveColor,
  checkB10Type2NoTabs,
  checkB11FeedGridColumns,
  checkB12BottomTabStrokeOnly,
  checkB13FeedLikeConsistency,
  checkB14RecommendNoInventedChipRow,
  checkB15FeedCardNoAuthNewLabels,
  checkB16TopTabUnderlineScreenshotPriority,
  checkB17RecommendTopTabActive,
  checkB18BuyCategoryMenuIcon,
  checkB19BuySpacingBaseline,
  checkB20NoPhoneInternalHorizontalOverflow,
  checkB21UploadedTypographyAndWrap,
  checkB22ProfileHeaderNotCollapsed,
  checkB23ScreenshotSurfaceGeometry,
  checkB24ScreenshotPixelRhythm,
  checkB25ScreenshotVisibleText,
  checkB26ScreenshotCoordinateAnchors,
  checkB27LongScreenshotScrollModel,
  checkB28DetailType2NoBottomTab,
  checkB29DetailHeroOverlayAndActionbar,
  checkB30LongFeedMasonryDensity,
  checkB31ProfileScrolledDashboardModules,
  checkB32CommerceLongProductDensity,
  checkB33LongScreenshotActuallyScrollable,
  checkB34BuyTopExactTextAndRhythm,
  checkB35TypographyFootprint,
  checkB36ProfileLowerDashboardScrollable,
  checkB37ProfileDashboardViewportRhythm,
  checkB38ProfileDashboardStackRhythm,
  checkB39ProfileDashboardLineIcons,
  checkB40ProfileServiceGridSpacing,
  checkB41ProfileNicknameEvidencePool,
  checkB42AllSurfaceTypographyFootprint,
  checkB43DemoRenderedDomContract,
];
