import { defineConfig } from '@vite-pwa/assets-generator/config'

// `pnpm icons` regenerates the PNG icons in public/app-icons/ from logo.svg.
const onBrand = { padding: 0.3, resizeOptions: { background: '#6366f1' } }

export default defineConfig({
  preset: {
    transparent: { sizes: [192, 512], favicons: [], padding: 0 },
    maskable: { sizes: [512], ...onBrand },
    apple: { sizes: [180], ...onBrand },
  },
  images: ['public/app-icons/logo.svg'],
})
