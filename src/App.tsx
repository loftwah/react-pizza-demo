import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { MenuPage } from './pages/MenuPage'
import About from './pages/About.mdx'

const NotFound = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
    <h1 className="font-display text-5xl text-slate-900 dark:text-white">404</h1>
    <p className="max-w-md text-sm text-slate-600 dark:text-white/70">
      We tossed that page into the oven and it never came back. Head to the menu for
      something tastier.
    </p>
  </div>
)

const App = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<MenuPage />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Layout>
)

export default App
