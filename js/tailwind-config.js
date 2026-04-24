tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#00a3a3",
                "primary-hover": "#008a8a",
                "background-light": "#ffffff",
                "background-dark": "#1d1d20",
                "surface-light": "#f8fcfc",
                "surface-dark": "#2a2a2d",
                "panel-bg": "#F3F3F3", // Light grey surface requested
                "text-main": "#0c1d1d",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"],
                "mono": ["Fira Code", "monospace"],
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "md": "0.375rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px"
            },
            boxShadow: {
                "soft": "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
            }
        },
    },
}
