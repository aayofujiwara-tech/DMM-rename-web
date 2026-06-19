export interface CidResult {
  cid: string
  label: string
  partNumber: number | null
}

export function extractCid(filename: string): CidResult {
  filename = filename.replace(/.*[/\\]/, '')
  let s = filename

  const isWsdcf = /\.wsdcf$/i.test(s)

  s = s.replace(/\.(dcv|wsdcf)$/i, '')

  let cid: string
  let partNumber: number | null = null

  if (isWsdcf) {
    const vrMatch = s.match(/^(\d*[a-z]+\d+)/i)
    cid = (vrMatch ? vrMatch[1] : s).toLowerCase()
  } else {
    s = s.replace(/_(v\d+_)?drm_[a-z0-9_]+$/i, '')

    // 末尾の数字(hhb1, mhb2等)はエンコーダーIDでありディスク番号ではない
    s = s.replace(/(hhb\d*|mhb\d*|a2d\d*|dmb?\d*)$/i, '')
    s = s.replace(/2ds?$/i, '')

    cid = s.toLowerCase()
  }

  const match = cid.match(/^(?:\d+|[a-z]_\d+)?([a-z]+)(\d+)$/)
  const label = match
    ? `${match[1].toUpperCase()}-${parseInt(match[2], 10)}`
    : cid.toUpperCase()

  return { cid, label, partNumber }
}
