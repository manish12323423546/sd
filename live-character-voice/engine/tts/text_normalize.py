"""Text normalisation for TTS and for WER scoring (docs/04 §7, docs/09 §9.4).

- Scores "2-1" → "two one", plain numbers → words, ordinals "3rd" → "third", minutes "90'" →
  "ninety minutes".
- Filler words ("uh", "um", "erm") removed.
- Names from the glossary are kept verbatim (never lowercased or split).
"""

from __future__ import annotations

import re
from collections.abc import Iterable

_ONES = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
    "nineteen",
]  # fmt: skip
_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
_ORD_IRREGULAR = {
    "one": "first", "two": "second", "three": "third", "five": "fifth", "eight": "eighth",
    "nine": "ninth", "twelve": "twelfth",
}  # fmt: skip
FILLERS = {"uh", "um", "erm", "er", "uhm", "hmm", "mm"}


def number_to_words(n: int) -> str:
    if n < 0:
        return "minus " + number_to_words(-n)
    if n < 20:
        return _ONES[n]
    if n < 100:
        tens, rest = divmod(n, 10)
        return _TENS[tens] + ("" if rest == 0 else "-" + _ONES[rest])
    if n < 1000:
        hundreds, rest = divmod(n, 100)
        head = _ONES[hundreds] + " hundred"
        return head if rest == 0 else head + " and " + number_to_words(rest)
    if n < 1_000_000:
        thousands, rest = divmod(n, 1000)
        head = number_to_words(thousands) + " thousand"
        if rest == 0:
            return head
        return head + (" and " if rest < 100 else " ") + number_to_words(rest)
    return " ".join(_ONES[int(d)] for d in str(n))


def ordinal_to_words(n: int) -> str:
    words = number_to_words(n)
    head, _, last = words.rpartition("-") if "-" in words else words.rpartition(" ")
    sep = "-" if "-" in words else " "
    if last in _ORD_IRREGULAR:
        last = _ORD_IRREGULAR[last]
    elif last.endswith("y"):
        last = last[:-1] + "ieth"
    else:
        last = last + "th"
    return (head + sep + last) if head else last


_SCORE = re.compile(r"\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b")
_ORDINAL = re.compile(r"\b(\d+)(st|nd|rd|th)\b", re.IGNORECASE)
_MINUTE = re.compile(r"\b(\d{1,3})(?:'|’|\s?mins?\b)")
_PERCENT = re.compile(r"\b(\d+)\s?%")
_NUMBER = re.compile(r"\b\d+\b")
_SPACES = re.compile(r"\s+")
_PH_OPEN, _PH_CLOSE = chr(0xE000), chr(0xE001)


def expand_numbers(text: str) -> str:
    text = _SCORE.sub(lambda m: f"{number_to_words(int(m[1]))} {number_to_words(int(m[2]))}", text)
    text = _ORDINAL.sub(lambda m: ordinal_to_words(int(m[1])), text)
    text = _MINUTE.sub(lambda m: f"{number_to_words(int(m[1]))} minutes", text)
    text = _PERCENT.sub(lambda m: f"{number_to_words(int(m[1]))} percent", text)
    return _NUMBER.sub(lambda m: number_to_words(int(m[0])), text)


def remove_fillers(text: str) -> str:
    def keep(tok: str) -> bool:
        return re.sub(r"[^\w]", "", tok).lower() not in FILLERS

    toks = [t for t in text.split() if keep(t)]
    out = " ".join(toks)
    out = re.sub(r"\s+([,.!?;:])", r"\1", out)
    return re.sub(r"^[,;:]\s*", "", out)


def normalize_for_tts(text: str, glossary: Iterable[str] = ()) -> str:
    """Prepare ASR text for speech. Glossary names are protected from every rewrite."""
    protected: dict[str, str] = {}
    for i, name in enumerate(sorted(set(glossary), key=len, reverse=True)):
        if name and name in text:
            key = _PH_OPEN + chr(0xE100 + i) + _PH_CLOSE  # private-use chars, no digits
            protected[key] = name
            text = text.replace(name, key)
    text = remove_fillers(expand_numbers(text))
    text = _SPACES.sub(" ", text).strip()
    for key, name in protected.items():
        text = text.replace(key, name)
    return text


def normalize_for_wer(text: str) -> str:
    """Lowercase, numbers as words, no punctuation (docs/09 §9.4 WER rule)."""
    text = expand_numbers(text).lower().replace("-", " ")
    text = re.sub(r"[^a-z0-9' ]+", " ", text)
    text = text.replace("'", "")
    return _SPACES.sub(" ", text).strip()
