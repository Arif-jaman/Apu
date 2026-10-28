/* ===== Rules from the shipping chart (edit here – nothing else is hard-coded) ===== */
const CONFIG = {
  freeFrom: 30000,          // 30,000円以上: 運賃元払い (free for customer), except Okinawa/islands
  remoteFreeFrom: 50000,    // Okinawa / islands: under this amount the fee is charged
  nekopos: 350,             // ネコポス: nationwide flat rate (A4, 2.5cm, 1kg)
  nekoposFreeAtThreshold: false, // chart says flat 350 nationwide; set true if free at 30,000+
  remote: {
    seino:  { label: '西濃運輸', fee: 2200, eta: '1週間程度', freeAtThreshold: true },
    yamato: { label: 'ヤマト運輸', fee: 3000, eta: '3日程度', freeAtThreshold: false } // 注文額に関わらず3,000円
  },
  zones: { // color follows the chart map. "jp|English"
    orange: { label: '関東・東海・北陸・信越', fee: 800,  color: '#f97316', prefs: ['茨城県|Ibaraki','栃木県|Tochigi','群馬県|Gunma','埼玉県|Saitama','千葉県|Chiba','東京都|Tokyo','神奈川県|Kanagawa','山梨県|Yamanashi','新潟県|Niigata','長野県|Nagano','富山県|Toyama','石川県|Ishikawa','福井県|Fukui','岐阜県|Gifu','静岡県|Shizuoka','愛知県|Aichi','三重県|Mie','福島県|Fukushima','滋賀県|Shiga'] },
    green:  { label: '近畿・東北',           fee: 1000, color: '#65a30d', prefs: ['青森県|Aomori','岩手県|Iwate','宮城県|Miyagi','秋田県|Akita','山形県|Yamagata','京都府|Kyoto','大阪府|Osaka','兵庫県|Hyogo','奈良県|Nara','和歌山県|Wakayama'] },
    blue:   { label: '四国・中国',           fee: 1100, color: '#0284c7', prefs: ['鳥取県|Tottori','島根県|Shimane','岡山県|Okayama','広島県|Hiroshima','山口県|Yamaguchi','徳島県|Tokushima','香川県|Kagawa','愛媛県|Ehime','高知県|Kochi'] },
    navy:   { label: '北海道・九州',         fee: 1400, color: '#3b4cca', prefs: ['北海道|Hokkaido','福岡県|Fukuoka','佐賀県|Saga','長崎県|Nagasaki','熊本県|Kumamoto','大分県|Oita','宮崎県|Miyazaki','鹿児島県|Kagoshima'] },
    pink:   { label: '沖縄県・離島',         fee: 2200, color: '#db2777', prefs: ['沖縄県|Okinawa'] }
  }
};

/* ===== Prefecture database (47) ===== */
const PREFS = Object.entries(CONFIG.zones).flatMap(([zone, z]) => z.prefs.map(p => { const [jp, en] = p.split('|'); return { jp, en, zone }; }));
const $ = id => document.getElementById(id), yen = n => '¥' + Number(n).toLocaleString('en-US');
const find = jp => PREFS.find(p => p.jp === jp);

/* ===== Calculator ===== */
// method: 'std' | 'neko' | 'seino' | 'yamato'
function calculateShippingFee(prefecture, orderTotal, method = 'std', island = false) {
  const p = find(prefecture); if (!p) return null;
  const z = CONFIG.zones[p.zone], remote = p.zone === 'pink' || island;
  let fee = z.fee, threshold = CONFIG.freeFrom, freeOk = true, carrier = '', eta = '';
  if (method === 'neko') { fee = CONFIG.nekopos; freeOk = CONFIG.nekoposFreeAtThreshold; carrier = 'ネコポス'; }
  else if (remote) {
    const c = CONFIG.remote[method === 'yamato' ? 'yamato' : 'seino'];
    fee = c.fee; freeOk = c.freeAtThreshold; threshold = CONFIG.remoteFreeFrom; carrier = c.label; eta = c.eta;
  }
  const free = freeOk && orderTotal >= threshold;
  return { prefecture, zone: p.zone, region: remote && p.zone !== 'pink' ? z.label.split('・')[0] + '（離島）' : z.label, color: remote ? CONFIG.zones.pink.color : z.color,
           baseFee: fee, shippingFee: free ? 0 : fee, freeShipping: free, threshold: freeOk ? threshold : null, carrier, eta, remote, method };
}

