"""stdin -> stdout: Layer A scrub from guillaumemeyer/watermarks-remover (text_unicode.py, MIT)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from text_unicode import clean_text

cleaned, stats = clean_text(sys.stdin.read())
sys.stdout.write(cleaned)
sys.stderr.write(f"removed={stats['removed_count']} replaced={stats['replaced_count']}\n")
