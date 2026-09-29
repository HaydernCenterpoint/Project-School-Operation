import { Be_Vietnam_Pro, Dancing_Script, Playfair_Display } from "next/font/google";

// All three families ship Vietnamese glyphs; next/font self-hosts them.
const body = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const script = Dancing_Script({ subsets: ["latin", "vietnamese"], weight: ["600", "700"], variable: "--font-script" });
const display = Playfair_Display({ subsets: ["latin", "vietnamese"], weight: ["600", "700", "800"], style: ["normal", "italic"], variable: "--font-display" });

/** Font variables for the hoa phượng pages (welcome, login). */
export const phuongFonts = `${body.variable} ${script.variable} ${display.variable}`;
