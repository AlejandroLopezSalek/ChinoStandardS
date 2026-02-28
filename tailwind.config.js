/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,njk,js}",
    "./src/_includes/**/*.{html,njk}",
  ],
  safelist: [
    'books-grid',
    'book-card',
    'book-card-content',
    'book-icon',
    'book-info',
    'book-title',
    'book-description',
    'book-meta',
    'book-actions',
    'book-btn',
    'btn-view',
    'btn-download',
    'lesson-actions',
    'btn-view-lesson',
    'lesson-edit-btn',
    'lesson-delete-btn'
  ],
  darkMode: ['class', '.dark-mode'], // Use .dark-mode class instead of .dark
  corePlugins: {
    container: false, // Disable Tailwind's container to avoid conflict
  },
  theme: {
    extend: {
      colors: {
        // Your existing purple gradient colors
        primary: {
          light: '#667eea',
          DEFAULT: '#667eea',
          dark: '#764ba2',
        },
        // Slate colors for dark mode
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'purple': '0 4px 15px rgba(102, 126, 234, 0.3)',
        'purple-lg': '0 8px 25px rgba(102, 126, 234, 0.4)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
