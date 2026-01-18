#!/usr/bin/env python3
"""Generate splash screens for PWA iOS devices."""

from PIL import Image, ImageDraw, ImageFont
import os
import math

# Splash screen dimensions (width x height in landscape)
# From the plan - landscape orientation
SPLASH_SCREENS = [
    ("iphone-15-pro-max", 2796, 1290),
    ("iphone-14-13-12", 2532, 1170),
    ("iphone-11-pro-x", 2436, 1125),
    ("iphone-11-xr", 1792, 828),
    ("iphone-se-8", 1334, 750),
    ("ipad-pro-12.9", 2732, 2048),
    ("ipad-pro-11", 2388, 1668),
    ("ipad-air", 2360, 1640),
    ("ipad-10.2", 2160, 1620),
    ("ipad-mini", 2266, 1488),
    ("ipad-9.7", 2048, 1536),
]


def create_gradient(width, height, color1, color2):
    """Create a diagonal gradient from top-left to bottom-right."""
    img = Image.new('RGB', (width, height))
    pixels = img.load()

    max_dist = width + height - 2 if (width > 1 and height > 1) else 1

    for y in range(height):
        for x in range(width):
            factor = (x + y) / max_dist

            r = int(color1[0] + (color2[0] - color1[0]) * factor)
            g = int(color1[1] + (color2[1] - color1[1]) * factor)
            b = int(color1[2] + (color2[2] - color1[2]) * factor)

            pixels[x, y] = (r, g, b)

    return img


def draw_rounded_rect(draw, xy, radius, fill, outline=None, outline_width=1):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    r = min(radius, (x2-x1)//2, (y2-y1)//2)

    draw.rectangle([x1+r, y1, x2-r, y2], fill=fill, outline=None)
    draw.rectangle([x1, y1+r, x2, y2-r], fill=fill, outline=None)

    draw.pieslice([x1, y1, x1+2*r, y1+2*r], 180, 270, fill=fill)
    draw.pieslice([x2-2*r, y1, x2, y1+2*r], 270, 360, fill=fill)
    draw.pieslice([x1, y2-2*r, x1+2*r, y2], 90, 180, fill=fill)
    draw.pieslice([x2-2*r, y2-2*r, x2, y2], 0, 90, fill=fill)

    if outline:
        draw.arc([x1, y1, x1+2*r, y1+2*r], 180, 270, fill=outline, width=outline_width)
        draw.arc([x2-2*r, y1, x2, y1+2*r], 270, 360, fill=outline, width=outline_width)
        draw.arc([x1, y2-2*r, x1+2*r, y2], 90, 180, fill=outline, width=outline_width)
        draw.arc([x2-2*r, y2-2*r, x2, y2], 0, 90, fill=outline, width=outline_width)
        draw.line([x1+r, y1, x2-r, y1], fill=outline, width=outline_width)
        draw.line([x1+r, y2, x2-r, y2], fill=outline, width=outline_width)
        draw.line([x1, y1+r, x1, y2-r], fill=outline, width=outline_width)
        draw.line([x2, y1+r, x2, y2-r], fill=outline, width=outline_width)


def create_logo(size):
    """Create the app logo at specified size."""
    # Colors from SVG
    bg_color1 = (0, 105, 148)    # #006994
    bg_color2 = (0, 24, 37)      # #001825
    card_color = (255, 254, 249) # #FFFEF9
    turquoise = (64, 224, 208)   # #40E0D0
    text_color = (0, 105, 148)   # #006994
    red = (227, 93, 93)          # #E35D5D
    dark = (27, 40, 56)          # #1B2838

    final = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)

    corner_radius = int(size * 80 / 512)
    draw_rounded_rect(mask_draw, [0, 0, size-1, size-1], corner_radius, fill=255)

    # Create gradient for logo background
    logo_bg = create_gradient(size, size, bg_color1, bg_color2)
    final.paste(logo_bg, mask=mask)

    draw = ImageDraw.Draw(final)
    scale = size / 512

    # Card
    card_x = int(140 * scale)
    card_y = int(100 * scale)
    card_w = int(232 * scale)
    card_h = int(312 * scale)
    card_radius = int(20 * scale)
    card_stroke = max(1, int(4 * scale))

    draw_rounded_rect(draw,
                     [card_x, card_y, card_x + card_w, card_y + card_h],
                     card_radius, fill=card_color, outline=turquoise, outline_width=card_stroke)

    # Font for D letter
    font_size = int(180 * scale)
    small_font_size = int(40 * scale)

    try:
        for font_name in ['Georgia', 'C:\\Windows\\Fonts\\georgia.ttf', 'C:\\Windows\\Fonts\\times.ttf']:
            try:
                font = ImageFont.truetype(font_name, font_size)
                break
            except:
                pass
        else:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Draw D
    text = "D"
    if hasattr(font, 'getbbox'):
        bbox = font.getbbox(text)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
    else:
        text_width = int(100 * scale)
        text_height = int(140 * scale)

    text_x = int(256 * scale) - text_width // 2
    text_y = int(300 * scale) - text_height

    draw.text((text_x, text_y), text, fill=text_color, font=font)

    # Suit symbols
    if size >= 128:
        try:
            symbol_font = ImageFont.truetype('C:\\Windows\\Fonts\\segoeui.ttf', small_font_size)
        except:
            symbol_font = font

        symbols = [
            ('\u2665', int(180 * scale), int(160 * scale), red),
            ('\u2660', int(332 * scale), int(160 * scale), dark),
            ('\u2666', int(180 * scale), int(390 * scale), red),
            ('\u2663', int(332 * scale), int(390 * scale), dark),
        ]

        for symbol, x, y, color in symbols:
            try:
                draw.text((x - small_font_size//2, y - small_font_size), symbol, fill=color, font=symbol_font)
            except:
                pass

    # Wave at bottom
    if size >= 128:
        wave_y = int(450 * scale)
        wave_color = (64, 224, 208, 76)

        wave = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        wave_draw = ImageDraw.Draw(wave)

        points = []
        for x in range(size + 1):
            y_offset = int(30 * scale * math.sin(x * 2 * math.pi / size))
            y = wave_y + y_offset
            points.append((x, y))

        points.append((size, size))
        points.append((0, size))

        wave_draw.polygon(points, fill=wave_color)

        wave_masked = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        wave_masked.paste(wave, mask=mask)

        final = Image.alpha_composite(final, wave_masked)

    return final


def create_splash(width, height):
    """Create splash screen with centered logo."""
    # Gradient colors
    bg_color1 = (0, 105, 148)    # #006994
    bg_color2 = (0, 24, 37)      # #001825

    # Create gradient background
    img = create_gradient(width, height, bg_color1, bg_color2)
    final = img.convert('RGBA')

    # Logo size - about 20% of the smaller dimension
    logo_size = min(width, height) // 5

    # Create and paste logo
    logo = create_logo(logo_size)

    # Center position
    x = (width - logo_size) // 2
    y = (height - logo_size) // 2

    final.paste(logo, (x, y), logo)

    return final.convert('RGB')


def generate_splash_screens():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    splash_dir = os.path.join(base_dir, 'splash')

    os.makedirs(splash_dir, exist_ok=True)

    for name, width, height in SPLASH_SCREENS:
        output_path = os.path.join(splash_dir, f'splash-{name}-{width}x{height}.png')
        print(f"Generating {name} ({width}x{height}) splash...")

        splash = create_splash(width, height)
        splash.save(output_path, 'PNG', optimize=True)

    print(f"\nGenerated {len(SPLASH_SCREENS)} splash screens successfully!")
    return True


if __name__ == '__main__':
    generate_splash_screens()
