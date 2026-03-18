# paper-reader PDF Text Extraction Fix

**Objective**: Fix the paper-reader skill workflow to properly extract and analyze full PDF text using PyMuPDF, instead of generating notes from abstracts only.

**Problem Statement**: The current workflow downloads PDFs but skips Phase 1.6 (text extraction), resulting in `ABSTRACT_ONLY` analysis being passed off as full-text analysis. Additionally, the workflow lacks proper error handling for environment setup failures.

---

## Current State

- `paper/2602.05065/paper.pdf` exists (3.2MB)
- `paper/2602.05065/extract.txt` exists (70,995 chars) - extracted manually
- `paper/2602.05065/notes.md` generated without full text analysis (based on abstract only)
- `.venv/` created with PyMuPDF 1.27.2 installed

---

## Updated Plan

### Phase 0: Environment Bootstrap (NEW - Prerequisite)

**Task 0.1**: Create `scripts/bootstrap-pdf-extractor.py`
- Detect Python interpreter (`python` or `python3`)
- Check if `.venv` exists and has fitz installed
- If missing: create `.venv`, install `pymupdf==1.27.2`
- Use `python -m pip` instead of direct pip path
- Generate bootstrap status report
- Return appropriate exit codes: 0 (ready), 1 (bootstrap_failed)

**Task 0.2**: Document bootstrap requirements in SKILL.md Phase 1.6
- Add prerequisite check: "Before Phase 1.6, run bootstrap"
- Document what to do when Python/venv/pip is missing
- Define clear error messages for each failure mode

**QA 0.1**: Bootstrap error handling tests
```bash
# (a) Clean machine / no .venv - should create it
# Use system Python to run bootstrap, which creates .venv
python scripts/bootstrap-pdf-extractor.py
# Expected: .venv created, exit code 0
# Verify .venv was created
ls -la .venv/

# (b) Idempotency - rerun should succeed without reinstalling
python scripts/bootstrap-pdf-extractor.py
# Expected: exit code 0, no repeated pip install

# (c) Verify fitz import works
.venv/Scripts/python -c "import fitz; print(fitz.__version__)"
# Expected: 1.27.2
```

---

### Phase 1: Create PDF Extraction Script

**Task 1.1**: Create `scripts/extract-pdf-text.py` (already done)
- Accept `--pdf`, `--out`, `--report`, `--ocr-if-needed` arguments
- Use PyMuPDF (fitz) for text extraction
- Implement quality assessment (MIN_TOTAL_CHARS=4000, MIN_AVG_CHARS_PER_PAGE=200)
- Support OCR fallback for scanned documents
- Generate `extract-status.json` with extraction results
- Return appropriate exit codes: 0 (ok), 2 (open failed), 3 (low quality)

**Task 1.2**: Test extraction on existing paper
```bash
.venv/Scripts/python scripts/extract-pdf-text.py \
  --pdf "paper/2602.05065/paper.pdf" \
  --out "paper/2602.05065/extract.txt" \
  --report "paper/2602.05065/extract-status.json"
```

**QA 1.1**: Verify extraction works
```bash
# Check files exist
dir "paper\2602.05065\extract.txt"
dir "paper\2602.05065\extract-status.json"

# Check JSON status is ok
.venv/Scripts/python -c "import json; d=json.load(open('paper/2602.05065/extract-status.json')); print('status:', d['status']); assert d['status'] in ['ok', 'ocr_ok']"

# Check total_chars > 4000
.venv/Scripts/python -c "import json; d=json.load(open('paper/2602.05065/extract-status.json')); print('chars:', d['total_chars']); assert d['total_chars'] > 4000"
```

---

### Phase 2: Update SKILL.md Workflow

**Task 2.1**: Modify `.opencode/skills/paper-reader/SKILL.md` Phase 1.6
- Add explicit extraction command using `.venv/Scripts/python`
- Add verification that `extract.txt` exists before proceeding
- Document Windows path handling with forward slashes

**Task 2.2**: Update Phase 2 access level detection in SKILL.md
- Change condition: `extract.txt exists AND status in [ok, ocr_ok]` → FULL_TEXT
- Otherwise → ABSTRACT_ONLY with explicit explanation

**Task 2.3**: Add error handling documentation in SKILL.md
- PDF corrupt: mark status as "corrupted", fallback to ABSTRACT_ONLY
- OCR unavailable: mark status as "ocr_unavailable", fallback to ABSTRACT_ONLY
- Low quality: mark status as "low_text", fallback with warning
- **NEW**: Environment failures (Python/venv/pip missing): mark as "bootstrap_failed", do NOT silently fallback - operator must fix

**QA 2.1**: Verify SKILL.md instructions are executable
```bash
# Verify commands are copy-pasteable
grep -A 3 "Phase 1.6" .opencode/skills/paper-reader/SKILL.md | head -20

# Verify extraction command is present
grep "extract-pdf-text.py" .opencode/skills/paper-reader/SKILL.md

# Verify path references are correct
grep "opencode/skills" .opencode/skills/paper-reader/SKILL.md
```

