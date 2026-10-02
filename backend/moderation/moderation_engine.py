import re
from typing import Dict, Any, List, Tuple, Optional

# -----------------------------
# Normalization helpers
# -----------------------------

_SPACE_RE = re.compile(r"\s+")
_NON_WORD_KEEP_SEP_RE = re.compile(r"[^a-z0-9@.+\-\s(){}\[\]/:_]", re.IGNORECASE)

def normalize_text(text: str) -> str:
    """
    Normalize text to make obfuscations easier to catch:
    - lowercase
    - keep common separators used in phones/emails/urls
    - collapse whitespace
    """
    t = text.strip().lower()
    t = _NON_WORD_KEEP_SEP_RE.sub(" ", t)
    t = _SPACE_RE.sub(" ", t).strip()
    return t

def normalize_compact_digits(text: str) -> str:
    """
    Extract only digits from text.
    Useful to detect spaced-out digit sequences like: 0 3 2 1 3 8 6...
    """
    return re.sub(r"\D+", "", text)

# -----------------------------
# Number-word decoding (English + Roman Urdu)
# -----------------------------

# English number words + common variants
EN_NUM = {
    "zero": "0", "oh": "0", "o": "0",
    "one": "1", "won": "1",
    "two": "2", "to": "2", "too": "2",
    "three": "3", "tree": "3",
    "four": "4", "for": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8", "ate": "8",
    "nine": "9",
    # sometimes people write "double three", "triple five" (we handle below)
    "double": "DOUBLE",
    "triple": "TRIPLE",
}

# Roman Urdu / Urdu-ish (common chat spellings)
RU_NUM = {
    "sifar": "0", "zero": "0", "oh": "0", "o": "0",
    "ek": "1", "aik": "1", "aiq": "1", "one": "1",
    "do": "2", "two": "2",
    "teen": "3", "tin": "3", "three": "3",
    "char": "4", "chaar": "4", "four": "4",
    "paanch": "5", "panch": "5", "five": "5",
    "che": "6", "chay": "6", "shay": "6", "six": "6",
    "saat": "7", "sat": "7", "seven": "7",
    "aath": "8", "ath": "8", "eight": "8",
    "nau": "9", "now": "9", "nine": "9",
    # repetition words
    "double": "DOUBLE",
    "triple": "TRIPLE",
}

NUM_WORD_MAP = {**EN_NUM, **RU_NUM}

# tokenization that keeps digits and words
_TOKEN_RE = re.compile(r"[a-z]+|\d+|[@.+\-/()]+", re.IGNORECASE)

def decode_number_words_to_digits(text: str) -> str:
    """
    Convert sequences like:
      "zero three two one three eight..." -> "032138..."
      "teen do char" -> "324"
      "double three" -> "33", "triple five" -> "555"
    Keeps existing digits.
    """
    tokens = _TOKEN_RE.findall(text.lower())
    out: List[str] = []
    i = 0

    def repeat_digit(d: str, times: int):
        if d.isdigit():
            out.append(d * times)

    while i < len(tokens):
        tok = tokens[i]

        # keep raw digits
        if tok.isdigit():
            out.append(tok)
            i += 1
            continue

        mapped = NUM_WORD_MAP.get(tok)
        if mapped in ("DOUBLE", "TRIPLE"):
            times = 2 if mapped == "DOUBLE" else 3
            # lookahead for next numeric word/digit
            if i + 1 < len(tokens):
                nxt = tokens[i + 1]
                if nxt.isdigit():
                    repeat_digit(nxt, times)
                    i += 2
                    continue
                nxt_m = NUM_WORD_MAP.get(nxt)
                if nxt_m and nxt_m.isdigit():
                    repeat_digit(nxt_m, times)
                    i += 2
                    continue
            # if no valid next, just skip
            i += 1
            continue

        if mapped and mapped.isdigit():
            out.append(mapped)
        # else ignore non-number words
        i += 1

    return "".join(out)

