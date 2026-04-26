from io import BytesIO

from PIL import Image

from agent.vision import dhash_hex, hamming_distance


def _png_bytes(color: tuple[int, int, int]) -> bytes:
    img = Image.new('RGB', (64, 48), color=color)
    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def test_dhash_identical_images_distance_zero():
    left = dhash_hex(_png_bytes((20, 40, 60)))
    right = dhash_hex(_png_bytes((20, 40, 60)))
    assert hamming_distance(left, right) == 0


def test_dhash_distinguishes_different_images():
    left = dhash_hex(_png_bytes((10, 20, 30)))
    right = dhash_hex(_png_bytes((220, 220, 220)))
    assert hamming_distance(left, right) >= 0
