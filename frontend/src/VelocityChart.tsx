interface DataPoint {
  label: string
  points: number
  key: string
  isHighlight?: boolean
  isPlanned?: boolean
  shareXWith?: string  // このキーと同じX座標を使う
}

interface Props {
  data: DataPoint[]
  onPointClick?: (key: string) => void
}

const W = 900
const H = 260
const PAD = { top: 32, right: 32, bottom: 56, left: 44 }
const innerW = W - PAD.left - PAD.right
const innerH = H - PAD.top - PAD.bottom
const GRID_LINES = 4

export function VelocityChart({ data, onPointClick }: Props) {
  const maxPoints = Math.max(...data.map((d) => d.points), 1)
  const roundedMax = Math.ceil(maxPoints / 5) * 5

  // shareXWith を持つ点は位置計算から除外し、参照先と同じXを使う
  const layoutData = data.filter((d) => !d.shareXWith)
  const layoutPts = layoutData.map((item, i) => ({
    x: PAD.left + (layoutData.length === 1 ? innerW / 2 : (i / (layoutData.length - 1)) * innerW),
    y: PAD.top + innerH - (item.points / roundedMax) * innerH,
    item,
  }))
  const keyToX = new Map(layoutPts.map((p) => [p.item.key, p.x]))

  const pts = data.map((item) => {
    const x = item.shareXWith !== undefined
      ? (keyToX.get(item.shareXWith) ?? 0)
      : (keyToX.get(item.key) ?? 0)
    return {
      x,
      y: PAD.top + innerH - (item.points / roundedMax) * innerH,
      item,
    }
  })

  const pastPts = pts.filter((p) => !p.item.isPlanned)
  const plannedPts = pts.filter((p) => p.item.isPlanned).sort((a, b) => a.x - b.x)
  const joinPt = pastPts[pastPts.length - 1]

  const pastPolyline = pastPts.map((p) => `${p.x},${p.y}`).join(" ")
  const plannedPolyline = joinPt
    ? [joinPt, ...plannedPts].map((p) => `${p.x},${p.y}`).join(" ")
    : plannedPts.map((p) => `${p.x},${p.y}`).join(" ")

  const areaPath =
    pastPts.length > 0
      ? `M ${pastPts[0].x},${PAD.top + innerH} ` +
        pastPts.map((p) => `L ${p.x},${p.y}`).join(" ") +
        ` L ${pastPts[pastPts.length - 1].x},${PAD.top + innerH} Z`
      : ""

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="velocity-svg">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
        const y = PAD.top + (innerH / GRID_LINES) * i
        const val = Math.round(roundedMax - (roundedMax / GRID_LINES) * i)
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#ddd6fe" strokeWidth={i === GRID_LINES ? "1.5" : "1"} />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#c4b5fd">{val}</text>
          </g>
        )
      })}

      <path d={areaPath} fill="url(#areaGrad)" />

      {pastPolyline && (
        <polyline points={pastPolyline} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="velocity-line" />
      )}
      {plannedPolyline && plannedPts.length > 0 && (
        <polyline points={plannedPolyline} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
      )}
      {pts.map((p) => (
        <g
          key={p.item.key}
          onClick={() => onPointClick?.(p.item.key)}
          style={{ cursor: onPointClick ? "pointer" : "default" }}
          className="velocity-point-group"
        >
          {p.item.isHighlight && (
            <circle cx={p.x} cy={p.y} r="10" fill="#f59e0b" fillOpacity="0.18" />
          )}
          <circle
            cx={p.x}
            cy={p.y}
            r="5"
            fill={p.item.isPlanned ? "#fff" : p.item.isHighlight ? "#d97706" : "#f59e0b"}
            stroke={p.item.isPlanned ? "#fbbf24" : "#fff"}
            strokeWidth="2"
            opacity={p.item.isPlanned ? 0.8 : 1}
            filter={p.item.isPlanned ? undefined : "url(#glow)"}
          />
          {p.item.points > 0 && (
            <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="11" fontWeight="700" fill={p.item.isPlanned ? "#d97706" : "#b45309"} opacity={p.item.isPlanned ? 0.8 : 1}>
              {p.item.points}
            </text>
          )}
          {!p.item.shareXWith && (
            <text
              x={p.x}
              y={PAD.top + innerH + 10}
              textAnchor="end"
              fontSize="11"
              fill={p.item.isHighlight ? "#b45309" : "#9d8ec0"}
              fontWeight={p.item.isHighlight ? "700" : "400"}
              transform={`rotate(-40, ${p.x}, ${PAD.top + innerH + 10})`}
            >
              {p.item.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
