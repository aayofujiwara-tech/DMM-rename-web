const sharp = require('sharp')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0d0d1a"/>
  <defs>
    <radialGradient id="g" cx="30%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e2d5a" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0d0d1a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="64" y="160" width="4" height="140" fill="#e94560" rx="2"/>
  <text x="108" y="270" font-family="Arial Black,sans-serif" font-size="80" font-weight="900" fill="#e94560" letter-spacing="-2">DMM Renamer</text>
  <text x="108" y="325" font-family="Arial,sans-serif" font-size="28" fill="#8892a4">DMM&#12501;&#12449;&#12452;&#12523;&#12434;&#33258;&#21205;&#12391;&#12522;&#12493;&#12540;&#12512;</text>
  <rect x="88" y="360" width="780" height="140" rx="12" fill="#16213e"/>
  <rect x="88" y="360" width="780" height="140" rx="12" fill="none" stroke="#1e3a6e" stroke-width="1"/>
  <text x="120" y="392" font-family="Arial,sans-serif" font-size="13" fill="#3a4a5a" letter-spacing="2">BEFORE &#8594; AFTER</text>
  <text x="120" y="428" font-family="Courier New,monospace" font-size="24" fill="#8892a4">miaa00629mhb.dcv</text>
  <text x="120" y="458" font-family="Arial,sans-serif" font-size="16" fill="#3a4a5a">&#8595;</text>
  <text x="120" y="488" font-family="Courier New,monospace" font-size="22" fill="#4ecca3">[MIAA-629] Title - Actress.dcv</text>
  <text x="108" y="596" font-family="Arial,sans-serif" font-size="18" fill="#2a3a4a">dmm-rename-web.vercel.app</text>
  <circle cx="1148" cy="590" r="28" fill="none" stroke="#3a4a5a" stroke-width="2"/>
  <text x="1148" y="597" font-family="Arial Black,sans-serif" font-size="14" fill="#3a4a5a" text-anchor="middle" font-weight="900">18+</text>
</svg>`

sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toFile('public/ogp.png')
  .then(() => console.log('public/ogp.png 生成完了'))
  .catch(err => { console.error(err); process.exit(1) })