/* ===== UI ===== */
function buildStatic() {
  $('pref').innerHTML = '<option value="">選択してください / Select</option>' + Object.values(CONFIG.zones).map(z =>
    `<optgroup label="${z.label}">${PREFS.filter(p => CONFIG.zones[p.zone] === z).map(p => `<option value="${p.jp}">${p.jp} (${p.en})</option>`).join('')}</optgroup>`).join('');
  const z = CONFIG.zones, r = CONFIG.remote;
  $('rates').innerHTML = Object.values(z).map(x => `<tr><td><span class="dot" style="background:${x.color}"></span>${x.label}</td><td>${x.prefs.length === 1 ? `${yen(r.seino.fee)}（${r.seino.label} ${r.seino.eta}）<br>${yen(r.yamato.fee)}（${r.yamato.label} ${r.yamato.eta}）` : yen(x.fee)}</td></tr>`).join('') +
    `<tr><td>ネコポス（A4・厚さ2.5cm・1kgまで）</td><td>${yen(CONFIG.nekopos)} 全国一律（期日指定不可）</td></tr>
     <tr><td>送料無料</td><td>${yen(CONFIG.freeFrom)}以上（沖縄・離島は${yen(CONFIG.remoteFreeFrom)}以上・ヤマト指定を除く）</td></tr>`;
}
function methodsFor(remote) {
  const m = remote ? [['seino', `${CONFIG.remote.seino.label}`, `${yen(CONFIG.remote.seino.fee)} · ${CONFIG.remote.seino.eta}`], ['yamato', `${CONFIG.remote.yamato.label}`, `${yen(CONFIG.remote.yamato.fee)} · ${CONFIG.remote.yamato.eta}（注文額に関わらず）`]]
                    : [['std', '通常配送（宅配）', '地域別の送料']];
  m.push(['neko', 'ネコポス（DM便）', `${yen(CONFIG.nekopos)} 全国一律 · A4・厚さ2.5cm・1kgまで · 日時指定不可`]);
  return m;
}
function update() {
  const pref = $('pref').value, island = $('island').checked, total = Math.max(0, +$('amount').value || 0), p = find(pref);
  const remote = !!p && (p.zone === 'pink' || island);
  const cur = document.querySelector('input[name=method]:checked')?.value, list = methodsFor(remote);
  const method = list.some(x => x[0] === cur) ? cur : list[0][0];
  $('methods').innerHTML = list.map(([v, t, s]) => `<label class="opt"><input type="radio" name="method" value="${v}" ${v === method ? 'checked' : ''}><span>${t}<small class="note">${s}</small></span></label>`).join('');
  const r = calculateShippingFee(pref, total, method, island);
  if (!r) { $('result').innerHTML = '<p class="note">都道府県を選ぶか、住所・郵便番号を入力してください。<br>Enter an address or choose a prefecture to see the shipping fee.</p>'; return; }
  const pct = r.threshold ? Math.min(100, Math.round(total / r.threshold * 100)) : 0;
  $('result').innerHTML = `
    <div>📦 配送先 <b>${r.prefecture}</b> &nbsp; 🗾 <span class="zone" style="background:${r.color}">${r.region}</span></div>
    <div class="big ${r.freeShipping ? 'free' : ''}">${r.freeShipping ? '送料無料' : yen(r.shippingFee)}</div>
    <div class="note">${r.carrier ? '🚚 ' + r.carrier + (r.eta ? '（' + r.eta + '）' : '') : '🚚 通常配送'} · ${r.freeShipping ? '運賃元払い（無料）' : '立替運賃'}</div>
    ${r.threshold && !r.freeShipping ? `<div class="bar"><i style="width:${pct}%"></i></div><div class="note">あと <b>${yen(r.threshold - total)}</b> で送料無料（${yen(r.threshold)}以上）</div>` : ''}
    ${r.method === 'yamato' ? '<div class="note">ヤマト運輸指定の場合は、注文額に関わらず送料がかかります。</div>' : ''}
    ${r.method === 'neko' ? '<div class="note">ネコポスは宅急便と異なり、期日指定はできません。</div>' : ''}
    <div style="margin-top:10px"><div class="row"><span>商品合計</span><span>${yen(total)}</span></div>
    <div class="row"><span>送料</span><span>${r.freeShipping ? '無料' : yen(r.shippingFee)}</span></div>
    <div class="row tot"><span>お支払い合計</span><span>${yen(total + r.shippingFee)}</span></div></div>
    <p class="note">※送料は当店の配送規定に基づいて計算しています。運送店の都合により変わる場合があります。</p>`;
}
/* ===== Address detection: works with ANY address text =====
   Order: 1) prefecture name in the text  2) postal code (online lookup)
          3) well-known city/ward names  4) English name (Tokyo, Osaka …)  5) manual select */
