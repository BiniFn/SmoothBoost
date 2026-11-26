#!/usr/bin/env python3
"""
Generate high-fidelity store promotional tiles, store icon, and screenshots for
Chrome Web Store, Microsoft Edge Partner Center, and Firefox Add-ons (AMO).

Assets generated (in assets/store/ and mirrored to docs/assets/store/):
1. store_icon_300x300.png     - 300 x 300 pixels (Edge Add-ons Store Icon)
2. small_promo_440x280.png    - 440 x 280 pixels
3. large_promo_1400x560.png   - 1400 x 560 pixels
4. screenshot1_1280x800.png   - 1280 x 800 pixels (Dashboard & Profiles)
5. screenshot2_1280x800.png   - 1280 x 800 pixels (Scroll Boost v2 & FPS Targets)
6. screenshot3_1280x800.png   - 1280 x 800 pixels (Shadow DOM, Site Rules & Memory Guard)
"""

import os
import shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT_DIR, "assets", "store")
DOCS_OUTPUT_DIR = os.path.join(ROOT_DIR, "docs", "assets", "store")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DOCS_OUTPUT_DIR, exist_ok=True)

FONT_HELVETICA = "/System/Library/Fonts/Helvetica.ttc"
FONT_ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
VERSION_TAG = "2.5.0"


def get_font(size, bold=False):
    font_path = FONT_ARIAL if os.path.exists(FONT_ARIAL) else FONT_HELVETICA
    try:
        return ImageFont.truetype(font_path, size)
    except Exception:
        return ImageFont.load_default()


def draw_gradient_rect(draw, bbox, color_top, color_bottom):
    x0, y0, x1, y1 = bbox
    height = max(1, y1 - y0)
    for i in range(height):
        ratio = i / height
        r = int(color_top[0] * (1 - ratio) + color_bottom[0] * ratio)
        g = int(color_top[1] * (1 - ratio) + color_bottom[1] * ratio)
        b = int(color_top[2] * (1 - ratio) + color_bottom[2] * ratio)
        draw.line([(x0, y0 + i), (x1, y0 + i)], fill=(r, g, b))


def draw_pill(draw, x, y, text, font, bg_color, text_color, border_color=None, padding_x=12, padding_y=6):
    bbox = font.getbbox(text)
    w = bbox[2] - bbox[0] + padding_x * 2
    h = bbox[3] - bbox[1] + padding_y * 2
    r = h // 2
    draw.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=bg_color, outline=border_color, width=1)
    text_y = y + (h - (bbox[3] - bbox[1])) // 2 - bbox[1]
    draw.text((x + padding_x, text_y), text, font=font, fill=text_color)
    return w, h


def draw_lightning_bolt(draw, cx, cy, size, color):
    points = [
        (cx + size * 0.1, cy - size * 0.5),
        (cx - size * 0.35, cy + size * 0.05),
        (cx - size * 0.02, cy + size * 0.05),
        (cx - size * 0.15, cy + size * 0.5),
        (cx + size * 0.4, cy - size * 0.08),
        (cx + size * 0.04, cy - size * 0.08),
    ]
    draw.polygon(points, fill=color)


def save_asset(img, filename):
    out_path = os.path.join(OUTPUT_DIR, filename)
    docs_path = os.path.join(DOCS_OUTPUT_DIR, filename)
    img.save(out_path, "PNG")
    shutil.copy2(out_path, docs_path)
    print(f"Created: {out_path}")


