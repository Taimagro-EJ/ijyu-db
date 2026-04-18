import sys
sys.path.insert(0, '/Users/eiji/ijyu-db/scripts')
from lib.brand_filter import is_brand_match, filter_places_response

def test_xebio_positive():
    assert is_brand_match("スーパースポーツゼビオ 松本店", "ゼビオ") == True
    assert is_brand_match("XEBIO Sports 新宿", "ゼビオ") == True
    print("OK test_xebio_positive")

def test_xebio_negative_other_brand():
    assert is_brand_match("スポーツデポ 長野店", "ゼビオ") == False
    assert is_brand_match("ムラサキスポーツ", "ゼビオ") == False
    assert is_brand_match("ヒロスポーツ", "ゼビオ") == False
    print("OK test_xebio_negative_other_brand")

def test_xebio_negative_warehouse():
    assert is_brand_match("ゼビオ物流センター", "ゼビオ") == False
    assert is_brand_match("株式会社ゼビオ 本社", "ゼビオ") == False
    assert is_brand_match("ゼビオ 東京営業所", "ゼビオ") == False
    print("OK test_xebio_negative_warehouse")

def test_kaldi_positive():
    assert is_brand_match("カルディコーヒーファーム 新宿店", "カルディ") == True
    assert is_brand_match("KALDI COFFEE FARM", "カルディ") == True
    print("OK test_kaldi_positive")

def test_kaldi_negative():
    assert is_brand_match("株式会社キャメル珈琲 本牧物流センター", "カルディ") == False
    assert is_brand_match("キャメル珈琲 長沼工場", "カルディ") == False
    print("OK test_kaldi_negative")

def test_montbell_positive():
    assert is_brand_match("モンベルストア 松本店", "モンベル") == True
    assert is_brand_match("mont-bell 渋谷店", "モンベル") == True
    print("OK test_montbell_positive")

def test_filter_places_response():
    places = [
        {"displayName": {"text": "スーパースポーツゼビオ 長野店"}},
        {"displayName": {"text": "スポーツオーソリティ 長野店"}},
        {"displayName": {"text": "ゼビオ 本社"}},
        {"displayName": {"text": "XEBIO Sports 松本"}},
    ]
    accepted, rejected = filter_places_response(places, "ゼビオ")
    assert len(accepted) == 2, "accepted=" + str(len(accepted))
    assert len(rejected) == 2, "rejected=" + str(len(rejected))
    print("OK test_filter_places_response")

tests = [
    test_xebio_positive, test_xebio_negative_other_brand,
    test_xebio_negative_warehouse, test_kaldi_positive,
    test_kaldi_negative, test_montbell_positive,
    test_filter_places_response,
]
failed = 0
for t in tests:
    try:
        t()
    except AssertionError as e:
        print("FAIL", t.__name__, str(e))
        failed += 1
    except Exception as e:
        print("ERROR", t.__name__, str(e))
        failed += 1

print("")
print("ALL PASS" if failed == 0 else str(failed) + " FAILED", str(len(tests)-failed) + "/" + str(len(tests)))
