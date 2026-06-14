module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Sleek dark-mode workout palette
        brand: {
          light: '#f97316', // orange-500
          DEFAULT: '#ea580c', // orange-600
          dark: '#c2410c', // orange-700
        },
        dark: {
          bg: '#09090b', // zinc-950
          card: '#18181b', // zinc-900
          border: '#27272a', // zinc-800
          text: '#f4f4f5', // zinc-100
          muted: '#a1a1aa', // zinc-400
        }
      }
    },
  },
  plugins: [],
}
