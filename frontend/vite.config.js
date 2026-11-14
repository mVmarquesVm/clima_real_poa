import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O Vite junta e serve o app; o plugin do Tailwind 4 gera o CSS
// só com as classes que aparecem no código (o arquivo final fica pequeno).
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
