# /// script
# dependencies = [
#   "python-pptx",
# ]
# ///
"""
Programmatic PPTX generator for the Aura Student Copilot hackathon presentation.
Designs slide decks with a modern, high-contrast dark theme.
"""

import collections
import collections.abc
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # Set to 16:9 aspect ratio
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)
    
    # Theme Color Palette (Modern Dark Theme)
    BG_COLOR = RGBColor(24, 24, 37)        # Dark Slate (#181825)
    CARD_BG = RGBColor(30, 30, 46)         # Lighter Card Slate (#1e1e2e)
    TEXT_WHITE = RGBColor(205, 214, 244)   # Soft White (#cdd6f4)
    TEXT_MUTED = RGBColor(166, 173, 200)   # Light Gray (#a6adc8)
    ACCENT_TEAL = RGBColor(137, 220, 235)  # Teal/Cyan (#89dceb)
    ACCENT_RED = RGBColor(243, 139, 168)   # Red Light (#f38ba8)
    ACCENT_GREEN = RGBColor(166, 227, 161) # Green Light (#a6e3a1)

    blank_layout = prs.slide_layouts[6] # Blank slide layout

    # Helper: Set solid background color
    def set_background(slide, color):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = color

    # Helper: Add a solid card shape for design interest
    def add_card(slide, left, top, width, height, bg_color):
        shape = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height)
        )
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        shape.line.color.rgb = bg_color # No border line
        return shape

    # Helper: Add stylized header to slides
    def add_slide_header(slide, title_text, category="AURA / AGENTKIT"):
        # Category Tag
        cat_box = slide.shapes.add_textbox(Inches(0.75), Inches(0.4), Inches(10), Inches(0.4))
        cat_tf = cat_box.text_frame
        cat_tf.word_wrap = True
        p_cat = cat_tf.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.name = "Arial"
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ACCENT_TEAL

        # Slide Main Title
        title_box = slide.shapes.add_textbox(Inches(0.75), Inches(0.7), Inches(11.83), Inches(0.8))
        title_tf = title_box.text_frame
        title_tf.word_wrap = True
        title_tf.margin_left = title_tf.margin_top = title_tf.margin_right = title_tf.margin_bottom = 0
        p_title = title_tf.paragraphs[0]
        p_title.text = title_text
        p_title.font.name = "Segoe UI"
        p_title.font.size = Pt(36)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE

    # ----------------------------------------------------
    # SLIDE 1: Title Slide (Minimal, Impactful)
    # ----------------------------------------------------
    slide_1 = prs.slides.add_slide(blank_layout)
    set_background(slide_1, BG_COLOR)
    
    # Left accent block
    add_card(slide_1, 0, 0, 0.4, 7.5, ACCENT_TEAL)
    
    # Large branding title box
    title_box = slide_1.shapes.add_textbox(Inches(1.5), Inches(2.2), Inches(10), Inches(3))
    tf = title_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_hack = tf.paragraphs[0]
    p_hack.text = "IQOO HACKATHON 2026 // AGENTKIT TRACK"
    p_hack.font.name = "Arial"
    p_hack.font.size = Pt(13)
    p_hack.font.bold = True
    p_hack.font.color.rgb = ACCENT_TEAL
    p_hack.space_after = Pt(10)

    p_title = tf.add_paragraph()
    p_title.text = "AURA"
    p_title.font.name = "Segoe UI"
    p_title.font.size = Pt(72)
    p_title.font.bold = True
    p_title.font.color.rgb = TEXT_WHITE
    p_title.space_after = Pt(5)

    p_sub = tf.add_paragraph()
    p_sub.text = "Privacy-First, On-Device Academic Co-Pilot for Students"
    p_sub.font.name = "Segoe UI"
    p_sub.font.size = Pt(22)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(35)

    # Submission Authors
    p_auth = tf.add_paragraph()
    p_auth.text = "Built on the First Hybrid Mobile Architecture"
    p_auth.font.name = "Arial"
    p_auth.font.size = Pt(12)
    p_auth.font.bold = True
    p_auth.font.color.rgb = ACCENT_GREEN

    # ----------------------------------------------------
    # SLIDE 2: The Student Problem Space
    # ----------------------------------------------------
    slide_2 = prs.slides.add_slide(blank_layout)
    set_background(slide_2, BG_COLOR)
    add_slide_header(slide_2, "Academic Cognitive Overload")

    # Column 1 Card: Classroom Offline Reality
    add_card(slide_2, 0.75, 1.8, 3.6, 4.8, CARD_BG)
    box_p1 = slide_2.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(3.1), Inches(4.4))
    tf_p1 = box_p1.text_frame
    tf_p1.word_wrap = True
    p = tf_p1.paragraphs[0]
    p.text = "Classroom Offline Reality"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_RED
    p.space_after = Pt(12)
    
    p2 = tf_p1.add_paragraph()
    p2.text = "Many university lecture halls suffer from weak cellular reception and congested local Wi-Fi.\n\nCloud-based AI assistants disconnect completely, rendering them useless during live lectures when notes and summaries are needed most."
    p2.font.size = Pt(14)
    p2.font.color.rgb = TEXT_WHITE

    # Column 2 Card: The Privacy Gap
    add_card(slide_2, 4.85, 1.8, 3.6, 4.8, CARD_BG)
    box_p2 = slide_2.shapes.add_textbox(Inches(5.1), Inches(2.0), Inches(3.1), Inches(4.4))
    tf_p2 = box_p2.text_frame
    tf_p2.word_wrap = True
    p = tf_p2.paragraphs[0]
    p.text = "Academic Privacy Gap"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_RED
    p.space_after = Pt(12)
    
    p2 = tf_p2.add_paragraph()
    p2.text = "Students regularly upload proprietary university syllabi, homework sheets, and class slides to cloud servers.\n\nThis violates course IP restrictions and risks exposing sensitive, private student work to third-party model training."
    p2.font.size = Pt(14)
    p2.font.color.rgb = TEXT_WHITE

    # Column 3 Card: High Subscription Costs
    add_card(slide_2, 8.95, 1.8, 3.6, 4.8, CARD_BG)
    box_p3 = slide_2.shapes.add_textbox(Inches(9.2), Inches(2.0), Inches(3.1), Inches(4.4))
    tf_p3 = box_p3.text_frame
    tf_p3.word_wrap = True
    p = tf_p3.paragraphs[0]
    p.text = "The Cost Barrier"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_RED
    p.space_after = Pt(12)
    
    p2 = tf_p3.add_paragraph()
    p2.text = "Standard subscription fees ($20/month) for premium model APIs are not viable for the vast majority of university students.\n\nFree tier cloud alternatives are heavily rate-limited and lack complex document analysis capabilities."
    p2.font.size = Pt(14)
    p2.font.color.rgb = TEXT_WHITE

    # ----------------------------------------------------
    # SLIDE 3: The Solution - Aura
    # ----------------------------------------------------
    slide_3 = prs.slides.add_slide(blank_layout)
    set_background(slide_3, BG_COLOR)
    add_slide_header(slide_3, "Aura: On-Device Academic Agent")

    # Column 1 Card: On-Device Speech & LLM
    add_card(slide_3, 0.75, 1.8, 3.6, 4.8, CARD_BG)
    box_s1 = slide_3.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(3.1), Inches(4.4))
    tf_s1 = box_s1.text_frame
    tf_s1.word_wrap = True
    p = tf_s1.paragraphs[0]
    p.text = "On-Device Intelligence"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_TEAL
    p.space_after = Pt(12)
    
    p2 = tf_s1.add_paragraph()
    p2.text = "Runs a fully localized speech-to-text model alongside a highly-quantized local LLM (Gemini Nano / Llama 3.2 3B via MediaPipe).\n\nEnables instant real-time transcription, formatting, and offline query resolution right inside the classroom."
    p2.font.size = Pt(14)
    p2.font.color.rgb = TEXT_WHITE

    # Column 2 Card: Context-Aware Smart Engine
    add_card(slide_3, 4.85, 1.8, 3.6, 4.8, CARD_BG)
    box_s2 = slide_3.shapes.add_textbox(Inches(5.1), Inches(2.0), Inches(3.1), Inches(4.4))
    tf_s2 = box_s2.text_frame
    tf_s2.word_wrap = True
    p = tf_s2.paragraphs[0]
    p.text = "Context Scheduling"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_TEAL
    p.space_after = Pt(12)
    
    p2 = tf_s2.add_paragraph()
    p2.text = "Monitors device activities, location data, and lecture calendar contexts. \n\nAutomatically schedules personalized study triggers and curates micro-learning reviews based on immediate upcoming test deadlines and free calendar slots."
    p2.font.size = Pt(14)
    p2.font.color.rgb = TEXT_WHITE

    # Column 3 Card: 100% Privacy & Zero Cost
    add_card(slide_3, 8.95, 1.8, 3.6, 4.8, CARD_BG)
    box_s3 = slide_3.shapes.add_textbox(Inches(9.2), Inches(2.0), Inches(3.1), Inches(4.4))
    tf_s3 = box_s3.text_frame
    tf_s3.word_wrap = True
    p = tf_s3.paragraphs[0]
    p.text = "Privacy & Feasibility"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_TEAL
    p.space_after = Pt(12)
    
    p2 = tf_s3.add_paragraph()
    p2.text = "Academic notes and local file uploads are never sent to external servers, protecting university property.\n\nRuns entirely on the user's existing hardware, completely eliminating the need for recurring subscription or API usage fees."
    p2.font.size = Pt(14)
    p2.font.color.rgb = TEXT_WHITE

    # ----------------------------------------------------
    # SLIDE 4: The "First Hybrid Model" Workflow
    # ----------------------------------------------------
    slide_4 = prs.slides.add_slide(blank_layout)
    set_background(slide_4, BG_COLOR)
    add_slide_header(slide_4, "First Hybrid Model Execution Model")

    # Left Column (Red Light Window)
    add_card(slide_4, 0.75, 1.8, 5.6, 4.8, CARD_BG)
    # Red Top Indicator Bar
    add_card(slide_4, 0.75, 1.8, 5.6, 0.15, ACCENT_RED)
    
    box_h1 = slide_4.shapes.add_textbox(Inches(1.0), Inches(2.1), Inches(5.1), Inches(4.2))
    tf_h1 = box_h1.text_frame
    tf_h1.word_wrap = True
    p = tf_h1.paragraphs[0]
    p.text = "🔴 RED LIGHT: Phone-Only Mode (60%)"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_RED
    p.space_after = Pt(15)
    
    bullets_red = [
        "Primary Interface: The iQOO flagship phone is the only active system.",
        "Low-Power Sensing: Real-time microphone audio capture during lectures.",
        "On-Device Models: Runs speech-to-text and lightweight local LLM execution entirely offline.",
        "Context Awareness: Tracks device location, calendar deadlines, and manages localized user databases."
    ]
    for b in bullets_red:
        p_b = tf_h1.add_paragraph()
        p_b.text = "• " + b
        p_b.font.size = Pt(14)
        p_b.font.color.rgb = TEXT_WHITE
        p_b.space_after = Pt(10)

    # Right Column (Green Light Window)
    add_card(slide_4, 6.98, 1.8, 5.6, 4.8, CARD_BG)
    # Green Top Indicator Bar
    add_card(slide_4, 6.98, 1.8, 5.6, 0.15, ACCENT_GREEN)
    
    box_h2 = slide_4.shapes.add_textbox(Inches(7.23), Inches(2.1), Inches(5.1), Inches(4.2))
    tf_h2 = box_h2.text_frame
    tf_h2.word_wrap = True
    p = tf_h2.paragraphs[0]
    p.text = "🟢 GREEN LIGHT: Dual-Device Bridge (40%)"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN
    p.space_after = Pt(15)
    
    bullets_green = [
        "Bridged Compute: Phone connects to the laptop via iQOO Office Kit.",
        "PC Muscle Action: The laptop handles heavy background tasks: parsing 1000+ page textbook PDFs and creating vector indexes.",
        "Sync Database: Vector search embeddings are summarized and pushed back to the phone's local database.",
        "Continuous Execution: Allows seamless, dual-screen workflow debug and system integration."
    ]
    for b in bullets_green:
        p_b = tf_h2.add_paragraph()
        p_b.text = "• " + b
        p_b.font.size = Pt(14)
        p_b.font.color.rgb = TEXT_WHITE
        p_b.space_after = Pt(10)

    # ----------------------------------------------------
    # SLIDE 5: Technical Stack
    # ----------------------------------------------------
    slide_5 = prs.slides.add_slide(blank_layout)
    set_background(slide_5, BG_COLOR)
    add_slide_header(slide_5, "System Architecture & Tech Stack")

    # Layout: Three Horizontal Rows
    tech_sections = [
        ("Mobile Client (iQOO OS Overlay)", "Kotlin (Android Native) / Flutter, SQLite Room DB (Notes/Deadlines), Android System Broadcast Receivers (Context Tracking)", ACCENT_TEAL),
        ("On-Device Intelligence Core", "Android AICore (Gemini Nano) for text formatting, MediaPipe LLM Inference API running Llama 3.2-3B for contextual Q&A, Custom PocketSphinx for offline STT", ACCENT_GREEN),
        ("Bridge & PC Muscle Component", "iQOO Office Kit for local TCP socket communication, Python FastAPI for local PC server, FAISS / ChromaDB for heavy PDF chunk embeddings", ACCENT_TEAL)
    ]
    
    top_pos = 1.9
    for section_title, tech_desc, accent_color in tech_sections:
        add_card(slide_5, 0.75, top_pos, 11.83, 1.4, CARD_BG)
        # Left colored vertical indicator strip
        add_card(slide_5, 0.75, top_pos, 0.15, 1.4, accent_color)
        
        box_t = slide_5.shapes.add_textbox(Inches(1.1), Inches(top_pos + 0.1), Inches(11.2), Inches(1.2))
        tf_t = box_t.text_frame
        tf_t.word_wrap = True
        
        p = tf_t.paragraphs[0]
        p.text = section_title
        p.font.size = Pt(18)
        p.font.bold = True
        p.font.color.rgb = accent_color
        p.space_after = Pt(4)
        
        p2 = tf_t.add_paragraph()
        p2.text = tech_desc
        p2.font.size = Pt(13)
        p2.font.color.rgb = TEXT_WHITE
        
        top_pos += 1.6

    # ----------------------------------------------------
    # SLIDE 6: Summary & Impact
    # ----------------------------------------------------
    slide_6 = prs.slides.add_slide(blank_layout)
    set_background(slide_6, BG_COLOR)
    add_slide_header(slide_6, "Aura: Next-Gen Student Workspace", "Summary & Vision")

    # Center card layout
    add_card(slide_6, 0.75, 1.8, 11.83, 4.8, CARD_BG)
    
    box_sum = slide_6.shapes.add_textbox(Inches(1.2), Inches(2.1), Inches(10.93), Inches(4.2))
    tf_sum = box_sum.text_frame
    tf_sum.word_wrap = True
    
    p = tf_sum.paragraphs[0]
    p.text = "Key Takeaways"
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = ACCENT_TEAL
    p.space_after = Pt(20)
    
    takeaways = [
        ("Offline Independence", "Aura performs critical core operations (speech transcription, LLM reasoning) completely without internet connectivity."),
        ("Zero Server Run Costs", "Uses existing consumer hardware (phone CPU/NPU + bridged laptop), meaning no API subscriptions are required for the student or developer."),
        ("Seamless UX Bridging", "Utilizes the iQOO Office Kit. The transition from phone-only (Red Light) to phone-PC bridge (Green Light) feels like a single unified brain."),
        ("Security First", "Your study guides, lecture recordings, homework answers, and personal schedules are strictly locked inside your local system.")
    ]
    
    for title, desc in takeaways:
        p_t = tf_sum.add_paragraph()
        p_t.text = "• " + title + "  —  "
        p_t.font.size = Pt(15)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_WHITE
        
        # Add normal text to the same paragraph
        run = p_t.add_run()
        run.text = desc
        run.font.size = Pt(14)
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED
        
        p_t.space_after = Pt(12)

    prs.save("C:/Users/Krish Kumar/.gemini/antigravity/scratch/aura-student-copilot/docs/aura_architecture_presentation.pptx")
    print("Successfully generated: C:/Users/Krish Kumar/.gemini/antigravity/scratch/aura-student-copilot/docs/aura_architecture_presentation.pptx")

if __name__ == "__main__":
    create_presentation()
