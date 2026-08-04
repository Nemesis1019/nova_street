#!/usr/bin/env python3
"""Renderiza docs/er-diagram.puml a docs/er-diagram.png usando plantuml.com."""

import pathlib
import urllib.request
import zlib


def encode6bit(b: int) -> str:
    if b < 10:
        return chr(48 + b)
    if b < 36:
        return chr(55 + b)
    if b < 62:
        return chr(61 + b)
    if b == 62:
        return '-'
    if b == 63:
        return '_'
    return '?'


def encode64(data: bytes) -> str:
    res = ''
    for i in range(0, len(data), 3):
        chunk = data[i:i + 3]
        if len(chunk) < 3:
            chunk += bytes(3 - len(chunk))
        c1 = chunk[0] >> 2
        c2 = ((chunk[0] & 0x3) << 4) | (chunk[1] >> 4)
        c3 = ((chunk[1] & 0xF) << 2) | (chunk[2] >> 6)
        c4 = chunk[2] & 0x3F
        for c in (c1, c2, c3, c4):
            res += encode6bit(c & 0x3F)
    return res


def encode_plantuml(text: str) -> str:
    compressed = zlib.compress(text.encode('utf-8'))[2:-4]
    return encode64(compressed)


def main() -> None:
    base_dir = pathlib.Path(__file__).resolve().parent
    puml_path = base_dir / 'er-diagram.puml'
    png_path = base_dir / 'er-diagram.png'

    diagram = puml_path.read_text(encoding='utf-8')
    encoded = encode_plantuml(diagram)
    url = 'http://www.plantuml.com/plantuml/png/' + encoded

    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        png = resp.read()

    png_path.write_bytes(png)
    print('Wrote', len(png), 'bytes to', png_path)


if __name__ == '__main__':
    main()
