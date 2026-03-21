import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import AppLayout from './components/layout/AppLayout'
import Hormigon from './pages/Hormigon'
import Acero from './pages/Acero'
import Cimentaciones from './pages/Cimentaciones'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppLayout />}>
          <Route path="hormigon" element={<Hormigon />} />
          <Route path="acero" element={<Acero />} />
          <Route path="cimentaciones" element={<Cimentaciones />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
