# /// script
# dependencies = [
#   "python-pptx",
# ]
# ///
"""
Top-50 Keynote-Style PPTX Generator for AURA - iQOO Hackathon 2026
Apple keynote / YC pitch / Google I/O aesthetic.
"""
import collections
import collections.abc
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

# --- Image Paths ---
IMG_DIR = r"C:\Users\Krish Kumar\.gemini\antigravity\brain\967ec1c2-0cf2-4a48-9aaf-709915bd164c"
OUT_DIR = r"C:\Users\Krish Kumar\.gemini\antigravity\scratch\aura-student-copilot\docs"

hero_img = None
journey_img = None
arch_img = None
mockup_img = None
market_img = None

for f in os.listdir(IMG_DIR):
    fp = os.path.join(IMG_DIR, f)
    if not f.endswith(".png"):
        continue
    if "hero_phone_ai" in f:
        hero_img = fp
    elif "student_journey" in f:
        journey_img = fp
    elif "hybrid_architecture" in f:
        arch_img = fp
    elif "phone_mockup" in f:
        mockup_img = fp
    elif "market_students" in f:
        market_img = fp

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)

    # Theme
    BG = RGBColor(10, 10, 15)
    BG2 = RGBColor(15, 17, 25)
    CARD = RGBColor(22, 24, 35)
    WHITE = RGBColor(240, 240, 245)
    MUTED = RGBColor(160, 165, 185)
    TEAL = RGBColor(100, 220, 240)
    RED = RGBColor(255, 100, 120)
    GREEN = RGBColor(130, 230, 150)
    GOLD = RGBColor(255, 200, 80)
    PURPLE = RGBColor(180, 130, 255)

    blank = prs.slide_layouts[6]

    def bg(slide, color=BG):
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = color

    def rect(slide, l, t, w, h, color):
        s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(l), Inches(t), Inches(w), Inches(h))
        s.fill.solid()
        s.fill.fore_color.rgb = color
        s.line.fill.background()
        return s

    def txt(slide, l, t, w, h, text, size=28, color=WHITE, bold=False, align=PP_ALIGN.LEFT, font="Segoe UI"):
        box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = text
        p.font.name = font
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.font.bold = bold
        p.alignment = align
        return tf

    def add_img(slide, path, l, t, w, h):
        if path and os.path.exists(path):
            slide.shapes.add_picture(path, Inches(l), Inches(t), Inches(w), Inches(h))

    # =====================================================
    # SLIDE 1: TITLE - "AURA"
    # =====================================================
    s1 = prs.slides.add_slide(blank)
    bg(s1)

    # Hero image on the right
    add_img(s1, hero_img, 6.5, 0.3, 6.5, 6.9)

    # Gradient overlay card on the left
    rect(s1, 0, 0, 7.5, 7.5, BG)

    # Tag line
    txt(s1, 0.9, 1.8, 6, 0.4, "iQOO HACKATHON 2026  •  AGENTKIT TRACK", 13, TEAL, True)
    # Main Title
    txt(s1, 0.9, 2.5, 6, 1.5, "AURA", 96, WHITE, True)
    # Subtitle
    txt(s1, 0.9, 4.2, 6, 0.8, "The First Privacy-First\nAcademic Operating System", 30, MUTED, False)
    # Accent bar
    rect(s1, 0.9, 5.3, 2.5, 0.06, TEAL)
    # Bottom tagline
    txt(s1, 0.9, 5.6, 6, 0.5, "On-Device Intelligence  •  Zero Cloud  •  100% Offline", 14, MUTED, False)

    # =====================================================
    # SLIDE 2: THE ₹0 STUDENT REALITY
    # =====================================================
    s2 = prs.slides.add_slide(blank)
    bg(s2)

    txt(s2, 0.9, 0.5, 11, 0.4, "THE PROBLEM", 13, TEAL, True)
    txt(s2, 0.9, 1.0, 11, 0.9, "The ₹0 Student Reality", 52, WHITE, True)

    # Three stat cards
    stats = [
        ("📡", "No Internet", "68% of Indian classrooms\nhave unreliable connectivity", RED),
        ("💸", "No Subscriptions", "₹1,700/mo for ChatGPT Plus.\nAvg student budget: ₹0 for AI.", GOLD),
        ("🔓", "No Privacy", "Every upload trains someone\nelse's model on your notes.", PURPLE),
    ]
    x_start = 0.9
    for emoji, title, desc, accent in stats:
        rect(s2, x_start, 2.5, 3.6, 4.2, CARD)
        rect(s2, x_start, 2.5, 3.6, 0.1, accent)
        txt(s2, x_start + 0.3, 2.9, 3, 0.7, emoji, 48, WHITE, False, PP_ALIGN.LEFT)
        txt(s2, x_start + 0.3, 3.7, 3, 0.5, title, 26, accent, True)
        txt(s2, x_start + 0.3, 4.5, 3, 1.8, desc, 16, MUTED, False)
        x_start += 4.05

    # =====================================================
    # SLIDE 3: WHY EXISTING AI FAILS
    # =====================================================
    s3 = prs.slides.add_slide(blank)
    bg(s3)

    txt(s3, 0.9, 0.5, 11, 0.4, "COMPETITIVE LANDSCAPE", 13, TEAL, True)
    txt(s3, 0.9, 1.0, 11, 0.9, "Why Existing AI Fails Students", 52, WHITE, True)

    # Comparison table header
    rect(s3, 0.9, 2.5, 11.5, 0.7, TEAL)
    cols = [("Feature", 2.8), ("ChatGPT", 1.8), ("Gemini", 1.8), ("Notion AI", 1.8), ("AURA", 1.8)]
    cx = 0.9
    for label, w in cols:
        txt(s3, cx + 0.15, 2.55, w - 0.3, 0.6, label, 16, BG, True, PP_ALIGN.CENTER)
        cx += w + 0.28

    # Table rows
    rows_data = [
        ("Works Offline", "❌", "❌", "❌", "✅"),
        ("Free Forever", "❌", "⚠️", "❌", "✅"),
        ("On-Device LLM", "❌", "❌", "❌", "✅"),
        ("Data Stays Local", "❌", "❌", "❌", "✅"),
        ("Live Lecture Capture", "❌", "❌", "❌", "✅"),
        ("Auto Scheduling", "❌", "❌", "⚠️", "✅"),
    ]
    ry = 3.35
    for i, (feat, c1, c2, c3, c4) in enumerate(rows_data):
        row_color = CARD if i % 2 == 0 else BG2
        rect(s3, 0.9, ry, 11.5, 0.6, row_color)
        cx = 0.9
        vals = [feat, c1, c2, c3, c4]
        for j, (_, w) in enumerate(cols):
            clr = WHITE if j == 0 else (GREEN if vals[j] == "✅" else (RED if vals[j] == "❌" else GOLD))
            al = PP_ALIGN.LEFT if j == 0 else PP_ALIGN.CENTER
            bld = True if j == 0 else False
            txt(s3, cx + 0.15, ry + 0.05, w - 0.3, 0.5, vals[j], 15, clr, bld, al)
            cx += w + 0.28
        ry += 0.62

    # =====================================================
    # SLIDE 4: THE AURA MOMENT (User Journey)
    # =====================================================
    s4 = prs.slides.add_slide(blank)
    bg(s4)

    txt(s4, 0.9, 0.5, 11, 0.4, "USER JOURNEY", 13, TEAL, True)
    txt(s4, 0.9, 1.0, 6, 0.9, "The AURA Moment", 52, WHITE, True)

    # Journey image fills most of the slide
    add_img(s4, journey_img, 0.5, 2.2, 12.3, 5.0)

    # Journey step labels at bottom
    steps = ["📖 Enter Lecture", "🎙️ Record", "📝 Summarize", "🃏 Flashcards", "📅 Schedule"]
    sx = 0.9
    for step in steps:
        txt(s4, sx, 2.3, 2.2, 0.4, step, 14, TEAL, True, PP_ALIGN.CENTER)
        sx += 2.35

    # =====================================================
    # SLIDE 5: HYBRID ARCHITECTURE (Apple Keynote Style)
    # =====================================================
    s5 = prs.slides.add_slide(blank)
    bg(s5)

    txt(s5, 0.9, 0.5, 11, 0.4, "SYSTEM DESIGN", 13, TEAL, True)
    txt(s5, 0.9, 1.0, 11, 0.9, "The Hybrid Architecture", 52, WHITE, True)

    # Architecture image
    add_img(s5, arch_img, 0.5, 2.0, 12.3, 5.2)

    # Three labels overlay
    arch_labels = [
        (1.5, "🧠 Phone Brain", "Gemini Nano / Llama 3.2\nSpeech-to-Text\nContext Engine", TEAL),
        (5.3, "🔗 Office Kit Bridge", "iQOO Office Kit\nLocal TCP Socket\nReal-time Sync", GOLD),
        (9.1, "💻 Laptop Muscle", "FastAPI Server\nFAISS / ChromaDB\nPDF Vectorization", GREEN),
    ]
    for x, title, desc, accent in arch_labels:
        rect(s5, x, 5.5, 3.2, 1.7, CARD)
        rect(s5, x, 5.5, 3.2, 0.08, accent)
        txt(s5, x + 0.2, 5.65, 2.8, 0.4, title, 16, accent, True, PP_ALIGN.CENTER)
        txt(s5, x + 0.2, 6.1, 2.8, 1.0, desc, 12, MUTED, False, PP_ALIGN.CENTER)

    # =====================================================
    # SLIDE 6: LIVE DEMO FLOW (Mockups)
    # =====================================================
    s6 = prs.slides.add_slide(blank)
    bg(s6)

    txt(s6, 0.9, 0.5, 11, 0.4, "PRODUCT DEMO", 13, TEAL, True)
    txt(s6, 0.9, 1.0, 6, 0.9, "Live Demo Flow", 52, WHITE, True)

    # App mockup image center
    add_img(s6, mockup_img, 3.0, 1.8, 7.3, 5.5)

    # Demo flow steps on the left
    demo_steps = [
        ("01", "Open Aura during lecture"),
        ("02", "Tap Record — live STT begins"),
        ("03", "AI extracts key concepts"),
        ("04", "Auto-generates flashcards"),
        ("05", "Schedules revision in calendar"),
    ]
    dy = 2.2
    for num, label in demo_steps:
        txt(s6, 0.5, dy, 0.5, 0.35, num, 18, TEAL, True)
        txt(s6, 1.1, dy, 2.2, 0.35, label, 14, WHITE, False)
        dy += 0.75

    # =====================================================
    # SLIDE 7: INNOVATION
    # =====================================================
    s7 = prs.slides.add_slide(blank)
    bg(s7)

    txt(s7, 0.9, 0.5, 11, 0.4, "WHAT MAKES US DIFFERENT", 13, TEAL, True)
    txt(s7, 0.9, 1.0, 11, 0.9, "Innovation Stack", 52, WHITE, True)

    innovations = [
        ("🧠", "On-Device Gemini Nano", "First student app running Google's on-device foundation model for instant, private inference.", TEAL),
        ("📍", "Deep Context Awareness", "Fuses location, calendar, class schedule, and usage patterns into a single intelligence loop.", PURPLE),
        ("✈️", "Fully Offline Intelligence", "Core features work in airplane mode. No internet, no compromise, no data leaks.", GREEN),
        ("🔀", "Hybrid Execution Model", "Seamlessly distributes workloads between phone NPU and laptop GPU via iQOO Office Kit.", GOLD),
    ]
    ix = 0.9
    for emoji, title, desc, accent in innovations:
        rect(s7, ix, 2.5, 2.85, 4.2, CARD)
        rect(s7, ix, 2.5, 2.85, 0.1, accent)
        txt(s7, ix + 0.25, 2.9, 2.35, 0.6, emoji, 40, WHITE, False)
        txt(s7, ix + 0.25, 3.6, 2.35, 0.5, title, 18, accent, True)
        txt(s7, ix + 0.25, 4.3, 2.35, 2.0, desc, 14, MUTED, False)
        ix += 3.05

    # =====================================================
    # SLIDE 8: MARKET OPPORTUNITY
    # =====================================================
    s8 = prs.slides.add_slide(blank)
    bg(s8)

    txt(s8, 0.9, 0.5, 11, 0.4, "MARKET SIZE", 13, TEAL, True)
    txt(s8, 0.9, 1.0, 6, 0.9, "Market Opportunity", 52, WHITE, True)

    # Market image on right
    add_img(s8, market_img, 6.5, 1.5, 6.3, 5.5)

    # Stats on the left
    market_stats = [
        ("250M+", "Students in India alone", TEAL),
        ("$15B", "EdTech TAM by 2027", GOLD),
        ("92%", "Smartphone penetration\namong Indian college students", GREEN),
        ("₹0", "Aura's cost to the student", RED),
    ]
    my = 2.3
    for big_num, label, accent in market_stats:
        txt(s8, 0.9, my, 3, 0.6, big_num, 42, accent, True)
        txt(s8, 0.9, my + 0.6, 4.5, 0.6, label, 15, MUTED, False)
        my += 1.25

    # =====================================================
    # SLIDE 9: WHY iQOO WINS
    # =====================================================
    s9 = prs.slides.add_slide(blank)
    bg(s9)

    txt(s9, 0.9, 0.5, 11, 0.4, "PLATFORM SYNERGY", 13, TEAL, True)
    txt(s9, 0.9, 1.0, 11, 0.9, "Why iQOO is Essential", 52, WHITE, True)

    iqoo_points = [
        ("⚡", "Flagship NPU Performance", "iQOO's Snapdragon 8 Gen 3 NPU delivers 45 TOPS — enough to run quantized 3B parameter models at conversational speed on-device.", TEAL),
        ("🔌", "iQOO Office Kit Bridge", "The proprietary Office Kit creates a seamless local TCP bridge between phone and laptop — the backbone of the Hybrid Architecture.", GOLD),
        ("🔋", "All-Day Battery", "6000mAh battery ensures Aura runs through back-to-back lectures without power anxiety, unlike competitors.", GREEN),
        ("📱", "Phone-First Philosophy", "iQOO's focus on performance-per-rupee matches Aura's mission: premium AI experiences accessible to every student at ₹0.", PURPLE),
    ]
    iy = 2.4
    for emoji, title, desc, accent in iqoo_points:
        rect(s9, 0.9, iy, 11.5, 1.05, CARD)
        rect(s9, 0.9, iy, 0.12, 1.05, accent)
        txt(s9, 1.2, iy + 0.08, 0.6, 0.5, emoji, 28, WHITE, False)
        txt(s9, 1.9, iy + 0.08, 3, 0.4, title, 20, accent, True)
        txt(s9, 1.9, iy + 0.5, 10, 0.5, desc, 13, MUTED, False)
        iy += 1.2

    # =====================================================
    # SLIDE 10: VISION (Closing)
    # =====================================================
    s10 = prs.slides.add_slide(blank)
    bg(s10)

    # Center everything
    rect(s10, 0, 0, 13.33, 7.5, BG)

    # Accent line
    rect(s10, 5.5, 2.5, 2.33, 0.06, TEAL)

    # Big quote
    txt(s10, 1.5, 3.0, 10.33, 1.5,
        '"Every student deserves\na private AI companion."',
        44, WHITE, True, PP_ALIGN.CENTER)

    # Subtitle
    txt(s10, 2.5, 4.8, 8.33, 0.6,
        "Aura makes it possible — offline, on-device, and completely free.",
        18, MUTED, False, PP_ALIGN.CENTER)

    # Bottom branding
    rect(s10, 5.5, 5.8, 2.33, 0.06, TEAL)
    txt(s10, 2.5, 6.1, 8.33, 0.5, "AURA  •  AgentKit  •  iQOO Hackathon 2026", 14, TEAL, True, PP_ALIGN.CENTER)

    # Save
    out_path = os.path.join(OUT_DIR, "aura_architecture_presentation.pptx")
    prs.save(out_path)
    print(f"Successfully generated: {out_path}")

    # Also save to desktop
    desktop = os.path.join(os.path.expanduser("~"), "Desktop", "aura_architecture_presentation.pptx")
    prs.save(desktop)
    print(f"Also saved to: {desktop}")

if __name__ == "__main__":
    create_presentation()
