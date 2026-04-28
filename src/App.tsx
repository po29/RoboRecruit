import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { HeatmapView } from './views/HeatmapView'
import { JobsView } from './views/JobsView'
import { LandscapeView } from './views/LandscapeView'
import { SkillGraphView } from './views/SkillGraphView'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<LandscapeView />} />
          <Route path="heatmap" element={<HeatmapView />} />
          <Route path="skills" element={<SkillGraphView />} />
          <Route path="jobs" element={<JobsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