const HINTS = { // unambiguous city / ward / short names -> prefecture (extend freely)
  '東京都': ['東京','千代田区','新宿区','文京区','台東区','墨田区','江東区','品川区','目黒区','大田区','世田谷区','渋谷区','中野区','杉並区','豊島区','荒川区','板橋区','練馬区','足立区','葛飾区','江戸川区','池袋','秋葉原'],
  '神奈川県': ['神奈川','横浜市','川崎市','相模原市','横須賀市'], '愛知県': ['愛知','名古屋市','豊田市'], '北海道': ['札幌市','函館市'],
  '福岡県': ['福岡','福岡市','北九州市'], '宮城県': ['仙台市'], '兵庫県': ['神戸市','姫路市'], '大阪府': ['大阪','大阪市','堺市'],
  '京都府': ['京都','京都市'], '広島県': ['広島市'], '沖縄県': ['沖縄','那覇市'], '千葉県': ['千葉市','船橋市','成田市'],
  '埼玉県': ['さいたま市','川口市'], '静岡県': ['浜松市','静岡市'], '新潟県': ['新潟市'], '岡山県': ['岡山市'], '熊本県': ['熊本市'], '鹿児島県': ['鹿児島市']
};
function detectFromText(t) {
  const s = t.normalize('NFKC'), low = s.toLowerCase();
  let p = PREFS.find(x => s.includes(x.jp)); if (p) return { pref: p.jp, how: '住所の都道府県名から' };
  for (const [jp, list] of Object.entries(HINTS)) if (list.some(k => s.includes(k))) return { pref: jp, how: '市区町村名から推定' };
  p = PREFS.find(x => new RegExp('\\b' + x.en.toLowerCase() + '\\b').test(low)); if (p) return { pref: p.jp, how: '英語表記から' };
  return null;
}
const ZIP_RE = /(?<![\d-])(\d{3})-?(\d{4})(?![\d-])/, zipCache = {};
async function zipLookup(z) { // free Japan Post data via zipcloud (needs internet; fails safely)
  if (z in zipCache) return zipCache[z];
  try { const j = await (await fetch('https://zipcloud.ibsnet.co.jp/api/search?zipcode=' + z)).json(); return zipCache[z] = j.results?.[0] || null; } catch { return null; }
}
function setPref(jp, how) { manual = false; $('pref').value = jp; $('status').textContent = `📍 検出: ${jp}（${how}）`; }
let seq = 0, manual = false; // manual = user picked the prefecture by hand
async function onAddress() {
  const my = ++seq, addr = $('addr').value, text = (addr + ' ' + $('zip').value).normalize('NFKC');
  const t = detectFromText(addr); if (t) setPref(t.pref, t.how);
  const m = ZIP_RE.exec(text);
  if (m) {
    $('status').textContent = t ? $('status').textContent : '郵便番号を検索中…';
    const x = await zipLookup(m[1] + m[2]); if (my !== seq) return;
    if (x && find(x.address1)) { setPref(x.address1, `郵便番号 ${m[1]}-${m[2]} から`); if (!addr.trim()) $('addr').value = x.address1 + x.address2 + x.address3; }
    else if (!t) $('status').textContent = '郵便番号から検出できませんでした。都道府県を選択してください。(Could not look up – please select)';
  } else if (!t) { if (!manual) $('pref').value = ''; $('status').textContent = text.trim() ? '都道府県を検出できません。都道府県名を入れるか、下で選択してください。' : ''; }
  update();
}
$('addr').addEventListener('input', onAddress);
$('zip').addEventListener('input', onAddress);
$('pref').addEventListener('change', () => { manual = true; $('status').textContent = '手動で選択: ' + $('pref').value; });
$('samples').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { $('addr').value = b.textContent; onAddress(); } });
['amount', 'pref', 'island'].forEach(id => $(id).addEventListener('input', update));
$('methods').addEventListener('change', update);
buildStatic(); update();
