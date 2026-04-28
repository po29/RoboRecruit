import { Company } from '../../types'

interface TechHeatmapProps {
  companies: Company[]
}

const CELL_W = 80
const CELL_H = 28
const ROW_LABEL_W = 160
const COL_LABEL_H = 60

export function TechHeatmap({ companies }: TechHeatmapProps) {
  if (companies.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        No companies to display. Adjust filters.
      </div>
    )
  }

  // Collect all unique techs across visible companies, sorted
  const allTechs = [...new Set(companies.flatMap(c => c.techStack.map(t => t.name)))].sort()

  const totalW = ROW_LABEL_W + allTechs.length * CELL_W
  const totalH = COL_LABEL_H + companies.length * CELL_H

  return (
    <div className="overflow-x-auto">
      <svg
        width={totalW}
        height={totalH}
        style={{ display: 'block', minWidth: totalW }}
        aria-label="Tech stack heatmap"
      >
        {/* Column labels (tech names) */}
        {allTechs.map((tech, ci) => (
          <text
            key={tech}
            x={ROW_LABEL_W + ci * CELL_W + CELL_W / 2}
            y={COL_LABEL_H - 6}
            textAnchor="end"
            dominantBaseline="middle"
            transform={`rotate(-40, ${ROW_LABEL_W + ci * CELL_W + CELL_W / 2}, ${COL_LABEL_H - 6})`}
            className="fill-slate-400"
            style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
          >
            {tech}
          </text>
        ))}

        {/* Row labels (company names) + cells */}
        {companies.map((company, ri) => {
          const y = COL_LABEL_H + ri * CELL_H
          const techSet = new Set(company.techStack.map(t => t.name))

          return (
            <g key={company.id}>
              {/* Company name label */}
              <text
                x={ROW_LABEL_W - 8}
                y={y + CELL_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-300"
                style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {company.name.length > 18 ? company.name.slice(0, 16) + '…' : company.name}
              </text>

              {/* Row background alternate */}
              {ri % 2 === 0 && (
                <rect
                  x={ROW_LABEL_W}
                  y={y}
                  width={allTechs.length * CELL_W}
                  height={CELL_H}
                  fill="#0d1220"
                  opacity={0.5}
                />
              )}

              {/* Cells */}
              {allTechs.map((tech, ci) => {
                const has = techSet.has(tech)
                return (
                  <g key={tech}>
                    <rect
                      x={ROW_LABEL_W + ci * CELL_W + 1}
                      y={y + 1}
                      width={CELL_W - 2}
                      height={CELL_H - 2}
                      rx={3}
                      fill={has ? 'rgba(0,229,255,0.18)' : 'rgba(30,58,95,0.12)'}
                      stroke={has ? 'rgba(0,229,255,0.35)' : 'rgba(30,58,95,0.3)'}
                      strokeWidth={has ? 1 : 0.5}
                    />
                    {has && (
                      <text
                        x={ROW_LABEL_W + ci * CELL_W + CELL_W / 2}
                        y={y + CELL_H / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#00e5ff"
                        style={{ fontSize: 10 }}
                      >
                        ✓
                      </text>
                    )}
                    <title>{`${company.name} — ${tech}: ${has ? 'Yes' : 'No'}`}</title>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
