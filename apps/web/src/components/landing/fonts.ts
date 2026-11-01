import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";

// Both families ship Vietnamese glyphs; next/font self-hosts them.
const body = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const display = Playfair_Display({ subsets: ["latin", "vietnamese"], weight: ["600", "700", "800"], style: ["normal", "italic"], variable: "--font-display" });

/** Font variables for the hoa phượng pages (welcome, login, student portal). */
export const phuongFonts = `${body.variable} ${display.variable}`;
