import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
