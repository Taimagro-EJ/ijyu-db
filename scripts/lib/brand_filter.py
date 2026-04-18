"""
scripts/lib/brand_filter.py
Places APIレスポンスのブランド名マッチングフィルタ
"""

BRAND_KEYWORDS = {
    "カルディ":  ["カルディ", "KALDI", "kaldi"],
    "モンベル":  ["モンベル", "mont-bell", "montbell", "Mont-Bell"],
    "ゼビオ":    ["ゼビオ", "XEBIO", "xebio", "Super Sports XEBIO", "スーパースポーツゼビオ"],
    "ニトリ":    ["ニトリ", "NITORI"],
    "無印良品":  ["無印良品", "MUJI"],
    "コストコ":  ["コストコ", "Costco", "costco"],
    "セリア":    ["セリア", "Seria"],
    "3COINS":    ["3COINS", "スリーコインズ"],
}

EXCLUDE_WORDS = ["本社", "本部", "物流", "倉庫", "工場", "センター（物流）", "営業所", "事務所"]


def is_brand_match(facility_name: str, brand: str) -> bool:
    name_lower = facility_name.lower()
    keywords = BRAND_KEYWORDS.get(brand, [brand])
    has_keyword = any(kw.lower() in name_lower for kw in keywords)
    if not has_keyword:
        return False
    for excl in EXCLUDE_WORDS:
        if excl in facility_name:
            return False
    return True


def filter_places_response(places: list, brand: str) -> tuple:
    accepted = []
    rejected = []
    for place in places:
        name = place.get("displayName", {}).get("text", "") or place.get("name", "")
        if is_brand_match(name, brand):
            accepted.append(place)
        else:
            rejected.append(place)
    return accepted, rejected
