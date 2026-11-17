#!/usr/bin/env python3
"""
Generate high-fidelity store promotional tiles and screenshots for
Microsoft Partner Center and browser extension store listings.

Assets generated:
1. small_promo_440x280.png    - 440 x 280 pixels
2. large_promo_1400x560.png   - 1400 x 560 pixels
3. screenshot1_1280x800.png   - 1280 x 800 pixels (Extension Dashboard & Smart Auto)
4. screenshot2_1280x800.png   - 1280 x 800 pixels (Scroll Boost & Dynamic FPS)
5. screenshot3_1280x800.png   - 1280 x 800 pixels (Smart Loading & Memory Guard)
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "store")
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_HELVETICA = "/System/Library/Fonts/Helvetica.ttc"
FONT_ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"

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
    # Centered bolt polygon scaled by size
    points = [
        (cx + size * 0.1, cy - size * 0.5),
        (cx - size * 0.35, cy + size * 0.05),
        (cx - size * 0.02, cy + size * 0.05),
        (cx - size * 0.15, cy + size * 0.5),
        (cx + size * 0.4, cy - size * 0.08),
        (cx + size * 0.04, cy - size * 0.08),
    ]
    draw.polygon(points, fill=color)

# -------------------------------------------------------------
# 1. SMALL PROMOTIONAL TILE (440 x 280)
# -------------------------------------------------------------
def generate_small_promo():
    width, height = 440, 280
    img = Image.new("RGBA", (width, height), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

    # Gradient background
    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    # Glow orb in center
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([width//2 - 130, height//2 - 100, width//2 + 130, height//2 + 100], fill=(6, 182, 212, 45))
    glow = glow.filter(ImageFilter.GaussianBlur(35))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rounded_rectangle([1, 1, width - 2, height - 2], radius=12, outline=(30, 41, 59), width=1)

    # Icon Badge
    badge_x, badge_y, badge_size = width // 2, 64, 48
    draw.rounded_rectangle(
        [badge_x - badge_size//2, badge_y - badge_size//2, badge_x + badge_size//2, badge_y + badge_size//2],
        radius=12, fill=(17, 24, 39), outline=(6, 182, 212), width=2
    )
    draw_lightning_bolt(draw, badge_x, badge_y, 30, (56, 189, 248))

    # Title
    font_title = get_font(24, bold=True)
    title_text = "SmoothBoost"
    bbox = font_title.getbbox(title_text)
    t_w = bbox[2] - bbox[0]
    draw.text(((width - t_w)//2, 102), title_text, font=font_title, fill=(255, 255, 255))

    # Subtitle
    font_sub = get_font(13)
    sub_text = "Universal Web Performance Optimizer"
    bbox_s = font_sub.getbbox(sub_text)
    s_w = bbox_s[2] - bbox_s[0]
    draw.text(((width - s_w)//2, 134), sub_text, font=font_sub, fill=(148, 163, 184))

    # Feature pills
    font_pills = get_font(11, bold=True)
    pills = ["⚡ Scroll Boost", "📦 Smart Loading", "🎯 120 FPS"]
    total_w = sum(font_pills.getbbox(p)[2] - font_pills.getbbox(p)[0] + 20 for p in pills) + 16
    start_x = (width - total_w) // 2
    cur_x = start_x
    for p in pills:
        w, _ = draw_pill(draw, cur_x, 172, p, font_pills, (15, 23, 42), (56, 189, 248), (6, 182, 212), 10, 4)
        cur_x += w + 8

    # Bottom badge
    font_bot = get_font(11)
    bot_text = "Hardware-Composited • Zero Data Collection • Ultra Fast"
    bbox_b = font_bot.getbbox(bot_text)
    b_w = bbox_b[2] - bbox_b[0]
    draw.text(((width - b_w)//2, 232), bot_text, font=font_bot, fill=(100, 116, 139))

    out_path = os.path.join(OUTPUT_DIR, "small_promo_440x280.png")
    img.save(out_path, "PNG")
    print(f"Created: {out_path}")

# -------------------------------------------------------------
# 2. LARGE PROMOTIONAL TILE (1400 x 560)
# -------------------------------------------------------------
def generate_large_promo():
    width, height = 1400, 560
    img = Image.new("RGBA", (width, height), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

    # Gradient background
    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    # Cyan/Emerald ambient glows
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([80, 80, 580, 480], fill=(6, 182, 212, 35))
    glow_draw.ellipse([850, 100, 1350, 500], fill=(16, 185, 129, 30))
    glow = glow.filter(ImageFilter.GaussianBlur(65))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Left Section: Brand & Headline
    # Tag
    font_tag = get_font(14, bold=True)
    draw_pill(draw, 100, 80, "SMOOTHBOOST 2.4.0 • PERFORMANCE OPTIMIZER", font_tag, (6, 182, 212, 30), (56, 189, 248), (6, 182, 212), 14, 6)

    # Title
    font_hero = get_font(46, bold=True)
    draw.text((100, 140), "Eliminate Scroll Lag.\nUnleash Browser Speed.", font=font_hero, fill=(255, 255, 255), spacing=8)

    # Description
    font_desc = get_font(17)
    desc = (
        "Universal client-side performance engine engineered for Microsoft Edge.\n"
        "Dynamically detects page archetypes, paces animation frames at up to 120 FPS,\n"
        "defers heavy offscreen embeds, and keeps scrolling silky smooth."
    )
    draw.text((100, 275), desc, font=font_desc, fill=(148, 163, 184), spacing=6)

    # Bullet badges
    font_bullets = get_font(14, bold=True)
    bullets = [
        ("⚡ Scroll Boost", "Suppresses heavy canvas thrash during scrolling"),
        ("📦 Smart Resource Loading", "Defers offscreen YouTube, Twitter & social embeds"),
        ("🎯 Dynamic FPS Limiter", "Configurable 30, 60, 90, and 120 FPS frame pacing"),
        ("🛡️ Zero Telemetry", "100% client-side execution; collects zero user data")
    ]
    cur_y = 380
    for title, detail in bullets[:2]:
        draw_pill(draw, 100, cur_y, title, font_bullets, (30, 41, 59), (56, 189, 248), (51, 65, 85), 12, 6)
        draw.text((290, cur_y + 6), f"— {detail}", font=font_desc, fill=(203, 213, 225))
        cur_y += 42
    for title, detail in bullets[2:]:
        draw_pill(draw, 100, cur_y, title, font_bullets, (30, 41, 59), (56, 189, 248), (51, 65, 85), 12, 6)
        draw.text((290, cur_y + 6), f"— {detail}", font=font_desc, fill=(203, 213, 225))
        cur_y += 42

    # Right Section: Extension Mockup Card
    card_x, card_y, card_w, card_h = 880, 75, 420, 410
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=16, fill=(17, 24, 39, 240), outline=(51, 65, 85), width=2)

    # Popup Header inside card
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + 54], radius=16, fill=(30, 41, 59))
    draw.rounded_rectangle([card_x, card_y + 36, card_x + card_w, card_y + 54], radius=0, fill=(30, 41, 59))
    draw_lightning_bolt(draw, card_x + 30, card_y + 27, 20, (6, 182, 212))
    font_card_head = get_font(16, bold=True)
    draw.text((card_x + 48, card_y + 18), "SmoothBoost", font=font_card_head, fill=(255, 255, 255))
    draw_pill(draw, card_x + card_w - 75, card_y + 14, "v2.4.0", get_font(11, bold=True), (6, 182, 212, 40), (56, 189, 248), (6, 182, 212), 8, 3)

    # Status row inside card
    font_status_title = get_font(18, bold=True)
    draw.ellipse([card_x + 24, card_y + 78, card_x + 36, card_y + 90], fill=(16, 185, 129))
    draw.text((card_x + 44, card_y + 74), "Active & Optimizing", font=font_status_title, fill=(255, 255, 255))
    draw.text((card_x + 24, card_y + 104), "Smart Auto: Running verified heuristics for fluid browsing.", font=get_font(12), fill=(148, 163, 184))

    # Profiles Selector mockup
    font_prof = get_font(11, bold=True)
    profs = ["Smart Auto", "Turbo", "Balanced", "Battery"]
    px = card_x + 20
    for idx, pr in enumerate(profs):
        is_active = (idx == 0)
        bg = (6, 182, 212) if is_active else (30, 41, 59)
        fg = (0, 0, 0) if is_active else (203, 213, 225)
        border = None if is_active else (51, 65, 85)
        w, _ = draw_pill(draw, px, card_y + 138, pr, font_prof, bg, fg, border, 12, 6)
        px += w + 8

    # Metrics section
    draw.rounded_rectangle([card_x + 20, card_y + 184, card_x + card_w - 20, card_y + 300], radius=10, fill=(15, 23, 42), outline=(30, 41, 59))
    draw.text((card_x + 32, card_y + 196), "LIVE OPTIMIZER TELEMETRY", font=get_font(11, bold=True), fill=(100, 116, 139))
    metrics_items = [
        ("↕️ Passive Listeners", "14 Active"),
        ("⚡ Scroll Boost", "Compositor Engaged"),
        ("📦 Deferred Embeds", "6 Third-Party"),
        ("🎯 Frame Rate Target", "120 FPS Locked")
    ]
    my = card_y + 220
    for lbl, val in metrics_items:
        draw.text((card_x + 32, my), lbl, font=get_font(12), fill=(226, 232, 240))
        b_val = get_font(12, bold=True).getbbox(val)
        draw.text((card_x + card_w - 32 - (b_val[2] - b_val[0]), my), val, font=get_font(12, bold=True), fill=(56, 189, 248))
        my += 18

    # Action Button mockup
    draw.rounded_rectangle([card_x + 20, card_y + 316, card_x + card_w - 20, card_y + 356], radius=8, fill=(6, 182, 212))
    font_btn = get_font(13, bold=True)
    btn_text = "⚡ Maximum Boost Enabled"
    bbox_btn = font_btn.getbbox(btn_text)
    draw.text((card_x + (card_w - (bbox_btn[2] - bbox_btn[0]))//2, card_y + 326), btn_text, font=font_btn, fill=(0, 0, 0))

    out_path = os.path.join(OUTPUT_DIR, "large_promo_1400x560.png")
    img.save(out_path, "PNG")
    print(f"Created: {out_path}")

# -------------------------------------------------------------
# 3. SCREENSHOT 1: DASHBOARD & PROFILES (1280 x 800)
# -------------------------------------------------------------
def generate_screenshot_1():
    width, height = 1280, 800
    img = Image.new("RGBA", (width, height), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    # Top banner header
    draw.rounded_rectangle([60, 40, width - 60, 110], radius=12, fill=(17, 24, 39, 200), outline=(51, 65, 85))
    draw_lightning_bolt(draw, 96, 75, 28, (6, 182, 212))
    draw.text((125, 54), "SmoothBoost — Adaptive Performance Profiles", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((125, 82), "Smart Auto analyzes page archetypes to maximize smoothness without breaking web applications", font=get_font(13), fill=(148, 163, 184))

    # Simulated browser viewport mockup
    view_x, view_y, view_w, view_h = 60, 140, 1160, 610
    draw.rounded_rectangle([view_x, view_y, view_x + view_w, view_y + view_h], radius=14, fill=(15, 23, 42), outline=(30, 41, 59), width=2)

    # Browser tab bar mockup
    draw.rounded_rectangle([view_x, view_y, view_x + view_w, view_y + 44], radius=14, fill=(24, 32, 47))
    draw.rounded_rectangle([view_x, view_y + 26, view_x + view_w, view_y + 44], radius=0, fill=(24, 32, 47))
    # Window dots
    draw.ellipse([view_x + 16, view_y + 16, view_x + 28, view_y + 28], fill=(239, 68, 68))
    draw.ellipse([view_x + 36, view_y + 16, view_x + 48, view_y + 28], fill=(245, 158, 11))
    draw.ellipse([view_x + 56, view_y + 16, view_x + 68, view_y + 28], fill=(16, 185, 129))

    # Address bar
    draw.rounded_rectangle([view_x + 90, view_y + 9, view_x + view_w - 90, view_y + 35], radius=6, fill=(15, 23, 42), outline=(51, 65, 85))
    draw.text((view_x + 105, view_y + 14), "🔒 https://example.com/feed — SmoothBoost Active (120 FPS)", font=get_font(12), fill=(148, 163, 184))

    # Background webpage content mockup
    for row in range(5):
        ry = view_y + 70 + row * 90
        draw.rounded_rectangle([view_x + 40, ry, view_x + 680, ry + 70], radius=8, fill=(24, 32, 47), outline=(30, 41, 59))
        draw.text((view_x + 60, ry + 16), f"Dynamic Web Application Content Block #{row + 1}", font=get_font(15, bold=True), fill=(226, 232, 240))
        draw.text((view_x + 60, ry + 40), "Scroll listener converted to passive • Offscreen images asynchronous decode • CSS animations optimized", font=get_font(11), fill=(100, 116, 139))

    # Floating Popup UI mockup on the right
    pop_x, pop_y, pop_w, pop_h = view_x + 720, view_y + 55, 410, 520
    draw.rounded_rectangle([pop_x, pop_y, pop_x + pop_w, pop_y + pop_h], radius=14, fill=(17, 24, 39), outline=(6, 182, 212), width=2)

    # Popup title
    draw.rounded_rectangle([pop_x, pop_y, pop_x + pop_w, pop_y + 50], radius=14, fill=(30, 41, 59))
    draw.rounded_rectangle([pop_x, pop_y + 30, pop_x + pop_w, pop_y + 50], radius=0, fill=(30, 41, 59))
    draw_lightning_bolt(draw, pop_x + 28, pop_y + 25, 20, (6, 182, 212))
    draw.text((pop_x + 48, pop_y + 16), "SmoothBoost Control Panel", font=get_font(15, bold=True), fill=(255, 255, 255))

    # Status box
    draw.ellipse([pop_x + 24, pop_y + 72, pop_x + 36, pop_y + 84], fill=(16, 185, 129))
    draw.text((pop_x + 44, pop_y + 68), "Smart Auto: Active", font=get_font(17, bold=True), fill=(255, 255, 255))
    draw.text((pop_x + 24, pop_y + 96), "Detected: Standard Responsive Feed\nApplying compositor scroll acceleration and passive listeners.", font=get_font(11.5), fill=(148, 163, 184), spacing=4)

    # Mode Selector
    profs = [("Smart Auto", True), ("Turbo", False), ("Balanced", False), ("Battery", False)]
    px = pop_x + 18
    for name, active in profs:
        bg = (6, 182, 212) if active else (30, 41, 59)
        fg = (0, 0, 0) if active else (203, 213, 225)
        border = None if active else (51, 65, 85)
        w, _ = draw_pill(draw, px, pop_y + 148, name, get_font(11, bold=True), bg, fg, border, 10, 5)
        px += w + 6

    # Features Active List
    feats = [
        ("⚡ Scroll Boost", "Idle debounced (160ms)"),
        ("📦 Smart Resource Loading", "3 Embeds deferred"),
        ("🛡️ Memory Guard", "Monitoring heap usage"),
        ("🎯 Dynamic FPS Limiter", "Target: 120 FPS (Fluid)"),
        ("🔄 SPA Optimization", "Route detection active")
    ]
    fy = pop_y + 200
    for fname, fdesc in feats:
        draw.rounded_rectangle([pop_x + 18, fy, pop_x + pop_w - 18, fy + 44], radius=6, fill=(15, 23, 42), outline=(30, 41, 59))
        draw.text((pop_x + 30, fy + 8), fname, font=get_font(12, bold=True), fill=(255, 255, 255))
        draw.text((pop_x + 30, fy + 24), fdesc, font=get_font(10.5), fill=(56, 189, 248))
        fy += 50

    # Red emergency turn off button
    draw.rounded_rectangle([pop_x + 18, pop_y + 465, pop_x + pop_w - 18, pop_y + 500], radius=6, fill=(239, 68, 68, 30), outline=(239, 68, 68))
    draw.text((pop_x + 55, pop_y + 474), "Site looks broken? Turn off for this site", font=get_font(11, bold=True), fill=(248, 113, 113))

    out_path = os.path.join(OUTPUT_DIR, "screenshot1_1280x800.png")
    img.save(out_path, "PNG")
    print(f"Created: {out_path}")

# -------------------------------------------------------------
# 4. SCREENSHOT 2: SCROLL BOOST & DYNAMIC FPS (1280 x 800)
# -------------------------------------------------------------
def generate_screenshot_2():
    width, height = 1280, 800
    img = Image.new("RGBA", (width, height), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    # Top banner header
    draw.rounded_rectangle([60, 40, width - 60, 110], radius=12, fill=(17, 24, 39, 200), outline=(51, 65, 85))
    draw_lightning_bolt(draw, 96, 75, 28, (6, 182, 212))
    draw.text((125, 54), "SmoothBoost — Scroll Boost & Dynamic FPS Targets", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((125, 82), "Lock fluid 60, 90, or 120 FPS frame pacing while eliminating jank during active scrolling", font=get_font(13), fill=(148, 163, 184))

    # Two Column Layout: Left Column (Scroll Boost), Right Column (FPS Profiles)
    col1_x, col2_x = 80, 660
    col_w, col_h = 540, 600

    # Column 1: Scroll Boost Breakdown
    draw.rounded_rectangle([col1_x, 140, col1_x + col_w, 140 + col_h], radius=12, fill=(17, 24, 39), outline=(51, 65, 85), width=2)
    draw.text((col1_x + 30, 170), "⚡ Scroll Boost Architecture", font=get_font(20, bold=True), fill=(255, 255, 255))
    draw.text((col1_x + 30, 202), "How SmoothBoost achieves stutter-free 120 FPS scrolling:", font=get_font(13), fill=(148, 163, 184))

    scroll_steps = [
        ("1. Passive Event Enforcement", "Converts synchronous wheel & touch listeners to passive,\nguaranteeing the browser compositor never waits on main thread JS."),
        ("2. Active Scroll Workload Drop", "Temporarily suppresses non-essential offscreen canvas draws\nand heavy backdrop blurs while the user is actively scrolling."),
        ("3. Instant 160ms Idle Restoration", "Within 160ms of scrolling stopping, full visual fidelity and\nall background animation states are restored completely."),
        ("4. Interactive Map & Game Safeguards", "Automatically detects interactive sliders, Google Maps, and\nLeaflet containers, protecting their preventDefault capability.")
    ]
    sy = 245
    for title, desc in scroll_steps:
        draw.rounded_rectangle([col1_x + 25, sy, col1_x + col_w - 25, sy + 76], radius=8, fill=(15, 23, 42), outline=(30, 41, 59))
        draw.text((col1_x + 40, sy + 10), title, font=get_font(14, bold=True), fill=(56, 189, 248))
        draw.text((col1_x + 40, sy + 32), desc, font=get_font(11.5), fill=(203, 213, 225), spacing=3)
        sy += 90

    # Column 2: Dynamic FPS Profiles
    draw.rounded_rectangle([col2_x, 140, col2_x + col_w, 140 + col_h], radius=12, fill=(17, 24, 39), outline=(51, 65, 85), width=2)
    draw.text((col2_x + 30, 170), "🎯 Dynamic FPS Profiles", font=get_font(20, bold=True), fill=(255, 255, 255))
    draw.text((col2_x + 30, 202), "Pace requestAnimationFrame to match hardware refresh rates:", font=get_font(13), fill=(148, 163, 184))

    fps_options = [
        ("120 FPS Target", "Ultra-smooth high-refresh rate pacing for gaming & ProMotion displays", "8.33 ms frame interval"),
        ("90 FPS Target", "Optimized balance for modern high-refresh laptops and tablets", "11.11 ms frame interval"),
        ("60 FPS Target", "Standard universal fluid target for maximum stability", "16.67 ms frame interval"),
        ("30 FPS Target", "Battery-saving profile for low-power and intensive mobile sessions", "33.33 ms frame interval")
    ]
    fy = 245
    for title, desc, stat in fps_options:
        draw.rounded_rectangle([col2_x + 25, fy, col2_x + col_w - 25, fy + 76], radius=8, fill=(15, 23, 42), outline=(30, 41, 59))
        draw.text((col2_x + 40, fy + 10), title, font=get_font(14, bold=True), fill=(16, 185, 129))
        draw.text((col2_x + 40, fy + 32), desc, font=get_font(11.5), fill=(203, 213, 225))
        draw_pill(draw, col2_x + col_w - 180, fy + 10, stat, get_font(10, bold=True), (30, 41, 59), (56, 189, 248), (51, 65, 85), 8, 3)
        fy += 90

    out_path = os.path.join(OUTPUT_DIR, "screenshot2_1280x800.png")
    img.save(out_path, "PNG")
    print(f"Created: {out_path}")

# -------------------------------------------------------------
# 5. SCREENSHOT 3: SMART LOADING & MEMORY GUARD (1280 x 800)
# -------------------------------------------------------------
def generate_screenshot_3():
    width, height = 1280, 800
    img = Image.new("RGBA", (width, height), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

    draw_gradient_rect(draw, (0, 0, width, height), (15, 23, 42), (2, 6, 23))

    # Top banner header
    draw.rounded_rectangle([60, 40, width - 60, 110], radius=12, fill=(17, 24, 39, 200), outline=(51, 65, 85))
    draw_lightning_bolt(draw, 96, 75, 28, (6, 182, 212))
    draw.text((125, 54), "SmoothBoost — Smart Resource Loading & Memory Guard", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((125, 82), "Prevent offscreen third-party embed bloat and automatically drop background memory pressure", font=get_font(13), fill=(148, 163, 184))

    # 3 Feature Showcase Cards
    cards = [
        (
            "📦 Smart Resource Deferral",
            "Defers heavy offscreen third-party embed scripts until within 400px of viewport.",
            ["YouTube Videos", "Vimeo Players", "Twitter Timelines", "Spotify & SoundCloud", "Instagram Cards", "TikTok Embeds"],
            (6, 182, 212)
        ),
        (
            "🛡️ Automatic Memory Guard",
            "Monitors JS heap allocation and high DOM element counts (>3,500 elements).",
            ["Unloads Background Preloads", "Prunes Canvas Buffers", "Garbage Collection Assist", "Protects Against Tab Crashes", "Battery Saver Indication"],
            (16, 185, 129)
        ),
        (
            "🚨 Safe Mode Auto-Recovery",
            "Watchdog detects repeated errors (≥4 in 3s) and safely protects page integrity.",
            ["Consecutive Error Watchdog", "Automatic Safe Mode Demotion", "One-Click Restore Notification", "Host Exemption Cache", "Zero Breakage Guarantee"],
            (245, 158, 11)
        )
    ]

    card_w = 360
    card_h = 580
    start_x = 65

    for idx, (title, desc, items, accent_color) in enumerate(cards):
        cx = start_x + idx * 390
        cy = 150
        draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=14, fill=(17, 24, 39), outline=(51, 65, 85), width=2)

        # Header
        draw.rounded_rectangle([cx, cy, cx + card_w, cy + 60], radius=14, fill=(30, 41, 59))
        draw.rounded_rectangle([cx, cy + 40, cx + card_w, cy + 60], radius=0, fill=(30, 41, 59))
        draw.text((cx + 20, cy + 18), title, font=get_font(16, bold=True), fill=(255, 255, 255))

        # Description
        draw.text((cx + 20, cy + 80), desc, font=get_font(12), fill=(148, 163, 184), spacing=4)

        # Item Pills / Checkmarks
        iy = cy + 150
        for item in items:
            draw.rounded_rectangle([cx + 20, iy, cx + card_w - 20, iy + 48], radius=8, fill=(15, 23, 42), outline=(30, 41, 59))
            draw.ellipse([cx + 36, iy + 18, cx + 48, iy + 30], fill=accent_color)
            draw.text((cx + 60, iy + 16), item, font=get_font(13, bold=True), fill=(226, 232, 240))
            iy += 60

        # Footer badge
        draw_pill(draw, cx + 20, cy + card_h - 55, "CLIENT-SIDE & SAFE", get_font(11, bold=True), (30, 41, 59), accent_color, (51, 65, 85), 10, 4)

    out_path = os.path.join(OUTPUT_DIR, "screenshot3_1280x800.png")
    img.save(out_path, "PNG")
    print(f"Created: {out_path}")

if __name__ == "__main__":
    generate_small_promo()
    generate_large_promo()
    generate_screenshot_1()
    generate_screenshot_2()
    generate_screenshot_3()
