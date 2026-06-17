/**
 * .dcv / .wsdcf ファイル名からcidと品番ラベルを抽出する
 *
 * 実例 (.dcv):
 *   masm00001hhb.dcv               → { cid: 'masm00001',    label: 'MASM-1' }
 *   1dandy00812a2d_v1_drm_a_4k.dcv → { cid: '1dandy00812',  label: 'DANDY-812' }
 *   miaa00629mhb.dcv               → { cid: 'miaa00629',    label: 'MIAA-629' }
 *   bmw00211mhb1.dcv               → { cid: 'bmw00211',     label: 'BMW-211' }
 *   12gld00208mhb1.dcv             → { cid: '12gld00208',   label: 'GLD-208' }
 *   504aki00008dmb2.dcv            → { cid: '504aki00008',  label: 'AKI-8' }
 *
 * 実例 (.wsdcf VRコンテンツ):
 *   13dsvr01059vrv1uhqe1.wsdcf     → { cid: '13dsvr01059',  label: 'DSVR-1059' }
 *
 * ※ GLDのように2桁プレフィックス+ゼロパディングが不一致な系列は
 *    processFileのフォールバック処理（rename.js）でゼロ除去再検索する
 */
export function extractCid(filename) {
  // パス区切り文字より後ろのファイル名のみ使用（パストラバーサル対策）
  filename = filename.replace(/.*[/\\]/, '')
  let s = filename

  const isWsdcf = /\.wsdcf$/i.test(s)

  // 1. 拡張子除去（.dcv / .wsdcf）
  s = s.replace(/\.(dcv|wsdcf)$/i, '')

  let cid, partNumber = null

  if (isWsdcf) {
    // VRコンテンツ: 先頭の {数字}{英字}{数字} がCID、残りは画質サフィックス
    // 例: 13dsvr01059vrv1uhqe1 → 13dsvr01059
    const vrMatch = s.match(/^(\d*[a-z]+\d+)/i)
    cid = (vrMatch ? vrMatch[1] : s).toLowerCase()
  } else {
    // 通常コンテンツ (.dcv)

    // 2. 画質・DRMサフィックス除去（例: _v1_drm_a_4k）
    s = s.replace(/_(v\d+_)?drm_[a-z0-9_]+$/i, '')

    // 3. 末尾のエンコード種別と分割番号を抽出（例: mhb1 → partNumber=1, dmb2 → partNumber=2）
    // 対応: hhb / mhb / a2d / dm / dmb + 末尾数字
    const partMatch = s.match(/(hhb|mhb|a2d|dmb?)(\d+)$/i)
    partNumber = partMatch ? parseInt(partMatch[2], 10) : null

    s = s.replace(/(hhb\d*|mhb\d*|a2d\d*|dmb?\d*)$/i, '')

    // 2Dコンテンツサフィックスを除去（例: madm001742d → madm00174, midv003862d → midv00386）
    s = s.replace(/2ds?$/i, '')

    cid = s.toLowerCase()
  }

  // 4. 品番ラベル生成（各プレフィックスパターンを除いてシリーズ名+番号を抽出）
  //    例: 1dandy00812 → DANDY-812 / h_1472fanh00152 → FANH-152 / 13dsvr01059 → DSVR-1059
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