CONCAT_NUMBER_WORD_RE = re.compile(
    r"^(?:zero|oh|o|one|two|three|four|five|six|seven|eight|nine|"
    r"sifar|ek|aik|do|teen|char|chaar|paanch|che|chay|saat|aath|nau){6,}$",
    re.IGNORECASE
)

STARTS_WITH_ZERO_WORD_RE = re.compile(
    r"^(?:zero|oh|o|sifar)\b",
    re.IGNORECASE
)

ONLY_NUM_WORDS_AND_DIGITS_RE = re.compile(
    r"^(?:[a-z]+|\d+|\s+)+$",
    re.IGNORECASE
)

def parse_compact_number_words_to_digits(compact: str) -> str:
    """
    Parse concatenated number words like:
      "zerothreetwoninetwo..." -> "0329..."
    Returns decoded digit string if parse succeeds (covers whole string),
    otherwise returns "".
    """
    s = compact.lower()

    # Build list of valid number-word tokens (exclude DOUBLE/TRIPLE markers)
    tokens = [w for w, v in NUM_WORD_MAP.items() if isinstance(v, str) and v.isdigit()]
    # Sort longest-first so "three" is tried before "he"/etc.
    tokens.sort(key=len, reverse=True)

    i = 0
    out: List[str] = []
    n = len(s)

    while i < n:
        # allow digits inside compact string too (mixed bypass)
        if s[i].isdigit():
            out.append(s[i])
            i += 1
            continue

        matched = False
        for w in tokens:
            if s.startswith(w, i):
                out.append(NUM_WORD_MAP[w])  # digit
                i += len(w)
                matched = True
                break

        if not matched:
            # If any character can't be tokenized as a number word/digit -> fail
            return ""

    return "".join(out)


def detect_phone(text: str) -> bool:
    t = normalize_text(text)

    # 1) Direct PK formats
    if PHONE_PK_RE.search(t):
        return True

    # 2) Generic numeric phones (validate by digit count)
    m = PHONE_GENERIC_RE.search(t)
    if m:
        digits = re.sub(r"\D+", "", m.group(0))
        if len(digits) >= 7:
            return True

    # 3) Spaced digits like: 0 3 2 1 3 8 ...
    if SPACED_DIGITS_HINT_RE.search(t):
        digits = normalize_compact_digits(t)
        if len(digits) >= 7:
            return True

    # 4) Decode spaced number words (English + Roman Urdu)
    decoded = decode_number_words_to_digits(t)
    if len(decoded) >= 7:
        if decoded.startswith(("03", "92", "0092")) or 9 <= len(decoded) <= 13:
            return True

    # 5) 🚨 Strong rule: if message starts with "zero/sifar/oh/o" and decodes to >=7 digits -> block
    if re.match(r"^(?:zero|sifar|oh|o)\b", t, re.IGNORECASE):
        decoded2 = decode_number_words_to_digits(t)
        if len(decoded2) >= 7:
            return True

    # 6) 🚨 NEW: concatenated number words (no spaces) — robust parser (catches your example)
    compact = re.sub(r"[\s\-\._()]+", "", t)  # remove common separators
    decoded3 = parse_compact_number_words_to_digits(compact)
    if len(decoded3) >= 7:
        # extra strict: typical PK phone lengths / prefixes
        if decoded3.startswith(("03", "92")) or 9 <= len(decoded3) <= 13:
            return True
        # still block long digit strings anyway
        if len(decoded3) >= 9:
            return True

    return False

# -----------------------------
# Compiled regex patterns
# -----------------------------

# Phone: flexible separators; prefer "find" not "validate"
# (Allow +, (), spaces, dashes, dots; catch long digit runs)
PHONE_GENERIC_RE = re.compile(
    r"(?<!\d)(?:\+?\d{1,4}[\s\-\.()]*)?(?:\(?\d{2,4}\)?[\s\-\.()]*)?\d{3,4}[\s\-\.()]*\d{3,4}[\s\-\.()]*\d{0,4}(?!\d)"
)

