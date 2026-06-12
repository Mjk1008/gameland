import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#0b0f14',
        panel: '#121821',
        ink: '#e6edf3',
        muted: '#8b97a6',
        accent: '#22d3ee',
        gold: '#f5c84b',
        silver: '#c0c5cb',
        bronze: '#cd7f32',
      },
    },
  },
  plugins: [],
}
export default config