# -------------------------------------------------------------
# 0. STORE ICON (300 x 300)
# -------------------------------------------------------------
def generate_store_icon():
    size = 300
    img = Image.new("RGBA", (size, size), (7, 11, 18, 255))
    draw = ImageDraw.Draw(img)
    draw_gradient_rect(draw, (0, 0, size, size), (15, 23, 42), (2, 6, 23))

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([45, 45, 255, 255], fill=(16, 185, 129, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle([24, 24, size - 24, size - 24], radius=56, fill=(15, 23, 42), outline=(16, 185, 129), width=6)
    draw_lightning_bolt(draw, size // 2, size // 2, 145, (52, 211, 153))
    save_asset(img, "store_icon_300x300.png")


# -------------------------------------------------------------
# 1. SMALL PROMOTIONAL TILE (440 x 280)
# -------------------------------------------------------------
def generate_small_promo():
    width, height = 440, 280
    img = Image.new("RGBA", (width, height), (7, 11, 18, 255))
    draw = ImageDraw.Draw(img)
    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([width // 2 - 130, height // 2 - 100, width // 2 + 130, height // 2 + 100], fill=(6, 182, 212, 48))
    glow = glow.filter(ImageFilter.GaussianBlur(35))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle([1, 1, width - 2, height - 2], radius=12, outline=(30, 41, 59), width=1)

    badge_x, badge_y, badge_size = width // 2, 60, 48
    draw.rounded_rectangle(
        [badge_x - badge_size // 2, badge_y - badge_size // 2, badge_x + badge_size // 2, badge_y + badge_size // 2],
        radius=12, fill=(17, 24, 39), outline=(16, 185, 129), width=2
    )
    draw_lightning_bolt(draw, badge_x, badge_y, 30, (52, 211, 153))

    font_title = get_font(24, bold=True)
    title_text = "SmoothBoost"
    bbox = font_title.getbbox(title_text)
    draw.text(((width - (bbox[2] - bbox[0])) // 2, 98), title_text, font=font_title, fill=(255, 255, 255))

    font_sub = get_font(13)
    sub_text = f"v{VERSION_TAG} • Universal Web Performance"
    bbox_s = font_sub.getbbox(sub_text)
    draw.text(((width - (bbox_s[2] - bbox_s[0])) // 2, 130), sub_text, font=font_sub, fill=(148, 163, 184))

    font_pills = get_font(11, bold=True)
    pills = ["Scroll Boost v2", "Shadow DOM", "120 / Native FPS"]
    total_w = sum(font_pills.getbbox(p)[2] - font_pills.getbbox(p)[0] + 20 for p in pills) + 16
    cur_x = (width - total_w) // 2
    for p in pills:
        w, _ = draw_pill(draw, cur_x, 168, p, font_pills, (15, 23, 42), (56, 189, 248), (6, 182, 212), 10, 5)
        cur_x += w + 8

    font_bot = get_font(11)
    bot_text = "100% Free • Zero Telemetry • All Major Browsers"
    bbox_b = font_bot.getbbox(bot_text)
    draw.text(((width - (bbox_b[2] - bbox_b[0])) // 2, 232), bot_text, font=font_bot, fill=(100, 116, 139))
    save_asset(img, "small_promo_440x280.png")


# -------------------------------------------------------------
# 2. LARGE PROMOTIONAL TILE (1400 x 560)
# -------------------------------------------------------------
def generate_large_promo():
    width, height = 1400, 560
    img = Image.new("RGBA", (width, height), (7, 11, 18, 255))
    draw = ImageDraw.Draw(img)
    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([80, 80, 580, 480], fill=(6, 182, 212, 38))
    glow_draw.ellipse([850, 100, 1350, 500], fill=(16, 185, 129, 34))
    glow = glow.filter(ImageFilter.GaussianBlur(65))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    font_tag = get_font(14, bold=True)
    draw_pill(draw, 100, 74, f"SMOOTHBOOST {VERSION_TAG} • 100% FREE & ZERO TELEMETRY", font_tag, (13, 39, 54), (56, 189, 248), (6, 182, 212), 14, 6)

    font_hero = get_font(46, bold=True)
    draw.text((100, 132), "Eliminate Scroll Lag.\nBoost Every Heavy Site.", font=font_hero, fill=(255, 255, 255), spacing=8)

    font_desc = get_font(17)
    desc = (
        "Universal client-side performance engine across Chrome, Edge, Firefox, and Safari.\n"
        "Zero-reflow Scroll Boost v2, Shadow DOM penetration for Reddit & YouTube,\n"
        "batched mutation scheduling, and full protection for live calls & editors."
    )
    draw.text((100, 266), desc, font=font_desc, fill=(148, 163, 184), spacing=6)

    font_bullets = get_font(13.5, bold=True)
    bullets = [
        ("Scroll Boost v2", "Zero-reflow compositor scroll pacing with zero flicker"),
        ("Shadow DOM & Rules", "Optimizes YouTube, Reddit, X, Twitch, AI chats & wikis"),
        ("Native–120 FPS Pacing", "Configurable Native, 30, 60, 90, and 120 FPS targets"),
        ("Zero Telemetry", "100% free & client-side; zero tracking or data collection")
    ]
    cur_y = 372
    for title, detail in bullets:
        draw_pill(draw, 100, cur_y, title, font_bullets, (24, 34, 52), (52, 211, 153), (51, 65, 85), 12, 6)
        draw.text((295, cur_y + 6), f"— {detail}", font=get_font(15.5), fill=(203, 213, 225))
        cur_y += 42

    # Right Section: Redesigned Popup Card Mockup
    card_x, card_y, card_w, card_h = 880, 68, 420, 424
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=16, fill=(15, 23, 42), outline=(51, 65, 85), width=2)

    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + 56], radius=16, fill=(24, 34, 52))
    draw.rounded_rectangle([card_x, card_y + 36, card_x + card_w, card_y + 56], radius=0, fill=(24, 34, 52))
    draw_lightning_bolt(draw, card_x + 30, card_y + 28, 20, (52, 211, 153))
    draw.text((card_x + 48, card_y + 18), "SmoothBoost", font=get_font(16, bold=True), fill=(255, 255, 255))
    draw_pill(draw, card_x + card_w - 135, card_y + 14, f"v{VERSION_TAG}", get_font(11, bold=True), (13, 42, 58), (56, 189, 248), (6, 182, 212), 8, 3)
    draw_pill(draw, card_x + card_w - 72, card_y + 14, "FREE", get_font(10.5, bold=True), (12, 46, 38), (52, 211, 153), (16, 185, 129), 8, 3)

    draw.ellipse([card_x + 24, card_y + 80, card_x + 36, card_y + 92], fill=(16, 185, 129))
    draw.text((card_x + 44, card_y + 75), "Active & Optimizing", font=get_font(17.5, bold=True), fill=(255, 255, 255))
    draw_pill(draw, card_x + card_w - 122, card_y + 74, "Infinite Feed", get_font(10.5, bold=True), (13, 42, 58), (56, 189, 248), (6, 182, 212), 8, 3)
    draw.text((card_x + 24, card_y + 106), "Smart Auto: Running verified heuristics for smooth browsing.", font=get_font(12), fill=(148, 163, 184))

    profs = ["Auto", "Turbo", "Balanced", "Battery", "Custom"]
    px = card_x + 20
    for idx, pr in enumerate(profs):
        is_active = idx == 0
        bg = (6, 182, 212) if is_active else (24, 34, 52)
        fg = (0, 0, 0) if is_active else (203, 213, 225)
        border = None if is_active else (51, 65, 85)
        w, _ = draw_pill(draw, px, card_y + 140, pr, get_font(11, bold=True), bg, fg, border, 11, 6)
        px += w + 6

    draw.rounded_rectangle([card_x + 20, card_y + 188, card_x + card_w - 20, card_y + 320], radius=10, fill=(11, 17, 29), outline=(30, 41, 59))
    draw.text((card_x + 32, card_y + 200), "REAL-TIME INTERVENTIONS", font=get_font(10.5, bold=True), fill=(100, 116, 139))
    metrics_items = [
        ("Passive Listeners", "18 Active"),
        ("Shadow DOM Roots", "12 Contained"),
        ("Deferred Embeds", "6 Third-Party"),
        ("Display Pacing", "Native / 120 FPS")
    ]
    my = card_y + 224
    for lbl, val in metrics_items:
        draw.text((card_x + 32, my), lbl, font=get_font(12), fill=(226, 232, 240))
        b_val = get_font(12, bold=True).getbbox(val)
        draw.text((card_x + card_w - 32 - (b_val[2] - b_val[0]), my), val, font=get_font(12, bold=True), fill=(52, 211, 153))
        my += 21

    draw.rounded_rectangle([card_x + 20, card_y + 338, card_x + card_w - 20, card_y + 378], radius=8, fill=(16, 185, 129))
    font_btn = get_font(13, bold=True)
    btn_text = "Turbo & Smart Auto Ready"
    bbox_btn = font_btn.getbbox(btn_text)
    draw.text((card_x + (card_w - (bbox_btn[2] - bbox_btn[0])) // 2, card_y + 349), btn_text, font=font_btn, fill=(2, 44, 34))

    save_asset(img, "large_promo_1400x560.png")


# -------------------------------------------------------------
# 3. SCREENSHOT 1: DASHBOARD & PROFILES (1280 x 800)
# -------------------------------------------------------------
def generate_screenshot_1():
    width, height = 1280, 800
    img = Image.new("RGBA", (width, height), (7, 11, 18, 255))
    draw = ImageDraw.Draw(img)
    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    draw.rounded_rectangle([60, 40, width - 60, 110], radius=12, fill=(17, 24, 39), outline=(51, 65, 85))
    draw_lightning_bolt(draw, 96, 75, 28, (52, 211, 153))
    draw.text((125, 52), f"SmoothBoost v{VERSION_TAG} — Redesigned Control Panel", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((125, 82), "Archetype-aware acceleration for every site while protecting live calls, editors, and maps", font=get_font(13), fill=(148, 163, 184))

    view_x, view_y, view_w, view_h = 60, 140, 1160, 610
    draw.rounded_rectangle([view_x, view_y, view_x + view_w, view_y + view_h], radius=14, fill=(15, 23, 42), outline=(30, 41, 59), width=2)
    draw.rounded_rectangle([view_x, view_y, view_x + view_w, view_y + 44], radius=14, fill=(24, 32, 47))
    draw.rounded_rectangle([view_x, view_y + 26, view_x + view_w, view_y + 44], radius=0, fill=(24, 32, 47))
    draw.ellipse([view_x + 16, view_y + 16, view_x + 28, view_y + 28], fill=(239, 68, 68))
    draw.ellipse([view_x + 36, view_y + 16, view_x + 48, view_y + 28], fill=(245, 158, 11))
    draw.ellipse([view_x + 56, view_y + 16, view_x + 68, view_y + 28], fill=(16, 185, 129))

    draw.rounded_rectangle([view_x + 90, view_y + 9, view_x + view_w - 90, view_y + 35], radius=6, fill=(15, 23, 42), outline=(51, 65, 85))
    draw.text((view_x + 105, view_y + 14), "https://reddit.com/r/webdev — SmoothBoost Turbo Active", font=get_font(12), fill=(148, 163, 184))

    for row in range(5):
        ry = view_y + 70 + row * 92
        draw.rounded_rectangle([view_x + 40, ry, view_x + 680, ry + 72], radius=10, fill=(24, 32, 47), outline=(30, 41, 59))
        draw.text((view_x + 60, ry + 16), f"Feed Card & Shadow DOM Container #{row + 1}", font=get_font(15, bold=True), fill=(226, 232, 240))
        draw.text((view_x + 60, ry + 42), "content-visibility: auto • Passive wheel • Offscreen animations paused", font=get_font(11.5), fill=(100, 116, 139))

    pop_x, pop_y, pop_w, pop_h = view_x + 716, view_y + 52, 414, 526
    draw.rounded_rectangle([pop_x, pop_y, pop_x + pop_w, pop_y + pop_h], radius=14, fill=(11, 17, 29), outline=(16, 185, 129), width=2)
    draw.rounded_rectangle([pop_x, pop_y, pop_x + pop_w, pop_y + 52], radius=14, fill=(24, 34, 52))
    draw.rounded_rectangle([pop_x, pop_y + 30, pop_x + pop_w, pop_y + 52], radius=0, fill=(24, 34, 52))
    draw_lightning_bolt(draw, pop_x + 28, pop_y + 26, 20, (52, 211, 153))
    draw.text((pop_x + 48, pop_y + 17), "SmoothBoost", font=get_font(15, bold=True), fill=(255, 255, 255))
    draw_pill(draw, pop_x + 150, pop_y + 15, f"v{VERSION_TAG}", get_font(10, bold=True), (13, 42, 58), (56, 189, 248), (6, 182, 212), 7, 3)
    draw_pill(draw, pop_x + 206, pop_y + 15, "FREE", get_font(10, bold=True), (12, 46, 38), (52, 211, 153), (16, 185, 129), 7, 3)

    draw.ellipse([pop_x + 22, pop_y + 72, pop_x + 34, pop_y + 84], fill=(16, 185, 129))
    draw.text((pop_x + 42, pop_y + 68), "Active", font=get_font(16, bold=True), fill=(255, 255, 255))
    draw_pill(draw, pop_x + pop_w - 118, pop_y + 66, "Infinite Feed", get_font(10, bold=True), (13, 42, 58), (56, 189, 248), (6, 182, 212), 8, 3)
    draw.text((pop_x + 22, pop_y + 94), "Turbo: Maximum containment, Shadow DOM, and\nbackground-tab throttling active.", font=get_font(11.5), fill=(148, 163, 184), spacing=4)

    profs = [("Auto", False), ("Turbo", True), ("Balanced", False), ("Battery", False), ("Custom", False)]
    px = pop_x + 16
    for name, active in profs:
        bg = (16, 185, 129) if active else (24, 34, 52)
        fg = (2, 44, 34) if active else (203, 213, 225)
        border = None if active else (51, 65, 85)
        w, _ = draw_pill(draw, px, pop_y + 140, name, get_font(10.5, bold=True), bg, fg, border, 10, 5)
        px += w + 6

    feats = [
        ("Scroll Boost v2", "Zero-reflow compositor scroll pacing"),
        ("Shadow DOM Boost", "12 shreddit-* shadow roots optimized"),
        ("Site Rules Engine v3", "YouTube, Reddit, X, Twitch, AI chats"),
        ("Dynamic FPS Pacing", "Native / 30 / 60 / 90 / 120 FPS"),
        ("Memory & Background Guard", "Batched MutationObserver (4ms budget)")
    ]
    fy = pop_y + 190
    for fname, fdesc in feats:
        draw.rounded_rectangle([pop_x + 18, fy, pop_x + pop_w - 18, fy + 44], radius=8, fill=(15, 23, 42), outline=(30, 41, 59))
        draw.text((pop_x + 30, fy + 7), fname, font=get_font(12, bold=True), fill=(255, 255, 255))
        draw.text((pop_x + 30, fy + 24), fdesc, font=get_font(10.5), fill=(56, 189, 248))
        fy += 51

    draw.rounded_rectangle([pop_x + 18, pop_y + 462, pop_x + pop_w - 18, pop_y + 498], radius=8, fill=(45, 18, 24), outline=(185, 56, 64))
    draw.text((pop_x + 62, pop_y + 472), "Site looks broken? Turn off for this site", font=get_font(11.5, bold=True), fill=(248, 113, 113))
    save_asset(img, "screenshot1_1280x800.png")


# -------------------------------------------------------------
# 4. SCREENSHOT 2: SCROLL BOOST v2 & FPS TARGETS (1280 x 800)
# -------------------------------------------------------------
def generate_screenshot_2():
    width, height = 1280, 800
    img = Image.new("RGBA", (width, height), (7, 11, 18, 255))
    draw = ImageDraw.Draw(img)
    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    draw.rounded_rectangle([60, 40, width - 60, 110], radius=12, fill=(17, 24, 39), outline=(51, 65, 85))
    draw_lightning_bolt(draw, 96, 75, 28, (56, 189, 248))
    draw.text((125, 52), "Scroll Boost v2 & Native–120 FPS Pacing", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((125, 82), "Eliminates scroll-triggered layout reflows while matching any display refresh rate", font=get_font(13), fill=(148, 163, 184))

    col1_x, col2_x = 80, 660
    col_w, col_h = 540, 600

    draw.rounded_rectangle([col1_x, 140, col1_x + col_w, 140 + col_h], radius=12, fill=(17, 24, 39), outline=(51, 65, 85), width=2)
    draw.text((col1_x + 30, 170), "Scroll Boost v2 Architecture", font=get_font(20, bold=True), fill=(255, 255, 255))
    draw.text((col1_x + 30, 202), "Zero-reflow pipeline without wildcard repaint storms:", font=get_font(13), fill=(148, 163, 184))

    scroll_steps = [
        ("1. Passive Scroll Listeners", "Upgrades wheel & touchstart/touchmove listeners to passive\nso the GPU compositor scrolls without main-thread blocking."),
        ("2. Targeted Scroll Pausing", "Pauses tagged infinite loops & non-interactive offscreen\ncanvases during scroll without breaking inner scroll panes."),
        ("3. 4ms-Budgeted Mutation Queue", "Batches heavy React/SPA DOM mutations inside rAF frames\nso live feeds never stall mid-scroll."),
        ("4. App & Map Safeguards", "Preserves preventDefault() on Google Maps, Leaflet,\nFigma, Google Docs, Discord, and WebGL games.")
    ]
    sy = 245
    for title, desc in scroll_steps:
        draw.rounded_rectangle([col1_x + 25, sy, col1_x + col_w - 25, sy + 78], radius=8, fill=(15, 23, 42), outline=(30, 41, 59))
        draw.text((col1_x + 40, sy + 10), title, font=get_font(14, bold=True), fill=(56, 189, 248))
        draw.text((col1_x + 40, sy + 32), desc, font=get_font(11.5), fill=(203, 213, 225), spacing=3)
        sy += 92

    draw.rounded_rectangle([col2_x, 140, col2_x + col_w, 140 + col_h], radius=12, fill=(17, 24, 39), outline=(51, 65, 85), width=2)
    draw.text((col2_x + 30, 170), "Dynamic Display Pacing", font=get_font(20, bold=True), fill=(255, 255, 255))
    draw.text((col2_x + 30, 202), "Choose Native uncapped or target 30–120 FPS:", font=get_font(13), fill=(148, 163, 184))

    fps_options = [
        ("Native (Uncapped)", "Full 144Hz–240Hz ProMotion refresh without artificial caps", "Uncapped"),
        ("120 FPS Target", "Ultra-smooth pacing for high-refresh monitors and phones", "8.33 ms"),
        ("60 / 90 FPS Targets", "Balanced frame rhythm for laptops and tablets", "11–16 ms"),
        ("30 FPS Battery Mode", "Reduces background draw pressure on battery power", "33.3 ms")
    ]
    fy = 245
    for title, desc, stat in fps_options:
        draw.rounded_rectangle([col2_x + 25, fy, col2_x + col_w - 25, fy + 78], radius=8, fill=(15, 23, 42), outline=(30, 41, 59))
        draw.text((col2_x + 40, fy + 10), title, font=get_font(14, bold=True), fill=(52, 211, 153))
        draw.text((col2_x + 40, fy + 34), desc, font=get_font(11.5), fill=(203, 213, 225))
        draw_pill(draw, col2_x + col_w - 135, fy + 10, stat, get_font(10.5, bold=True), (24, 34, 52), (56, 189, 248), (51, 65, 85), 9, 3)
        fy += 92

    save_asset(img, "screenshot2_1280x800.png")


# -------------------------------------------------------------
# 5. SCREENSHOT 3: SHADOW DOM, SITE RULES & CROSS-PLATFORM (1280 x 800)
# -------------------------------------------------------------
def generate_screenshot_3():
    width, height = 1280, 800
    img = Image.new("RGBA", (width, height), (7, 11, 18, 255))
    draw = ImageDraw.Draw(img)
    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    draw.rounded_rectangle([60, 40, width - 60, 110], radius=12, fill=(17, 24, 39), outline=(51, 65, 85))
    draw_lightning_bolt(draw, 96, 75, 28, (52, 211, 153))
    draw.text((125, 52), "Site Rules v3, Shadow DOM & Cross-Platform Parity", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((125, 82), "Live on Firefox Add-ons & Microsoft Edge Add-ons, plus Chrome, Safari, Android & Userscript", font=get_font(13), fill=(148, 163, 184))

    cards = [
        (
            "Site Rules v3 & Shadow DOM",
            "Injects offscreen containment into open\nShadow Roots and heavy SPA feeds.",
            ["YouTube Comments & Feed", "Reddit shreddit-* Components", "X / Twitter Timelines", "Twitch & Kick Chat", "ChatGPT & Claude Turns", "Fandom Wiki Sidebars"],
            (6, 182, 212)
        ),
        (
            "Memory & Background Guard",
            "Continuously trims background tab\ntimers, video preloads & DOM overhead.",
            ["15s Adaptive Memory Sweep", "Hidden-Tab Timer Coalescing", "WebGL2 Instanced Skipping", "Contrast-Safe Blur Bypass", "4ms Batched DOM Observers", "Zero Reflow Canvas Checks"],
            (16, 185, 129)
        ),
        (
            "Every Browser & Platform",
            "Unified zero-telemetry experience across\ndesktop, mobile, and userscripts.",
            ["Firefox Add-ons (Live)", "Edge Add-ons (Live)", "Chrome & Brave MV3", "Safari macOS & iOS", "Titanium Android Touch UI", "CSP-Safe Userscript HUD"],
            (56, 189, 248)
        )
    ]

    card_w, card_h, start_x = 360, 580, 65
    for idx, (title, desc, items, accent_color) in enumerate(cards):
        cx = start_x + idx * 390
        cy = 150
        draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=14, fill=(17, 24, 39), outline=(51, 65, 85), width=2)
        draw.rounded_rectangle([cx, cy, cx + card_w, cy + 60], radius=14, fill=(24, 34, 52))
        draw.rounded_rectangle([cx, cy + 40, cx + card_w, cy + 60], radius=0, fill=(24, 34, 52))
        draw.text((cx + 20, cy + 18), title, font=get_font(16, bold=True), fill=(255, 255, 255))
        draw.text((cx + 20, cy + 78), desc, font=get_font(12), fill=(148, 163, 184), spacing=4)

        iy = cy + 148
        for item in items:
            draw.rounded_rectangle([cx + 20, iy, cx + card_w - 20, iy + 48], radius=8, fill=(15, 23, 42), outline=(30, 41, 59))
            draw.ellipse([cx + 36, iy + 18, cx + 48, iy + 30], fill=accent_color)
            draw.text((cx + 60, iy + 16), item, font=get_font(13, bold=True), fill=(226, 232, 240))
            iy += 60

        draw_pill(draw, cx + 20, cy + card_h - 55, "100% FREE & CLIENT-SIDE", get_font(11, bold=True), (24, 34, 52), accent_color, (51, 65, 85), 10, 4)

    save_asset(img, "screenshot3_1280x800.png")


if __name__ == "__main__":
    generate_store_icon()
    generate_small_promo()
    generate_large_promo()
    generate_screenshot_1()
    generate_screenshot_2()
    generate_screenshot_3()
