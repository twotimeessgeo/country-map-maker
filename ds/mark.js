/* Invisible source mark for copied table text: each row label carries one zero-width character, and read in order the
   characters spell "TWOTIMESS" in Morse code (U+200B dot, U+200C dash, U+2060 letter gap). Searching and screen readers
   are unaffected; text copied from the page or the copy button keeps it. */
(() => {
  "use strict";
  if (window.TwMark) return;
  const MORSE = { T: "-", W: ".--", O: "---", I: "..", M: "--", E: ".", S: "..." };
  const SEQUENCE = [..."TWOTIMESS"].map((letter) => MORSE[letter]).join(" ").concat("  ")
    .replace(/\./g, "​").replace(/-/g, "‌").replace(/ /g, "⁠");
  const tag = (label, index) => `${label}${SEQUENCE[index % SEQUENCE.length]}`;
  window.TwMark = { tag };
})();