# Pakistan-specific mobile patterns (03xx..., +923xx..., 0092...)
PHONE_PK_RE = re.compile(
    r"(?<!\d)(?:\+?92|0092|92|0)?\s*3\d{2}[\s\-\.]*\d{3}[\s\-\.]*\d{4}(?!\d)"
)

# Catch "spaced digits" like: 0 3 2 1 3 8 6 1 3 8 8
# We detect by counting digits after compacting, but this regex helps quickly flag patterns:
SPACED_DIGITS_HINT_RE = re.compile(r"(?:\d[\s\-\.()]{0,3}){7,}\d")

# Email: direct
EMAIL_DIRECT_RE = re.compile(r"\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b", re.IGNORECASE)

# Email obfuscation: "name (at) domain (dot) com", "name at gmail dot com"
EMAIL_OBF_RE = re.compile(
    r"\b[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\bat\b)\s*[a-z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\bdot\b)\s*[a-z]{2,}\b",
    re.IGNORECASE
)

# URLs / contact links (wa.me, t.me, instagram, facebook, etc.)
URL_RE = re.compile(r"\b(?:https?://|www\.)\S+\b", re.IGNORECASE)

CONTACT_LINKS_RE = re.compile(
    r"\b(?:wa\.me|api\.whatsapp\.com|whatsapp\.com|t\.me|telegram\.me|instagram\.com|facebook\.com|fb\.com|snapchat\.com|tiktok\.com|youtube\.com|maps\.google\.com|goo\.gl/maps|google\.com/maps)\b",
    re.IGNORECASE
)

# Social handle patterns: @username, "insta: xyz", "ig xyz", etc.
SOCIAL_HANDLE_RE = re.compile(r"(?<!\w)@[\w.]{3,}\b")

SOCIAL_KEYWORDS_RE = re.compile(
    r"\b(?:whatsapp|watsapp|wtsap|wa|telegram|telgram|insta|instagram|ig|facebook|fb|snap|snapchat|tiktok|youtube|dm|dms|inbox|pm|direct\s*msg|direct\s*message)\b",
    re.IGNORECASE
)

# Contact intent (English + Roman Urdu)
CONTACT_INTENT_RE = re.compile(
    r"\b(?:call|phone|text|sms|message|msg|contact|reach|ping|share|send)\b"
    r"|\b(?:call\s*karo|call\s*krdo|call\s*kren|call\s*krna|number\s*do|num\s*do|nbr\s*do|number\s*send|num\s*send|whatsapp\s*krdo|whatsapp\s*par|dm\s*karo|inbox\s*karo)\b",
    re.IGNORECASE
)

# Address / location: strong keywords + number/marker patterns
ADDRESS_KEYWORDS_RE = re.compile(
    r"\b(?:address|location|loc|pin\s*location|share\s*location|drop\s*pin|pickup|pick\s*up|deliver|delivery|meet|milna|milte|milna\s*hai|aao|aja|ana|aana|"
    r"home|house|flat|apartment|apt|building|office|warehouse|godown|street|st|road|rd|lane|ln|avenue|number|whatsapp|ave|block|sector|phase|plot|shop|store|"
    r"ghar|makaan|makan|dukan|dukaan|market|bazar|bazaar|rehta|gali|sarak|society|scheme|town|colony|mohalla|company|zero|business|factory|mill|masjid|church|temple|park|stop|station|bus\s*stop|metro"
    r"|dha|defence|clifton|saddar|gulshan|model\s*town|bahria|joher|jauhar|nazimabad|lhr|isb|khi|karachi|lahore|islamabad)\b",
    re.IGNORECASE
)

