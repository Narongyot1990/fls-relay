"""Read-only check: all EN/TH terms in the supplied Word form appear in the app."""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

source = Path(sys.argv[1])
policy = json.loads((Path(__file__).resolve().parents[1] / "lib/policies/smartphone-handover.json").read_text(encoding="utf-8"))
assert hashlib.sha256(source.read_bytes()).hexdigest() == policy["sha256"], "Source version changed"
assert len(policy["sections"]) == 8
assert len(policy["fields"]) == 8
assert len(policy["accessories"]) == 5
for index, section in enumerate(policy["sections"]):
    assert section["title"]["en"].startswith(f"{index + 1}.")
    assert section["title"]["th"]
    assert all(row["en"] and row["th"] for row in section["paragraphs"])


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from strings(child)


def normalize(text):
    return re.sub(r"\s+|☐", "", text)


stored = normalize("".join(strings(policy)))
with zipfile.ZipFile(source) as archive:
    root = ElementTree.fromstring(archive.read("word/document.xml"))
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
paragraphs = root.findall(".//w:p", ns)
checked = 0
for index in range(10, 71):
    text = "".join(node.text or "" for node in paragraphs[index].findall(".//w:t", ns))
    if text.strip():
        assert normalize(text) in stored, f"Missing or changed terms at source paragraph {index}"
        checked += 1
print(json.dumps({"sections": 8, "accessories": 5, "sourceParagraphsVerified": checked,
                  "sourceVersionMatches": True, "allBilingualTermsPreserved": True}))
