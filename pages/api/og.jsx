import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'edge',
}

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#0d0d1a',
          padding: '80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景グラデーション */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '700px',
            height: '630px',
            background: 'radial-gradient(ellipse at 30% 50%, #1e2d5a 0%, transparent 70%)',
          }}
        />

        {/* 左アクセントライン */}
        <div
          style={{
            position: 'absolute',
            left: '64px',
            top: '160px',
            width: '4px',
            height: '140px',
            background: '#e94560',
            borderRadius: '2px',
          }}
        />

        {/* タイトル */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginLeft: '24px',
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: '80px',
              fontWeight: '900',
              color: '#e94560',
              letterSpacing: '-2px',
              lineHeight: 1.1,
              marginBottom: '16px',
            }}
          >
            DMM Renamer
          </div>

          <div
            style={{
              fontSize: '28px',
              color: '#8892a4',
              marginBottom: '48px',
              letterSpacing: '-0.5px',
            }}
          >
            DMMファイルを自動でリネーム
          </div>

          {/* 変換例ボックス */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#16213e',
              border: '1px solid #1e3a6e',
              borderRadius: '12px',
              padding: '24px 28px',
              maxWidth: '760px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: '#3a4a5a',
                letterSpacing: '2px',
                marginBottom: '12px',
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              BEFORE → AFTER
            </div>
            <div
              style={{
                fontSize: '22px',
                color: '#8892a4',
                fontFamily: 'monospace',
                marginBottom: '8px',
                display: 'flex',
              }}
            >
              miaa00629mhb.dcv
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#3a4a5a',
                marginBottom: '8px',
                display: 'flex',
              }}
            >
              ↓
            </div>
            <div
              style={{
                fontSize: '22px',
                color: '#4ecca3',
                fontFamily: 'monospace',
                display: 'flex',
              }}
            >
              [MIAA-629] Title - Actress.dcv
            </div>
          </div>
        </div>

        {/* 右側装飾 */}
        <div
          style={{
            position: 'absolute',
            right: '80px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {['FREE', 'No Upload', 'Win/Mac/Linux'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '8px 20px',
                background: '#16213e',
                border: '1px solid #1e3a6e',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#8892a4',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '88px',
            fontSize: '18px',
            color: '#2a3a4a',
            display: 'flex',
          }}
        >
          dmm-rename-web.vercel.app
        </div>

        {/* 18+バッジ */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            right: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '2px solid #3a4a5a',
            fontSize: '14px',
            fontWeight: '900',
            color: '#3a4a5a',
          }}
        >
          18+
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
