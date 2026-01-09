import re
import math


def parse_dxf_text(file_path):
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    entities = []
    current_entity = {}
    capturing = False

    for i in range(len(lines)):
        line = lines[i].strip()

        if line == "AcDbText" or line == "AcDbMText":
            if current_entity and "text" in current_entity:
                entities.append(current_entity)
            current_entity = {"type": line}
            capturing = True
            continue

        if not capturing:
            continue

        if line == "10":  # X
            current_entity["x"] = float(lines[i + 1].strip())
        elif line == "20":  # Y
            current_entity["y"] = float(lines[i + 1].strip())
        elif line == "1":  # Content
            current_entity["text"] = lines[i + 1].strip()
        elif line == "0" and (
            lines[i + 1].strip() == "ENDSEC" or lines[i + 1].strip().startswith("AcDb")
        ):
            capturing = False
            if "text" in current_entity:
                entities.append(current_entity)
            current_entity = {}

    # Filter for potential grid labels
    grid_labels = []
    for e in entities:
        text = e.get("text", "")
        # Remove formatting regex for MText \A1; etc
        text = re.sub(r"\\[A-Za-z0-9]+;", "", text)
        text = text.replace("{", "").replace("}", "")

        # Match single letters A-Z or numbers 1-100
        if re.match(r"^[A-Z]$", text) or re.match(r"^[X]?\d+$", text):
            grid_labels.append({"text": text, "x": e.get("x"), "y": e.get("y")})

    return grid_labels


labels = parse_dxf_text("d:/00.Work_AI_Tool/11.P5_PJT/복합동그리드.dxf")
print(f"Found {len(labels)} potential grid labels.")

# Group by text to find patterns
sorted_labels = sorted(labels, key=lambda l: (l["text"], l["x"]))

for l in sorted_labels:
    print(f"Label: {l['text']}, X: {l['x']}, Y: {l['y']}")
