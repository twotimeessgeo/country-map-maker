(function () {
  const initials = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

  function normalize(value) {
    return String(value ?? "").normalize("NFKC").trim().toLowerCase();
  }

  function chosung(value) {
    return [...normalize(value)].map((character) => {
      const code = character.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? initials[Math.floor(code / 588)] : character;
    }).join("");
  }

  function matches(values, query) {
    const needle = normalize(query);
    if (!needle) return true;
    return values.filter(Boolean).some((value) => {
      const text = normalize(value);
      return text.includes(needle) || chosung(text).normalize("NFKC").includes(needle);
    });
  }

  window.ClimateSearchKit = { matches };
})();
