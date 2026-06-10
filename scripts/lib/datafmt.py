"""datafmt.py — minimum-valid file writers for the 10 mandatory formats.

Stdlib only. Each writer produces a SPEC-VALID file that downstream tools
(libreoffice, ffplay, image viewers, parsers) can open without error,
even though the content is a placeholder sample.

Per global §82.2. Reference implementation for every project's
sample-data generator.
"""
from __future__ import annotations

import csv
import io
import json
import math
import struct
import wave
import xml.etree.ElementTree as ET
import zipfile
import zlib
from pathlib import Path
from typing import Sequence


# ---------- text formats ------------------------------------------------------

def write_csv(path: Path, columns: Sequence[str], rows: Sequence[Sequence[object]]) -> int:
    """Write columns + rows as CSV. Returns byte count."""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(columns)
    for r in rows:
        w.writerow(r)
    return _save(path, buf.getvalue().encode("utf-8"))


def write_json(path: Path, payload: object) -> int:
    data = json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")
    return _save(path, data)


def write_xml(path: Path, root_name: str, rows: Sequence[dict]) -> int:
    root = ET.Element(root_name)
    for r in rows:
        item = ET.SubElement(root, "row")
        for k, v in r.items():
            child = ET.SubElement(item, str(k))
            child.text = "" if v is None else str(v)
    # ElementTree.tostring with declaration:
    raw = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return _save(path, raw)


def write_text(path: Path, content: str) -> int:
    if len(content) < 50:
        content = content + " " + ("─" * (50 - len(content)))
    return _save(path, content.encode("utf-8"))


# ---------- docx -------------------------------------------------------------

_DOCX_DOCUMENT_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
{paragraphs}
    <w:sectPr/>
  </w:body>
