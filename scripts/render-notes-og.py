"""Render a 1200×630 SVG from stdin to PNG with local PyMuPDF."""
import sys
import fitz

svg = sys.stdin.buffer.read()
if not svg:
    raise SystemExit("SVG input is empty")
document = fitz.open(stream=svg, filetype="svg")
page = document[0]
if round(page.rect.width) != 1200 or round(page.rect.height) != 630:
    raise SystemExit("Expected a 1200×630 SVG")
page.get_pixmap(alpha=False).save(sys.argv[1])
