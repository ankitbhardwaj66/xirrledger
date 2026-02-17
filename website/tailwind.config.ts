import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1f77b4',
          dark: '#155a8a',
          light: '#4a9dd6',
        },
        secondary: {
          DEFAULT: '#2c3e50',
        },
      },
    },
  },
  plugins: [],
};

export default config;
