import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      height: {
        // Mobile viewport height utilities for keyboard handling
        'screen-dynamic': '100dvh', // Dynamic viewport height
        'screen-small': '100svh',   // Small viewport height
        'screen-large': '100lvh',   // Large viewport height
      },
      minHeight: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      maxHeight: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        lokaa: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-in-out",
        "fade-out": "fade-out 0.3s ease-in-out",
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(to bottom right, #7c3aed, #4c1d95)',
        'cta-gradient': 'linear-gradient(to right, #8b5cf6, #6d28d9)',
      },
      fontSize: {
        // Display sizes - for hero sections and large headings
        'display-xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '800' }],
        'display-lg': ['3.75rem', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-md': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm': ['2.25rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        
        // Heading sizes - for section titles and content hierarchy
        'heading-xl': ['2rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-lg': ['1.75rem', { lineHeight: '1.35', letterSpacing: '-0.005em', fontWeight: '600' }],
        'heading-md': ['1.5rem', { lineHeight: '1.4', letterSpacing: '0em', fontWeight: '500' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.45', letterSpacing: '0em', fontWeight: '500' }],
        'heading-xs': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0em', fontWeight: '500' }],
        
        // Body sizes - for content and interface text
        'body-xl': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0em' }],
        'body-lg': ['1rem', { lineHeight: '1.6', letterSpacing: '0em' }],
        'body-md': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0em' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0em' }],
        
        // Caption sizes - for metadata and fine print
        'caption-lg': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.005em' }],
        'caption-md': ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.01em' }],
        'caption-sm': ['0.625rem', { lineHeight: '1.2', letterSpacing: '0.015em' }],
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
