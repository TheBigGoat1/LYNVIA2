import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      spacing: {
        'gr-1': '0.5rem',
        'gr-2': '0.8125rem',
        'gr-3': '1.3125rem',
        'gr-4': '2.125rem',
        'gr-5': '3.4375rem',
      },
      fontFamily: {
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
        headline: ['Playfair Display', 'Georgia', 'serif'],
        'serif-display': ['Playfair Display', 'serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        /* Lynvia marketing / dashboard alignment (see globals.css --lynvia-*) */
        lynvia: {
          olive: 'var(--lynvia-olive)',
          purple: 'var(--lynvia-purple)',
          dark: 'var(--lynvia-dark)',
          gray: 'var(--lynvia-gray)',
          cream: 'var(--lynvia-cream)',
          lavender: 'var(--lynvia-lavender)',
        },
        swiss: {
          slate: 'var(--swiss-alpine-slate)',
          cream: 'var(--swiss-mineral-cream)',
          laurel: 'var(--swiss-laurel-olive)',
          amethyst: 'var(--swiss-deep-amethyst)',
          midnight: 'var(--swiss-midnight-void)',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'login-field': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'dashboard-enter': {
          from: { opacity: '0.85', transform: 'scale(1.04)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'tab-content': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'reveal-up': 'reveal-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'login-field': 'login-field 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'dashboard-enter': 'dashboard-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'tab-content': 'tab-content 0.45s ease-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
