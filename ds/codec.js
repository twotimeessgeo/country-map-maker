/* Promenade Geography, twotimess. https://twotimeessgeo.github.io/country-map-maker/
   CC BY-NC-SA 4.0 (data), PolyForm Noncommercial 1.0.0 (code). 영리 목적의 이용과 출처를 지운 재배포는 금합니다.

   The public build stores data scrambled so that a plain fetch of a data file returns no usable numbers. The page restores
   it in the browser before anything is drawn. Each character maps to one other character, so the files still compress
   just as well over the network. Source files in the repository stay readable; only the build output is scrambled. */
(function (root) {
  "use strict";
  if (root.TwCodec) return;

  const SEED = "twotimess / Promenade Geography / CC BY-NC-SA 4.0";
  const ASCII_FIRST = 0x20;
  const ASCII_COUNT = 0x7f - 0x20;
  const HANGUL_FIRST = 0xac00;
  const HANGUL_COUNT = 11172;
  const HANGUL_SHIFT = 4777;

  const forward = new Array(ASCII_COUNT);
  const backward = new Array(ASCII_COUNT);
  (function buildTable() {
    let state = 2166136261;
    for (let index = 0; index < SEED.length; index += 1) {
      state ^= SEED.charCodeAt(index);
      state = Math.imul(state, 16777619) >>> 0;
    }
    const next = () => {
      state ^= state << 13; state >>>= 0;
      state ^= state >>> 17;
      state ^= state << 5; state >>>= 0;
      return state;
    };
    const order = Array.from({ length: ASCII_COUNT }, (_, index) => index);
    for (let index = ASCII_COUNT - 1; index > 0; index -= 1) {
      const other = next() % (index + 1);
      [order[index], order[other]] = [order[other], order[index]];
    }
    order.forEach((target, source) => {
      forward[source] = target;
      backward[target] = source;
    });
  })();

  function map(text, table, shift) {
    const codes = new Uint16Array(text.length);
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      if (code >= ASCII_FIRST && code < ASCII_FIRST + ASCII_COUNT) {
        codes[index] = ASCII_FIRST + table[code - ASCII_FIRST];
      } else if (code >= HANGUL_FIRST && code < HANGUL_FIRST + HANGUL_COUNT) {
        codes[index] = HANGUL_FIRST + ((code - HANGUL_FIRST + shift) % HANGUL_COUNT);
      } else {
        codes[index] = code;
      }
    }
    let output = "";
    for (let start = 0; start < codes.length; start += 8192) {
      output += String.fromCharCode.apply(null, codes.subarray(start, start + 8192));
    }
    return output;
  }

  const seal = (value) => map(JSON.stringify(value), forward, HANGUL_SHIFT);
  const open = (text) => JSON.parse(map(text, backward, HANGUL_COUNT - HANGUL_SHIFT));
  const unwrap = (value) => (value && typeof value === "object" && typeof value._packed === "string" ? open(value._packed) : value);

  root.TwCodec = Object.freeze({ seal, open, unwrap });
})(typeof window !== "undefined" ? window : globalThis);