</w:document>"""

_DOCX_PARA = '    <w:p><w:r><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'

_DOCX_CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

_DOCX_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""


def write_docx(path: Path, paragraphs: Sequence[str]) -> int:
    """Minimum-valid .docx (Word, LibreOffice, Pages all open it)."""
    paras_xml = "\n".join(
        _DOCX_PARA.format(text=_xml_escape(p)) for p in paragraphs
    )
    document_xml = _DOCX_DOCUMENT_XML.format(paragraphs=paras_xml)

    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", _DOCX_CONTENT_TYPES)
        zf.writestr("_rels/.rels", _DOCX_RELS)
        zf.writestr("word/document.xml", document_xml)
    return path.stat().st_size


# ---------- pdf --------------------------------------------------------------

def write_pdf(path: Path, lines: Sequence[str]) -> int:
    """Hand-rolled minimum-valid PDF 1.4 with one page of text."""
    # Build the page content stream
    text_objs = []
    y = 750
    for line in lines[:40]:  # keep on one page
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        text_objs.append(f"BT /F1 11 Tf 50 {y} Td ({safe}) Tj ET")
        y -= 16
    content = "\n".join(text_objs).encode("latin-1", "replace")

    objs: list[bytes] = []
    objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objs.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objs.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
    )
    objs.append(b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream")
    objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_offset = len(out)
    out += f"xref\n0 {len(objs) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += f"{off:010d} 00000 n \n".encode()
    out += b"trailer\n"
    out += f"<< /Size {len(objs) + 1} /Root 1 0 R >>\n".encode()
    out += b"startxref\n" + str(xref_offset).encode() + b"\n%%EOF\n"
    return _save(path, bytes(out))


# ---------- png --------------------------------------------------------------

def write_png(path: Path, width: int = 64, height: int = 64, color: tuple = (30, 64, 175)) -> int:
    """Solid-color PNG. Valid PNG signature + IHDR + IDAT + IEND chunks."""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # RGB, 8-bit
    ihdr = _png_chunk(b"IHDR", ihdr_data)

    # Raw image data: each row = filter byte 0 + RGB triples
    row = bytes([0]) + bytes(color) * width
    raw = row * height
    idat = _png_chunk(b"IDAT", zlib.compress(raw, 6))
    iend = _png_chunk(b"IEND", b"")

    return _save(path, sig + ihdr + idat + iend)


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


# ---------- wav --------------------------------------------------------------

def write_wav(path: Path, seconds: float = 1.0, freq: float = 440.0, rate: int = 8000) -> int:
    """Single-channel 16-bit PCM. By default a 1s 440Hz tone."""
    n = int(seconds * rate)
    amp = 12000
    frames = bytearray()
    for i in range(n):
        sample = int(amp * math.sin(2 * math.pi * freq * i / rate))
        frames += struct.pack("<h", sample)

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(bytes(frames))
    return path.stat().st_size


# ---------- mp4 --------------------------------------------------------------

def write_mp4(path: Path) -> int:
    """Minimal MP4 container — ftyp + free + moov stub.

    Plays as 0-duration in ffplay/VLC but is a structurally valid MP4
    that ffprobe + file(1) recognise as 'ISO Media, MP4 v1'.
    """
    # ftyp box: type=isom, minor=512, compatible=[isom, mp41]
    ftyp = _mp4_box(
        b"ftyp",
        b"isom" + struct.pack(">I", 512) + b"isom" + b"mp41",
    )

    # mvhd box: zero duration
    mvhd = _mp4_box(
        b"mvhd",
        struct.pack(">B3sIIIIi", 0, b"\x00\x00\x00", 0, 0, 1000, 0, 0x00010000)
        + struct.pack(">h", 0x0100)        # volume 1.0
        + b"\x00" * 10                     # reserved
        + struct.pack(
            ">9i",
            0x00010000, 0, 0,
            0, 0x00010000, 0,
            0, 0, 0x40000000,
        )                                  # identity transform matrix
        + b"\x00" * 24                     # pre_defined
        + struct.pack(">I", 2),            # next track ID
    )
    moov = _mp4_box(b"moov", mvhd)

    free = _mp4_box(b"free", b"insur-catalog-sample-mp4-placeholder")

    return _save(path, ftyp + moov + free)


def _mp4_box(box_type: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", 8 + len(payload)) + box_type + payload


# ---------- helpers ----------------------------------------------------------

def _save(path: Path, data: bytes) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return len(data)


_XML_ESCAPE = {"<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;"}


def _xml_escape(s: str) -> str:
    return "".join(_XML_ESCAPE.get(c, c) for c in s)


# ---------- validation -------------------------------------------------------

def is_valid(path: Path) -> tuple[bool, str]:
    """Best-effort signature check for the 10 formats."""
    if not path.exists():
        return False, "missing"
    if path.stat().st_size == 0:
        return False, "empty"
    ext = path.suffix.lower()
    head = path.read_bytes()[:16]
    try:
        if ext == ".csv":
            txt = path.read_text(encoding="utf-8", errors="replace")
            return ("," in txt and "\n" in txt), "csv-ok" if "," in txt else "missing-delim"
        if ext == ".json":
            json.loads(path.read_text(encoding="utf-8"))
            return True, "json-ok"
        if ext == ".xml":
            ET.fromstring(path.read_text(encoding="utf-8"))
            return True, "xml-ok"
        if ext == ".txt":
            return True, "txt-ok"
        if ext == ".docx":
            with zipfile.ZipFile(path) as zf:
                names = zf.namelist()
            return ("word/document.xml" in names), "docx-ok"
        if ext == ".pdf":
            return head.startswith(b"%PDF-"), "pdf-ok"
        if ext == ".png":
            return head.startswith(b"\x89PNG\r\n\x1a\n"), "png-ok"
        if ext == ".wav":
            return head.startswith(b"RIFF") and head[8:12] == b"WAVE", "wav-ok"
        if ext == ".mp4":
            return head[4:8] == b"ftyp", "mp4-ok"
    except Exception as e:  # noqa: BLE001
        return False, f"parse-error:{type(e).__name__}"
    return False, f"unknown-extension:{ext}"


__all__ = [
    "write_csv",
    "write_json",
    "write_xml",
    "write_text",
    "write_docx",
    "write_pdf",
    "write_png",
    "write_wav",
    "write_mp4",
    "is_valid",
]
