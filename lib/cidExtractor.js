/**
 * .dcvファイル名からcidと品番ラベルを抽出する
 *
 * 実例:
 *   masm00001hhb.dcv           → { cid: 'masm00001', label: 'MASM-1' }
 *   1dandy00812a2d_v1_drm_a_4k.dcv → { cid: '1dandy00812', label: 'DANDY-812' }
 *   miaa00629mhb.dcv           → { cid: 'miaa00629', label: 'MIAA-629' }
 *   bmw00211mhb1.dcv           → { cid: 'bmw00211', label: 'BMW-211' }
 *   bmw00272mhb2.dcv           → { cid: 'bmw00272', label: 'BMW-272' }
 */
export function extractCid(filename) {
  // パス区切り文字より後ろのファイル名のみ使用（パストラバーサル対策）
  filename = filename.replace(/.*[/\\]/, '')
  let s = filename

  // 1. 拡張子除去
  s = s.replace(/\.dcv$/i, '')

  // 2. 画質・DRMサフィックス除去（例: _v1_drm_a_4k）
  s = s.replace(/_(v\d+_)?drm_[a-z0-9_]+$/i, '')

  // 3. 末尾のエンコード種別と分割番号を抽出（例: mhb1 → partNumber=1）
  const partMatch = s.match(/(hhb|mhb|a2d|dm)(\d+)$/i)
  const partNumber = partMatch ? parseInt(partMatch[2], 10) : null

  // dm対応を追加（例: ipt00016dm1 → ipt00016）
  s = s.replace(/(hhb\d*|mhb\d*|a2d\d*|dm\d*)$/i, '')

  // 4. 2桁以上の数字プレフィックスを持つ系列はFANZAのCIDが番号のゼロなし形式を使う
  //    例: 12gld00208 → 12gld208（prex保持、番号ゼロ除去）
  //        1dandy00812 → 1dandy00812（1桁prefixはゼロ保持）
  const raw = s.toLowerCase()
  const numPrefixMatch = raw.match(/^(\d{2,})([a-z]+)0*(\d+)$/)
  const cid = numPrefixMatch
    ? `${numPrefixMatch[1]}${numPrefixMatch[2]}${parseInt(numPrefixMatch[3], 10)}`
    : raw

  // 5. 品番ラベル生成（各プレフィックスパターンを除いてシリーズ名+番号を抽出）
  //    例: 1dandy00812 → DANDY-812 / h_1472fanh00152 → FANH-152
  const match = cid.match(/^(?:\d+|[a-z]_\d+)?([a-z]+)(\d+)$/)
  const label = match
    ? `${match[1].toUpperCase()}-${parseInt(match[2], 10)}`
    : cid.toUpperCase()

  return { cid, label, partNumber }
}

/**
 * テキストエリアの入力（複数行）を一括処理
 */
export function extractCidList(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(filename => ({ filename, ...extractCid(filename) }))
}
