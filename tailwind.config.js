/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                cairo: {
                    navy: '#002d42',
                    'navy-dark': '#001c2b',
                    'navy-light': '#004869',
                    blue: '#006293',
                    red: '#d9381e',
                    'red-hover': '#b82b14',
                    gold: '#d4af37',
                    'gold-hover': '#b89628',
                    bg: '#f2f6f9',
                    card: '#ffffff'
                }
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};

