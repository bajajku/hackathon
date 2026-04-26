from __future__ import annotations

import hashlib
from io import BytesIO
from typing import Any

from PIL import Image


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def dhash_hex(image_bytes: bytes, size: int = 8) -> str:
    image = Image.open(BytesIO(image_bytes)).convert('L').resize((size + 1, size))
    pixels = list(image.getdata())
    bits = []
    for row in range(size):
        row_start = row * (size + 1)
        for col in range(size):
            left = pixels[row_start + col]
            right = pixels[row_start + col + 1]
            bits.append(1 if left > right else 0)

    value = 0
    for bit in bits:
        value = (value << 1) | bit
    width = size * size // 4
    return f'{value:0{width}x}'


def hamming_distance(left_hex: str, right_hex: str) -> int:
    left = int(left_hex, 16)
    right = int(right_hex, 16)
    return (left ^ right).bit_count()


class GoogleVisionClient:
    def __init__(self) -> None:
        self._client = None

    def _ensure_client(self):
        if self._client is not None:
            return self._client
        try:
            from google.cloud import vision  # type: ignore
        except Exception as exc:  # pragma: no cover - optional dependency path
            raise RuntimeError('google-cloud-vision client not available') from exc
        self._client = vision.ImageAnnotatorClient()
        return self._client

    def analyze(self, image_bytes: bytes) -> dict[str, Any]:
        client = self._ensure_client()

        from google.cloud import vision  # type: ignore

        image = vision.Image(content=image_bytes)

        doc_response = client.document_text_detection(image=image)
        text_response = client.text_detection(image=image)
        label_response = client.label_detection(image=image, max_results=8)

        doc_text = doc_response.full_text_annotation.text if doc_response.full_text_annotation else ''
        if not doc_text and text_response.text_annotations:
            doc_text = text_response.text_annotations[0].description or ''

        labels = [ann.description for ann in label_response.label_annotations or []]
        return {
            'ocrText': doc_text.strip(),
            'labels': labels,
        }
