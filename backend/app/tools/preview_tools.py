def preview_summary(files: list[dict]) -> dict[str, bool]:
    paths = {item["path"] for item in files}
    return {
        "has_html": "index.html" in paths,
        "has_css": "style.css" in paths,
        "has_javascript": "script.js" in paths,
        "ready": {"index.html", "style.css", "script.js"}.issubset(paths),
    }

