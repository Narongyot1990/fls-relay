"""Extract the supplied bilingual Word form without rewriting its wording."""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree


def extract(source):
    with zipfile.ZipFile(source) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs = []
    for paragraph in root.findall(".//w:p", ns):
        runs = ["".join(node.text or "" for node in run.findall(".//w:t", ns))
                for run in paragraph.findall("w:r", ns)]
        split = next((i for i, text in enumerate(runs) if re.search(r"[\u0e00-\u0e7f]", text)), len(runs))
        paragraphs.append({"en": "".join(runs[:split]).strip(), "th": "".join(runs[split:]).strip()})
    headings = [10, 22, 30, 41, 48, 55, 62, 69]
    sections = []
    for index, start in enumerate(headings):
        end = headings[index + 1] if index + 1 < len(headings) else 72
        body = [paragraphs[i] for i in range(start + 1, end)
                if paragraphs[i]["en"] and i not in range(15, 21)]
        sections.append({"title": paragraphs[start], "paragraphs": body})
    return {"source": source.name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "title": paragraphs[0], "fields": paragraphs[1:9],
            "accessoriesTitle": paragraphs[15],
            "accessories": [{lang: text.removeprefix("☐").strip() for lang, text in paragraphs[i].items()}
                            for i in range(16, 21)],
            "sections": sections, "acknowledgement": paragraphs[70],
            "driverHeading": paragraphs[72], "representativeHeading": paragraphs[77],
            "representativeFields": paragraphs[78:82]}


if __name__ == "__main__":
    source = Path(sys.argv[1])
    target = Path(__file__).resolve().parents[1] / "lib/policies/smartphone-handover.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    policy = extract(source)
    target.write_text(json.dumps(policy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"sections": len(policy["sections"]), "accessories": len(policy["accessories"]),
                      "sourceHash": policy["sha256"], "output": str(target)}))