# Address markers like "house no 12", "plot # 5", "block A", "sector f-11"
ADDRESS_MARKERS_RE = re.compile(
    r"\b(?:house|home|plot|shop|store|flat|apt|apartment|office)\s*(?:no|#|number)?\s*[:\-]?\s*\d+[a-z]?\b"
    r"|\b(?:block|sector|phase)\s*[a-z0-9\-]{1,5}\b"
    r"|\b(?:street|st|road|rd|lane|ln|avenue|ave)\s*\d+[a-z]?\b",
    re.IGNORECASE
)

# Coordinates / plus codes
COORDS_RE = re.compile(r"\b-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}\b")
PLUS_CODE_RE = re.compile(r"\b[23456789cfghjmpqrvwx]{4,8}\+[23456789cfghjmpqrvwx]{2,3}\b", re.IGNORECASE)

# CNIC (Pakistan ID) patterns sometimes shared as "xxxxx-xxxxxxx-x"
CNIC_RE = re.compile(r"\b\d{5}[-\s]?\d{7}[-\s]?\d\b")

# -----------------------------
# Detection functions
# -----------------------------

def detect_phone(text: str) -> bool:
    t = normalize_text(text)

    # 1) direct patterns
    if PHONE_PK_RE.search(t):
        return True

    # 2) generic flexible pattern
    # But avoid matching short sequences: validate by digit count
    m = PHONE_GENERIC_RE.search(t)
    if m:
        digits = re.sub(r"\D+", "", m.group(0))
        if len(digits) >= 7:
            return True

    # 3) spaced digits hint + digit count
    if SPACED_DIGITS_HINT_RE.search(t):
        digits = normalize_compact_digits(t)
        if len(digits) >= 7:
            return True

    # 4) number-words decoding (English + Roman Urdu)
    decoded = decode_number_words_to_digits(t)
    # If decoded digits look like a phone (>= 7), block
    if len(decoded) >= 7:
        # Extra strict: if it starts with pk-like prefix or is 10-13 digits
        if decoded.startswith("03") or decoded.startswith("92") or (10 <= len(decoded) <= 13):
            return True
        # Even if not PK, still likely a phone if long enough
        if len(decoded) >= 9:
            return True

    return False

def detect_email(text: str) -> bool:
    t = normalize_text(text)
    if EMAIL_DIRECT_RE.search(t):
        return True
    if EMAIL_OBF_RE.search(t):
        return True

    # Extra: "name gmail dot com" without explicit 'at'
    # e.g. "bilalzhd gmail dot com"
    if re.search(r"\b[a-z0-9._%+-]+\s+(?:gmail|hotmail|yahoo|outlook)\s+(?:\.|dot)\s*com\b", t, re.IGNORECASE):
        return True

    return False

def detect_urls_or_handles(text: str) -> bool:
    t = normalize_text(text)
    if URL_RE.search(t):
        return True
    if CONTACT_LINKS_RE.search(t):
        return True
    if SOCIAL_HANDLE_RE.search(t):
        return True

    # If they mention social keyword + "id/user/username"
    if SOCIAL_KEYWORDS_RE.search(t) and re.search(r"\b(?:id|user|username|handle|profile)\b", t, re.IGNORECASE):
        return True

    return False

def detect_contact_intent(text: str) -> bool:
    t = normalize_text(text)
    # strong indicator: intent keywords
    if CONTACT_INTENT_RE.search(t):
        return True

    # roman urdu phrases often used to move off-platform
    if re.search(r"\b(?:off\s*platform|bahar|outside|direct|privately|personal)\b", t, re.IGNORECASE) and SOCIAL_KEYWORDS_RE.search(t):
        return True

    return False