---

### Phase 3: Regenerate Test Paper Notes

**Task 3.1**: Backup and regenerate notes from full text

1. Save current notes as backup:
   ```bash
   cp paper/2602.05065/notes.md paper/2602.05065/notes.old.md
   ```

2. Read `paper/2602.05065/extract.txt` (70,995 chars, 25 pages)

3. Generate new `notes.md` using the FULL TEXT analysis workflow (manual step)
   - Read abstract + introduction + conclusion from extract.txt
   - Identify key contributions in introduction
   - Extract methodology from sections 2-4
   - Note experimental setup and results from section 5
   - List limitations from conclusion

4. Verify new notes mention specific details from full text that are NOT in abstract:
   - Theorem numbers or equations
   - Specific experimental setups (MLP/RNN/Transformer)
   - Author names beyond the first author

**Task 3.2**: Create abstract-only baseline for comparison
```bash
# Read abstract from metadata.json
.venv/Scripts/python -c "import json; d=json.load(open('paper/2602.05065/metadata.json')); print(d['abstract'])" > paper/2602.05065/notes.abstract-only.md
```

**QA 3.1**: Verify notes regeneration worked
```bash
# Verify new notes exist and are different from old
diff paper/2602.05065/notes.old.md paper/2602.05065/notes.md
# Expected: non-empty diff (files are different)

# Verify new notes mention details from full text
.venv/Scripts/python -c "
old = open('paper/2602.05065/notes.abstract-only.md').read()
new = open('paper/2602.05065/notes.md').read()
# These phrases should appear in new notes but not in abstract-only
phrases = ['Theorem', 'deep linear network', 'minimal-fluctuation', 'MLP', 'RNN', 'transformer']
found = [p for p in phrases if p in new]
print('Phrases found in new notes:', found)
assert len(found) >= 3, 'New notes should contain at least 3 specific phrases from full text'
"

# Verify new notes are substantially longer
.venv/Scripts/python -c "
new = open('paper/2602.05065/notes.md').read()
assert len(new) > 5000, 'New notes should be > 5000 chars (much more than abstract only)'
print('New notes length:', len(new), 'chars')
"
```

---

## Error Handling Matrix

| Failure Mode | Detection | Result | Operator Action |
|--------------|----------|--------|----------------|
| Python not found | `python --version` fails | `bootstrap_failed` | Install Python 3.8+ |
| venv creation fails | Exit code != 0 | `bootstrap_failed` | Check permissions, disk space |
| pip install fails | Exit code != 0 | `bootstrap_failed` | Check network, try manual install |
| PyMuPDF import fails | `import fitz` fails | `bootstrap_failed` | Reinstall: `pip install pymupdf==1.27.2` |
| PDF open fails | fitz.open() exception | `status: "corrupted"` | Check PDF file integrity |
| OCR tesseract missing | `shutil.which("tesseract")` False | `status: "ocr_unavailable"` | Install Tesseract OCR (optional) |
| Low text quality | chars < 4000 | `status: "low_text"` | Try OCR or accept ABSTRACT_ONLY |

---

## Atomic Commit Strategy

1. **Commit 1** (feat): Add `scripts/bootstrap-pdf-extractor.py`
   - Bootstrap script with error handling
   - Verify: `python scripts/bootstrap-pdf-extractor.py` returns 0

2. **Commit 2** (feat): Add `scripts/extract-pdf-text.py`
   - Include script + basic tests
   - Verify: `.venv/Scripts/python scripts/extract-pdf-text.py --help` works

3. **Commit 3** (fix): Update `.opencode/skills/paper-reader/SKILL.md` Phase 1.6
   - Make extraction mandatory with concrete commands
   - Add access level detection rules
   - Add bootstrap prerequisite
   - Add error handling documentation
   - Verify: `grep "extract-pdf-text.py" .opencode/skills/paper-reader/SKILL.md` finds reference

4. **Commit 4** (feat): Regenerate paper/2602.05065 with full text
   - Run extraction, verify extract.txt created
   - Regenerate notes.md using extracted content
   - Create notes.abstract-only.md for comparison

---

## Success Criteria

- [ ] `scripts/bootstrap-pdf-extractor.py` exists and handles errors gracefully
- [ ] `scripts/extract-pdf-text.py` exists and runs successfully
- [ ] `paper/2602.05065/extract.txt` exists (>10KB)
- [ ] `paper/2602.05065/extract-status.json` shows `status: "ok"`
- [ ] SKILL.md Phase 1.6 documents bootstrap prerequisites
- [ ] SKILL.md Phase 2.1 documents error handling matrix
- [ ] Regenerated `notes.md` includes content not in abstract (Theorem, MLP, etc.)
