from pathlib import Path
import re
from collections import defaultdict

ROOTS = [Path("apps/web/src/app"), Path("apps/web/src/modules"), Path("apps/web/src/shared")]
PATTERNS = {
    "padding_6_plus": re.compile(r"\b(?:p|px|py|pt|pb|pl|pr)-(?:6|7|8|9|10|12|16)\b"),
    "gap_6_plus": re.compile(r"\b(?:gap|space-[xy])-(?:6|7|8|9|10|12|16)\b"),
    "large_text": re.compile(r"\btext-(?:2xl|3xl|4xl|5xl|6xl)\b"),
    "large_icon_box": re.compile(r"\b(?:h|w)-(?:12|14|16|20|24)\b"),
    "large_rounding": re.compile(r"\brounded-(?:2xl|3xl|full)\b"),
    "heavy_shadow": re.compile(r"\bshadow-(?:md|lg|xl|2xl)\b"),
    "motion_card": re.compile(r"hover:-translate-y|hover:scale-|transition-all"),
    "oversized_min_height": re.compile(r"\bmin-h-(?:64|72|80|96)|min-h-\[(?:2[4-9]0|[3-9]\d\d)px\]"),
}

findings = defaultdict(lambda: defaultdict(int))
examples = defaultdict(list)
for root in ROOTS:
    for path in root.rglob("*.tsx"):
        text = path.read_text(errors="ignore")
        for label, pattern in PATTERNS.items():
            matches = list(pattern.finditer(text))
            if matches:
                findings[path.as_posix()][label] = len(matches)
                for m in matches[:3]:
                    line = text.count("\n", 0, m.start()) + 1
                    examples[(path.as_posix(), label)].append((line, m.group(0)))

ranked = sorted(findings.items(), key=lambda item: sum(item[1].values()), reverse=True)
print("VISUAL_AUDIT_FILES", len(ranked))
for path, counts in ranked[:80]:
    total = sum(counts.values())
    summary = ", ".join(f"{k}={v}" for k, v in counts.items())
    print(f"FILE | {total:02d} | {path} | {summary}")
    for label in counts:
        samples = ", ".join(f"L{line}:{token}" for line, token in examples[(path, label)])
        print(f"  {label}: {samples}")