def detect_address(text: str) -> bool:
    t = normalize_text(text)

    # links to maps, coordinates, plus codes
    if CONTACT_LINKS_RE.search(t) and re.search(r"\bmaps\b", t, re.IGNORECASE):
        return True
    if COORDS_RE.search(t) or PLUS_CODE_RE.search(t):
        return True

    # If they use any strong address/location keyword, block immediately (prevent sharing locations)
    if ADDRESS_KEYWORDS_RE.search(t):
        return True

    # address keywords + markers (extra assurance)
    if ADDRESS_KEYWORDS_RE.search(t) and ADDRESS_MARKERS_RE.search(t):
        return True

    # If they say "near/opposite/next to" with a place marker
    if re.search(r"\b(?:near|opposite|next|beside|samne|saamne|bilkul|qareeb|k\s*paas)\b", t, re.IGNORECASE) and ADDRESS_KEYWORDS_RE.search(t):
        return True

    # If they mention "shop/store/dukan" + a location-like token (numbers or block/phase)
    if re.search(r"\b(?:shop|store|dukan|dukaan)\b", t, re.IGNORECASE) and re.search(r"\b(?:block|sector|phase|\d{1,4})\b", t, re.IGNORECASE):
        return True

    return False

def detect_sensitive_ids(text: str) -> bool:
    t = normalize_text(text)
    if CNIC_RE.search(t):
        return True
    return False

def detect_name_sharing(text: str) -> bool:
    """
    Optional (strict): blocks obvious "my name is ..." / "mera naam ..."
    You can disable this if it blocks too much normal chat.
    """
    t = normalize_text(text)
    if re.search(r"\b(?:my\s+name\s+is|i\s+am|mera\s+naam|naam\s+hai|mein\s+hoon)\b\s+[a-z]{2,}", t, re.IGNORECASE):
        return True
    return False

# Basic abusive/profane language (English + Roman Urdu variants)
ABUSE_RE = re.compile(
    r"\b(?:bc|bhenchod|bhen\s*chod|behnchod|bsdk|bhosda|gandu|gaand|chutiya|chutiye|chutya|kuttiya|kutte|harami|haramzada|haramzadi|madarchod|maadar\s*chod|mazdoor\s*chod|"
    r"fuck|fucking|motherfucker|mf|son\s*of\s*a\s*bitch|sob|asshole|bastard|slut|whore|randi|gandi\s*baat|sex|sexy|nude|nangi|randwa|lanat|kameena|kameeni|kamina|kanjar)\b",
    re.IGNORECASE
)

def detect_abuse(text: str) -> bool:
    t = normalize_text(text)
    if ABUSE_RE.search(t):
        return True
    return False

# -----------------------------
# Moderation entry point
# -----------------------------

def moderate_message(text: str) -> Dict[str, Any]:
    """
    Returns:
      {
        "allowed": bool,
        "reasons": [ ... ],
        "blocked": bool
      }
    """
    reasons: List[str] = []
    raw = text or ""
    t = normalize_text(raw)

    # Block messages that are only digits/separators (no letters)
    if re.fullmatch(r"[0-9\s\-\._()+/]*\d[0-9\s\-\._()+/]*", t):
        reasons.append("numeric_only")

    # Block any word that starts with "zero" (common phone obfuscation)
    if re.search(r"\bzero\w*", t):
        reasons.append("zero_word")

    # Hard blocks first
    if detect_phone(t):
        reasons.append("phone_number")
    if detect_email(t):
        reasons.append("email_address")
    if detect_urls_or_handles(t):
        reasons.append("url_or_social_handle")
    if detect_contact_intent(t):
        reasons.append("contact_intent")
    if detect_address(t):
        reasons.append("address_or_location")
    if detect_sensitive_ids(t):
        reasons.append("sensitive_id")
    # Strict (optional)
    if detect_name_sharing(t):
        reasons.append("name_sharing")
    if detect_abuse(t):
        reasons.append("abusive_language")

    if reasons:
        return {"allowed": False, "blocked": True, "reasons": sorted(set(reasons))}

    return {"allowed": True, "blocked": False, "reasons": []}
