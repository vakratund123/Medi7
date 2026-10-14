"""
Presentation & PDF Generator for MEDI7 by AI7.
Generates an executive-grade HTML deck and prints it to a widescreen 16:9 PDF.
Zero mentions of Sai Hospital. 100% AI7 product branding.
"""
import os
import sys
import subprocess

# Sleek vector AI7 logo SVG data URI
AI7_LOGO_SVG = """data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233b82f6"/><stop offset="50%" stop-color="%2306b6d4"/><stop offset="100%" stop-color="%238b5cf6"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g)"/><path d="M50 20 L78 36 L78 68 L50 84 L22 68 L22 36 Z" fill="none" stroke="%23ffffff" stroke-width="3" stroke-opacity="0.3"/><text x="50" y="62" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="900" font-size="34" fill="%23ffffff" text-anchor="middle" letter-spacing="-1">AI7</text><circle cx="76" cy="26" r="5" fill="%2310b981"/></svg>"""

html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>MEDI7 by AI7 — The Conversational Hospital OS | Executive Presentation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
/* CSS RESET & VARIABLES */
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
:root {{
  --bg-dark: #070a12;
  --bg-card: rgba(15, 23, 42, 0.78);
  --bg-card-hover: rgba(30, 41, 59, 0.88);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-glow: rgba(59, 130, 246, 0.35);
  --primary: #3b82f6;
  --primary-glow: rgba(59, 130, 246, 0.5);
  --cyan: #06b6d4;
  --teal: #10b981;
  --purple: #8b5cf6;
  --amber: #f59e0b;
  --rose: #f43f5e;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --font-main: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-lg: 20px;
  --radius-md: 14px;
  --radius-sm: 8px;
}}

body {{
  font-family: var(--font-main);
  background-color: var(--bg-dark);
  color: var(--text-main);
  overflow: hidden;
  height: 100vh;
  width: 100vw;
  user-select: none;
  background-image: 
    radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.14) 0%, transparent 40%),
    radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.14) 0%, transparent 45%),
    radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.06) 0%, transparent 60%);
}}

/* APP CONTAINER */
.presentation-app {{
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  position: relative;
}}

/* TOP NAVIGATION BAR */
.nav-bar {{
  height: 64px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(7, 10, 18, 0.88);
  backdrop-filter: blur(16px);
  z-index: 50;
}}

.brand-section {{
  display: flex;
  align-items: center;
  gap: 14px;
}}

.brand-logo-badge {{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
}}

.logo-img {{
  height: 28px;
  width: 28px;
  border-radius: 8px;
  object-fit: cover;
}}

.brand-title {{
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}}

.brand-by {{
  font-size: 11px;
  font-weight: 700;
  color: #22d3ee;
  background: rgba(6, 182, 212, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(6, 182, 212, 0.3);
  margin-left: 2px;
}}

/* TRACK SELECTOR PILLS */
.track-selector {{
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}}

.track-btn {{
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}}

.track-btn.active {{
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.4);
}}

.track-btn:hover:not(.active) {{
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}}

/* NAV CONTROLS */
.nav-actions {{
  display: flex;
  align-items: center;
  gap: 10px;
}}

.action-btn {{
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}}

.action-btn:hover {{
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}}

.action-btn.active {{
  background: rgba(59, 130, 246, 0.2);
  border-color: var(--primary);
  color: #60a5fa;
}}

.slide-counter {{
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 0 8px;
}}

.slide-counter span {{
  color: var(--text-main);
}}

.timer-chip {{
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 5px;
}}

.timer-dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal);
  animation: pulse-dot 2s infinite;
}}

@keyframes pulse-dot {{
  0%, 100% {{ opacity: 1; transform: scale(1); }}
  50% {{ opacity: 0.4; transform: scale(0.85); }}
}}

/* SLIDE STAGE / VIEWPORT */
.stage-container {{
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 36px 36px;
}}

.slide {{
  display: none;
  width: 100%;
  max-width: 1380px;
  height: 100%;
  max-height: 820px;
  background: var(--bg-card);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 38px 48px;
  position: relative;
  overflow-y: auto;
  box-shadow: 0 24px 72px -12px rgba(0, 0, 0, 0.65);
  animation: slideFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}}

.slide.active {{
  display: flex;
  flex-direction: column;
}}

@keyframes slideFadeIn {{
  from {{
    opacity: 0;
    transform: translateY(12px) scale(0.985);
  }}
  to {{
    opacity: 1;
    transform: translateY(0) scale(1);
  }}
}}

/* SLIDE HEADER & BADGES */
.slide-header {{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-shrink: 0;
}}

.slide-title-wrap {{
  display: flex;
  flex-direction: column;
  gap: 6px;
}}

.slide-pill-row {{
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}}

.pill {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}}

.pill-cyan {{ background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }}
.pill-purple {{ background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); }}
.pill-teal {{ background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }}
.pill-amber {{ background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }}
.pill-rose {{ background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }}
.pill-new {{ background: linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(139, 92, 246, 0.25)); color: #f472b6; border: 1px solid rgba(244, 114, 182, 0.4); animation: pulse-new 2.5s infinite; }}

@keyframes pulse-new {{
  0%, 100% {{ box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4); }}
  50% {{ box-shadow: 0 0 12px 3px rgba(236, 72, 153, 0.25); }}
}}

.slide-title {{
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: #fff;
  line-height: 1.15;
}}

.slide-subtitle {{
  font-size: 15px;
  color: var(--text-muted);
  font-weight: 400;
  max-width: 900px;
  line-height: 1.45;
}}

.slide-body {{
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}}

/* PROGRESS BAR */
.progress-bar-wrap {{
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
}}

.progress-bar-fill {{
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
}}

/* BOTTOM NAVIGATION FLOATER */
.bottom-controls {{
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  padding: 6px 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  z-index: 40;
}}

.nav-arrow-btn {{
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-subtle);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}}

.nav-arrow-btn:hover {{
  background: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
}}

.nav-arrow-btn:disabled {{
  opacity: 0.3;
  pointer-events: none;
}}

.nav-dots {{
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
}}

.nav-dot {{
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s;
}}

.nav-dot.active {{
  width: 24px;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
}}

.nav-dot:hover:not(.active) {{
  background: rgba(255, 255, 255, 0.45);
}}

/* GRID & CARDS UTILITIES */
.grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
.grid-3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }}
.grid-4 {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }}
.grid-1-2 {{ display: grid; grid-template-columns: 1fr 2fr; gap: 24px; }}
.grid-2-1 {{ display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }}
.grid-3-2 {{ display: grid; grid-template-columns: 3fr 2fr; gap: 24px; }}

.card {{
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 22px;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
}}

.card:hover {{
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}}

.card-title {{
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}}

.card-title svg {{
  width: 20px;
  height: 20px;
  stroke: var(--primary);
  flex-shrink: 0;
}}

.card-desc {{
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
}}

/* STAT CHIPS */
.stat-box {{
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}}

.stat-val {{
  font-size: 32px;
  font-weight: 800;
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 30%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
}}

.stat-val.primary {{
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}}

.stat-val.teal {{
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}}

.stat-val.rose {{
  background: linear-gradient(135deg, #fb7185 0%, #f43f5e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}}

.stat-val.purple {{
  background: linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}}

.stat-lbl {{
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}}

.stat-sub {{
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}}

/* LIST ITEMS */
.bullet-list {{
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
}}

.bullet-item {{
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}}

.bullet-icon {{
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}}

.bullet-icon.teal {{ background: rgba(16, 185, 129, 0.15); color: #34d399; }}
.bullet-icon.rose {{ background: rgba(244, 63, 94, 0.15); color: #fb7185; }}
.bullet-icon.blue {{ background: rgba(59, 130, 246, 0.15); color: #60a5fa; }}

/* SLIDE 1: HERO COVER */
.hero-wrapper {{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 100%;
  padding: 20px;
  position: relative;
}}

.hero-glow-sphere {{
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, rgba(139, 92, 246, 0.12) 50%, transparent 70%);
  filter: blur(50px);
  z-index: 0;
  pointer-events: none;
}}

.hero-content {{
  position: relative;
  z-index: 1;
  max-width: 980px;
  display: flex;
  flex-direction: column;
  align-items: center;
}}

.hero-hospital-badge {{
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  margin-bottom: 24px;
}}

.hero-logo-box {{
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}}

.hero-h-name {{
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
}}

.hero-main-title {{
  font-size: 52px;
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 1.08;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #ffffff 30%, #93c5fd 70%, #c4b5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}}

.hero-sub {{
  font-size: 20px;
  font-weight: 400;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 34px;
  max-width: 840px;
}}

.hero-sub strong {{
  color: #fff;
}}

.hero-pillars-row {{
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 38px;
  flex-wrap: wrap;
}}

.pillar-chip {{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  backdrop-filter: blur(8px);
}}

.pillar-chip svg {{
  width: 16px;
  height: 16px;
  color: var(--primary);
}}

.hero-meta-row {{
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 12px;
  color: var(--text-dim);
  border-top: 1px solid var(--border-subtle);
  padding-top: 20px;
}}

/* SLIDE 4 & 5: AI REPORT ANALYZER */
.ai-interactive-panel {{
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 22px;
  height: 100%;
  min-height: 0;
}}

.pdf-preview-pane {{
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.4);
}}

.pdf-header-bar {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 14px;
}}

.pdf-file-info {{
  display: flex;
  align-items: center;
  gap: 10px;
}}

.pdf-icon-badge {{
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(244, 63, 94, 0.2);
  color: #fb7185;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 11px;
}}

.pdf-file-name {{
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}}

.pdf-file-meta {{
  font-size: 11px;
  color: var(--text-dim);
}}

.pdf-sheet {{
  background: #ffffff;
  color: #1e293b;
  border-radius: 8px;
  padding: 16px;
  font-size: 11px;
  flex: 1;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  font-family: 'Inter', sans-serif;
}}

.pdf-letterhead {{
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
  margin-bottom: 10px;
}}

.pdf-lab-name {{
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}}

.pdf-patient-strip {{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 10px;
}}

.pdf-patient-strip strong {{
  color: #334155;
}}

.pdf-table {{
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}}

.pdf-table th {{
  text-align: left;
  padding: 6px 8px;
  background: #f1f5f9;
  font-weight: 700;
  color: #475569;
  font-size: 10px;
  text-transform: uppercase;
}}

.pdf-table td {{
  padding: 6px 8px;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
}}

.pdf-table tr.highlight-danger td {{
  background: #fee2e2;
  color: #991b1b;
  font-weight: 700;
}}

.pdf-table tr.highlight-warn td {{
  background: #fef3c7;
  color: #92400e;
  font-weight: 700;
}}

/* AI COPILOT ANALYSIS PANE */
.ai-copilot-pane {{
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid var(--border-glow);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 0 24px rgba(59, 130, 246, 0.08);
}}

.ai-engine-badge {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: var(--radius-sm);
}}

.ai-brand-tag {{
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #c084fc;
}}

.ai-status-pulse {{
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #34d399;
  font-weight: 600;
}}

/* CLINICAL PARAMETERS CHIPS */
.flags-grid {{
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}}

.flag-chip {{
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}}

.flag-chip.critical {{
  border-color: rgba(244, 63, 94, 0.4);
  background: rgba(244, 63, 94, 0.08);
}}

.flag-chip.warning {{
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.08);
}}

.flag-name {{
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}}

.flag-val {{
  font-size: 12px;
  font-weight: 800;
  font-family: var(--font-mono);
}}

.flag-val.critical {{ color: #fb7185; }}
.flag-val.warning {{ color: #fbbf24; }}

/* SUGGESTION BOX */
.suggestion-box {{
  background: rgba(30, 41, 59, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px;
}}

.sug-header {{
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}}

.sug-header.danger {{ color: #fb7185; }}
.sug-header.purple {{ color: #c084fc; }}

.sug-text {{
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
}}

.sug-recommendations {{
  margin-top: 10px;
  padding-left: 18px;
  font-size: 12px;
  color: #e2e8f0;
  line-height: 1.6;
}}

/* DOCTOR ACTION BUTTON */
.btn-apply-rx {{
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  border: none;
  color: #fff;
  padding: 11px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
}}

.btn-apply-rx:hover {{
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
}}

.btn-apply-rx:active {{
  transform: translateY(1px);
}}

/* INTERACTIVE CASE TABS */
.case-tabs {{
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}}

.case-tab-btn {{
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}}

.case-tab-btn.active {{
  background: rgba(59, 130, 246, 0.15);
  border-color: var(--primary);
  color: #fff;
}}

/* SLIDE 10: ROI CALCULATOR */
.calc-container {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  height: 100%;
}}

.slider-group {{
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}}

.slider-label-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
}}

.slider-title {{
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}}

.slider-val {{
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 800;
  color: var(--primary);
}}

input[type=range] {{
  width: 100%;
  accent-color: var(--primary);
  height: 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
}}

/* COMPARISON TABLE */
.comp-table {{
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}}

.comp-table th {{
  text-align: left;
  padding: 12px 14px;
  font-weight: 700;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
}}

.comp-table th.medi7-col {{
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.08);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}}

.comp-table td {{
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
}}

.comp-table td.medi7-col {{
  color: #fff;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.05);
}}

/* SPEAKER NOTES DRAWER */
.notes-drawer {{
  position: fixed;
  top: 64px;
  right: -420px;
  width: 400px;
  height: calc(100vh - 64px);
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-left: 1px solid var(--border-subtle);
  padding: 24px;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 60;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}}

.notes-drawer.open {{
  right: 0;
}}

.notes-header {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 14px;
}}

.notes-title {{
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}}

.close-btn {{
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 18px;
}}

.note-section-title {{
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}}

.note-box {{
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #cbd5e1;
}}

/* SLIDE GRID OVERVIEW MODAL */
.overview-modal {{
  position: fixed;
  inset: 0;
  background: rgba(7, 10, 18, 0.92);
  backdrop-filter: blur(16px);
  z-index: 100;
  display: none;
  flex-direction: column;
  padding: 30px 48px;
  overflow-y: auto;
}}

.overview-modal.open {{
  display: flex;
}}

.overview-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 24px;
}}

.overview-card {{
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}}

.overview-card:hover {{
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}}

.overview-card.active {{
  border-color: var(--cyan);
  background: rgba(6, 182, 212, 0.15);
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.3);
}}

/* TOAST ALERT */
.toast-notice {{
  position: fixed;
  bottom: 80px;
  right: 28px;
  background: #1e293b;
  border: 1px solid var(--teal);
  color: #fff;
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  display: none;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  z-index: 150;
  animation: slideToast 0.3s ease forwards;
}}

@keyframes slideToast {{
  from {{ opacity: 0; transform: translateY(16px); }}
  to {{ opacity: 1; transform: translateY(0); }}
}}

/* ULTRA-CRISP 16:9 WIDESCREEN PRINT & PDF STYLES */
@media print {{
  @page {{
    size: 16in 9in;
    margin: 0;
  }}
  *, *::before, *::after {{
    box-sizing: border-box !important;
    animation: none !important;
    transition: none !important;
  }}
  html, body {{
    width: 16in !important;
    height: auto !important;
    min-height: 100% !important;
    background: #070a12 !important;
    color: #f8fafc !important;
    overflow: visible !important;
    position: static !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}
  .presentation-app {{
    display: block !important;
    width: 16in !important;
    height: auto !important;
    overflow: visible !important;
    position: static !important;
  }}
  .nav-bar, .bottom-controls, .notes-drawer, .overview-modal, .progress-bar-wrap, .toast-notice {{
    display: none !important;
  }}
  .stage-container {{
    display: block !important;
    width: 16in !important;
    height: auto !important;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    position: static !important;
  }}
  .slide {{
    display: flex !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    flex-direction: column !important;
    justify-content: flex-start !important;
    width: 16in !important;
    height: 8.98in !important;
    min-height: 8.98in !important;
    max-height: 8.98in !important;
    page-break-after: always !important;
    break-after: page !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0.55in 0.8in !important;
    box-sizing: border-box !important;
    background: #070a12 !important;
    position: relative !important;
    overflow: hidden !important;
  }}
  .slide:last-of-type {{
    page-break-after: avoid !important;
    break-after: avoid !important;
  }}
  .slide-title {{
    font-size: 34px !important;
  }}
  .slide-subtitle {{
    font-size: 16px !important;
  }}
  .stat-val {{
    font-size: 36px !important;
  }}
}}
</style>
</head>
<body>

<div class="presentation-app" id="app">
  <!-- TOP NAVIGATION -->
  <header class="nav-bar">
    <div class="brand-section">
      <div class="brand-logo-badge">
        <img src="{AI7_LOGO_SVG}" alt="AI7 Logo" class="logo-img" />
        <span class="brand-title">MEDI7</span>
        <span class="brand-by">by AI7</span>
      </div>
    </div>

    <!-- TRACK SELECTOR -->
    <div class="track-selector">
      <button class="track-btn active" onclick="setTrack('all', this)">
        <span>🌐</span> All Slides (<span id="count-all">14</span>)
      </button>
      <button class="track-btn" onclick="setTrack('doctor', this)">
        <span>🩺</span> Doctor Focus (<span id="count-doc">8</span>)
      </button>
      <button class="track-btn" onclick="setTrack('investor', this)">
        <span>💼</span> Investor Pitch (<span id="count-inv">8</span>)
      </button>
    </div>

    <!-- ACTIONS -->
    <div class="nav-actions">
      <div class="timer-chip">
        <div class="timer-dot"></div>
        <span id="elapsed-time">00:00</span>
      </div>
      <div class="slide-counter">
        <span id="current-slide-num">01</span> / <span id="total-slide-num">14</span>
      </div>
      <button class="action-btn" onclick="toggleOverview()" title="Slide Overview [O]">
        <span>⊞</span> Grid
      </button>
      <button class="action-btn" id="notes-btn" onclick="toggleNotes()" title="Speaker Notes [S]">
        <span>📝</span> Notes
      </button>
      <button class="action-btn" onclick="toggleFullScreen()" title="Fullscreen [F]">
        <span>⛶</span> Full
      </button>
      <button class="action-btn" onclick="window.print()" title="Print / PDF [P]">
        <span>🖨️</span> Print PDF
      </button>
    </div>
  </header>

  <!-- STAGE VIEWPORT -->
  <main class="stage-container" id="stage">

    <!-- SLIDE 1: HERO COVER -->
    <section class="slide active" data-index="0" data-tracks="all,doctor,investor" data-title="Title & Executive Vision">
      <div class="hero-wrapper">
        <div class="hero-glow-sphere"></div>
        <div class="hero-content">
          <div class="hero-hospital-badge">
            <span class="pill pill-cyan">AI7 Health Systems</span>
            <span class="hero-h-name">The Next-Gen Healthcare Operating Platform</span>
          </div>

          <h1 class="hero-main-title">
            MEDI7 : The Conversational Hospital Operating System
          </h1>

          <p class="hero-sub">
            Built by <strong>AI7</strong> • The world’s first <strong>100% paperless</strong>, <strong>WhatsApp-native</strong> hospital OS with an integrated <strong>Multimodal AI Clinical Copilot</strong> for modern multispecialty hospitals.
          </p>

          <div class="hero-pillars-row">
            <div class="pillar-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span>Zero Paper from Token to Discharge</span>
            </div>
            <div class="pillar-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>WhatsApp-First (No Patient App)</span>
            </div>
            <div class="pillar-chip" style="border-color: rgba(236,72,153,0.4); background: rgba(236,72,153,0.1);">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style="color:#f472b6;">NEW: Multimodal AI PDF Report Reader</span>
            </div>
            <div class="pillar-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>Marathi • Kannada • Hindi • English</span>
            </div>
          </div>

          <div class="hero-meta-row">
            <span>Prepared by: <strong>AI7 Executive Leadership Team</strong></span>
            <span>•</span>
            <span>Architecture: <strong>FastAPI + PostgreSQL + Gemini 2.0 + WhatsApp</strong></span>
            <span>•</span>
            <span>Compliance: <strong>DPDP Act 2023 & ABDM Ready</strong></span>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 2: THE PROBLEM -->
    <section class="slide" data-index="1" data-tracks="all,doctor,investor" data-title="The Healthcare Crisis">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-rose">The Reality in Tier-2/3 India</span>
            <span class="pill pill-amber">70,000+ Hospitals at Risk</span>
          </div>
          <h2 class="slide-title">The Paperwork Paralysis & Clinical Blind Spots</h2>
          <p class="slide-subtitle">
            Hospitals in emerging markets are drowning in manual clipboards, lost laboratory slips, and frantic 3-minute consultations.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-2" style="margin-bottom: 20px;">
          <!-- DOCTOR PAIN -->
          <div class="card" style="border-left: 4px solid #f43f5e;">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span>For Doctors: Chronic Charting Overload</span>
            </div>
            <ul class="bullet-list">
              <li class="bullet-item">
                <div class="bullet-icon rose">✕</div>
                <span><strong>30% of OPD consultation time</strong> wasted deciphering messy handwriting and organizing crinkled external lab sheets.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon rose">✕</div>
                <span><strong>No longitudinal history:</strong> Patients forget previous visits, prescriptions, and baseline creatinine or HbA1c values.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon rose">✕</div>
                <span><strong>High Diagnostic Hazard:</strong> Subtle out-of-range biomarkers buried in 4-page diagnostic PDFs get overlooked during 3-minute rushes.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon rose">✕</div>
                <span><strong>Medicolegal Exposure:</strong> Paper files get misplaced, leaving doctors vulnerable without verifiable audit logs.</span>
              </li>
            </ul>
          </div>

          <!-- HOSPITAL OWNER PAIN -->
          <div class="card" style="border-left: 4px solid #f59e0b;">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>For Hospital Owners & Investors: Severe Revenue Leaks</span>
            </div>
            <ul class="bullet-list">
              <li class="bullet-item">
                <div class="bullet-icon rose">✕</div>
                <span><strong>Crippling Stationery Overhead:</strong> Average 50-bed hospital burns <strong>₹60,000 - ₹1,20,000 / month</strong> on letterheads, thermal rolls, and toner.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon rose">✕</div>
                <span><strong>78% Follow-Up Drop-Off:</strong> Patients lose paper follow-up slips; hospital loses recurring outpatient revenue.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon rose">✕</div>
                <span><strong>Pharmacy & Lab Leakage:</strong> Unconnected systems lead to unbilled tests, unaccounted drug dispense, and inventory theft.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon rose">✕</div>
                <span><strong>Failed Patient Apps:</strong> 92% of patients refuse to download or register on hospital-specific mobile apps.</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- KEY METRICS ROW -->
        <div class="grid-4">
          <div class="stat-box">
            <span class="stat-val rose">4.2 hrs</span>
            <span class="stat-lbl">Doctor Paperwork / Day</span>
            <span class="stat-sub">Lost clinical consultation time</span>
          </div>
          <div class="stat-box">
            <span class="stat-val rose">&lt; 22%</span>
            <span class="stat-lbl">Follow-up Compliance</span>
            <span class="stat-sub">Due to lost paper prescriptions</span>
          </div>
          <div class="stat-box">
            <span class="stat-val rose">45 min</span>
            <span class="stat-lbl">Average OPD Waiting Time</span>
            <span class="stat-sub">Registration & chart filing delay</span>
          </div>
          <div class="stat-box">
            <span class="stat-val rose">₹1.1L</span>
            <span class="stat-lbl">Monthly Paper Stationery Waste</span>
            <span class="stat-sub">Per 50-bed secondary hospital</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 3: MEDI7 SOLUTION -->
    <section class="slide" data-index="2" data-tracks="all,doctor,investor" data-title="The MEDI7 Solution">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-teal">The Solution</span>
            <span class="pill pill-cyan">Full-Stack Digital Spine by AI7</span>
          </div>
          <h2 class="slide-title">MEDI7: Zero Paper, Real-Time AI, 100% Connected</h2>
          <p class="slide-subtitle">
            An end-to-end hospital operating system replacing paper clipboards with synchronized conversational workflows.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <!-- ARCHITECTURE FLOW -->
        <div class="card" style="margin-bottom: 20px; background: rgba(15, 23, 42, 0.6);">
          <div class="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span>Seamless Synchronized Patient Journey</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; overflow-x: auto; padding: 10px 0;">
            <div style="text-align: center; flex: 1; min-width: 130px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; color: #60a5fa; font-weight: 800;">1</div>
              <div style="font-size: 13px; font-weight: 700; color: #fff;">Reception</div>
              <div style="font-size: 11px; color: var(--text-dim);">30-sec Registration & WhatsApp Welcome</div>
            </div>
            <div style="color: var(--text-dim); font-size: 18px;">➔</div>
            <div style="text-align: center; flex: 1; min-width: 130px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139, 92, 246, 0.15); border: 1px solid var(--purple); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; color: #c084fc; font-weight: 800;">2</div>
              <div style="font-size: 13px; font-weight: 700; color: #fff;">Doctor OPD</div>
              <div style="font-size: 11px; color: var(--text-dim);">AI 3-Line Briefing + Voice/Click Rx</div>
            </div>
            <div style="color: var(--text-dim); font-size: 18px;">➔</div>
            <div style="text-align: center; flex: 1; min-width: 130px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(236, 72, 153, 0.15); border: 1px solid #f472b6; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; color: #f472b6; font-weight: 800;">3</div>
              <div style="font-size: 13px; font-weight: 700; color: #fff;">Diagnostics / Lab</div>
              <div style="font-size: 11px; color: #f472b6; font-weight: 600;">AI PDF Reader & Abnormals Flagging</div>
            </div>
            <div style="color: var(--text-dim); font-size: 18px;">➔</div>
            <div style="text-align: center; flex: 1; min-width: 130px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid var(--teal); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; color: #34d399; font-weight: 800;">4</div>
              <div style="font-size: 13px; font-weight: 700; color: #fff;">Pharmacy</div>
              <div style="font-size: 11px; color: var(--text-dim);">Direct Rx Dispensing & Auto-Inventory</div>
            </div>
            <div style="color: var(--text-dim); font-size: 18px;">➔</div>
            <div style="text-align: center; flex: 1; min-width: 130px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(6, 182, 212, 0.15); border: 1px solid var(--cyan); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; color: #22d3ee; font-weight: 800;">5</div>
              <div style="font-size: 13px; font-weight: 700; color: #fff;">Patient Loop</div>
              <div style="font-size: 11px; color: var(--text-dim);">WhatsApp Letterhead PDF + UPI Bill</div>
            </div>
          </div>
        </div>

        <div class="grid-3">
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Authentic Legal Prescriptions</span>
            </div>
            <p class="card-desc">
              Generates pixel-perfect digital letterheads identical to official medical stationery, compliant with MCI & NMC guidelines.
            </p>
          </div>

          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>Vernacular WhatsApp Engine</span>
            </div>
            <p class="card-desc">
              Reaches patients where they are. Instant automated notifications in Marathi, Kannada, Hindi, and English. No app downloads needed.
            </p>
          </div>

          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>DPDP Act 2023 Compliant</span>
            </div>
            <p class="card-desc">
              Every staff action, diagnosis entry, and medicine dispense is logged with IP, Staff ID, and cryptographic timestamp in audit trails.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 4: NEW CAPABILITY - AI PDF REPORT ANALYZER -->
    <section class="slide" data-index="3" data-tracks="all,doctor,investor" data-title="NEW: Multimodal AI PDF Reader">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-new">Major New AI7 Innovation</span>
            <span class="pill pill-purple">Multimodal Clinical Intelligence</span>
          </div>
          <h2 class="slide-title">AI PDF Report Analyzer & Doctor Copilot</h2>
          <p class="slide-subtitle">
            Harnessing Google Gemini 2.0 Vision to digest any external lab, radiology, or discharge summary PDF — flagging anomalies and generating clinical suggestions in seconds.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-2" style="margin-bottom: 20px;">
          <div class="card" style="border-left: 4px solid #8b5cf6;">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><polyline points="13 17 11 15 15 11"/></svg>
              <span>The Diagnostic Problem Solved</span>
            </div>
            <p class="card-desc" style="margin-bottom: 12px;">
              Patients constantly bring physical papers or WhatsApp PDFs from hundreds of unintegrated third-party diagnostic labs, ultrasound clinics, and prior hospital visits.
            </p>
            <ul class="bullet-list">
              <li class="bullet-item">
                <div class="bullet-icon blue">✓</div>
                <span><strong>No manual re-typing:</strong> System ingests PDF scans, multi-page tables, and handwritten annotations automatically.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon blue">✓</div>
                <span><strong>Universal Compatibility:</strong> Works across Thyrocare, Lal Pathlabs, Metropolis, or local clinic letterheads.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon blue">✓</div>
                <span><strong>Sub-2-Second Processing:</strong> Results ready before the patient sits on the examination stool.</span>
              </li>
            </ul>
          </div>

          <div class="card" style="border-left: 4px solid #06b6d4;">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>How the Multimodal Pipeline Works</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <span class="pill pill-cyan" style="font-size: 10px;">STEP 1</span>
                <span style="font-size: 12px; color: #cbd5e1;"><strong>Multimodal Extraction:</strong> Ingests document pixels + text layers; extracts test names, measured values, units, and age/gender specific reference intervals.</span>
              </div>
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <span class="pill pill-purple" style="font-size: 10px;">STEP 2</span>
                <span style="font-size: 12px; color: #cbd5e1;"><strong>Longitudinal Context Fusion:</strong> Correlates new lab findings with the patient's existing EHR history (e.g. chronic hypertension, active medications, previous creatinine levels).</span>
              </div>
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <span class="pill pill-teal" style="font-size: 10px;">STEP 3</span>
                <span style="font-size: 12px; color: #cbd5e1;"><strong>Clinical Decision Support (CDS):</strong> Generates targeted differential suggestions, drug contraindication alerts, and recommended follow-up tests.</span>
              </div>
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <span class="pill pill-amber" style="font-size: 10px;">STEP 4</span>
                <span style="font-size: 12px; color: #cbd5e1;"><strong>Human-in-the-Loop Integration:</strong> Doctor reviews the suggestion and adds it to the prescription with a single tap. Doctor retains 100% autonomy.</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-3">
          <div class="stat-box">
            <span class="stat-val teal">100%</span>
            <span class="stat-lbl">Doctor Autonomy</span>
            <span class="stat-sub">AI assists, clinician decides</span>
          </div>
          <div class="stat-box">
            <span class="stat-val primary">&lt; 1.8s</span>
            <span class="stat-lbl">PDF Ingestion Speed</span>
            <span class="stat-sub">Powered by Gemini 2.0 Flash</span>
          </div>
          <div class="stat-box">
            <span class="stat-val rose">Zero</span>
            <span class="stat-lbl">Overlooked Abnormalities</span>
            <span class="stat-sub">Automated critical value alerts</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 5: LIVE INTERACTIVE DEMO -->
    <section class="slide" data-index="4" data-tracks="all,doctor,investor" data-title="Live Interactive AI Demo">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-teal">Interactive Simulation</span>
            <span class="pill pill-cyan">Live Clinical Scenarios</span>
          </div>
          <h2 class="slide-title">Interactive AI PDF Report Analyzer in Action</h2>
          <p class="slide-subtitle">
            Switch between real patient test cases below to see how MEDI7 extracts values and formulates expert clinical suggestions for the attending physician.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <!-- CASE SELECTOR TABS -->
        <div class="case-tabs">
          <button class="case-tab-btn active" id="tab-case-1" onclick="loadCase(1)">
            <strong>Case 1: Metabolic & Renal Crisis</strong><br>
            <span style="font-size: 11px; opacity: 0.8;">Ramesh Patil (58M) • Type 2 DM, HTN</span>
          </button>
          <button class="case-tab-btn" id="tab-case-2" onclick="loadCase(2)">
            <strong>Case 2: Cardiac & Lipid Emergency</strong><br>
            <span style="font-size: 11px; opacity: 0.8;">Sunita Kulkarni (52F) • Chest Pain</span>
          </button>
          <button class="case-tab-btn" id="tab-case-3" onclick="loadCase(3)">
            <strong>Case 3: Drug-Induced Liver Injury</strong><br>
            <span style="font-size: 11px; opacity: 0.8;">Mohammed Ansari (46M) • Statin + ATT</span>
          </button>
        </div>

        <div class="ai-interactive-panel">
          <!-- LEFT: SIMULATED PDF -->
          <div class="pdf-preview-pane">
            <div class="pdf-header-bar">
              <div class="pdf-file-info">
                <div class="pdf-icon-badge">PDF</div>
                <div>
                  <div class="pdf-file-name" id="pdf-doc-name">Thyrocare_Comprehensive_Panel.pdf</div>
                  <div class="pdf-file-meta" id="pdf-doc-meta">Uploaded 2 mins ago • 3 Pages • Verified</div>
                </div>
              </div>
              <span class="pill pill-teal" style="font-size: 10px;">OCR Parsed</span>
            </div>

            <div class="pdf-sheet" id="pdf-content-sheet">
              <!-- Content filled dynamically via JS -->
            </div>
          </div>

          <!-- RIGHT: AI COPILOT ANALYSIS -->
          <div class="ai-copilot-pane">
            <div class="ai-engine-badge">
              <div class="ai-brand-tag">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>AI7 Gemini Clinical Copilot</span>
              </div>
              <div class="ai-status-pulse">
                <span class="timer-dot"></span> Real-time CDS Active
              </div>
            </div>

            <!-- EXTRACTED ANOMALIES -->
            <div>
              <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">
                Extracted Biomarkers & Risk Stratification
              </div>
              <div class="flags-grid" id="flags-container">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- CLINICAL INTELLIGENCE & DIFFERENTIALS -->
            <div class="suggestion-box" id="sug-box">
              <!-- Dynamically populated -->
            </div>

            <!-- ACTION BUTTON -->
            <button class="btn-apply-rx" id="apply-btn" onclick="applyToRx()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>1-Click Adopt into Doctor's Prescription</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 6: DOCTOR-CENTRIC VALUE -->
    <section class="slide" data-index="5" data-tracks="all,doctor" data-title="Doctor Clinical Workflow">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-cyan">Clinician Experience</span>
            <span class="pill pill-purple">Burnout Reduction</span>
          </div>
          <h2 class="slide-title">Built for Busy Clinicians: 3-Minute Consultations</h2>
          <p class="slide-subtitle">
            Cuts administrative keyboard fatigue while elevating diagnostic thoroughness and patient trust.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-2" style="margin-bottom: 20px;">
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>3-Line AI Patient History Briefing</span>
            </div>
            <p class="card-desc" style="margin-bottom: 12px;">
              Before opening the physical case sheet, the doctor reads an instant synthesis of the patient's entire medical journey:
            </p>
            <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid var(--primary); padding: 12px 14px; border-radius: 6px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
              "58M with 12-year history of poorly controlled T2D and HTN. Last visit (3 weeks ago) presented with bilateral pedal edema. Serum Creatinine jumped from 1.3 to 2.8 mg/dL; currently on Metformin + Telmisartan."
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              <span>Regional Voice AI Scribe</span>
            </div>
            <p class="card-desc" style="margin-bottom: 12px;">
              Clinicians can speak naturally in mixed languages (e.g. English + Marathi or Kannada). Whisper + Gemini converts dictation directly into structured prescriptions:
            </p>
            <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid var(--purple); padding: 12px 14px; border-radius: 6px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
              Doctor says: <i>"Tab Glycomet stop kara, Pantop D subha khali pet 5 divas, urine routine ani KFT test krava."</i><br>
              <span style="color: #c084fc; font-weight: 600;">➔ Automatically mapped to dosage frequencies, generic alternatives, and lab order requisitions!</span>
            </div>
          </div>
        </div>

        <div class="grid-3">
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
              <span>Rapid Drug Auto-Complete</span>
            </div>
            <p class="card-desc">
              Pre-built hospital formulary with 1-click dosage timing chips (1-0-1, After food, 5 days) eliminates repetitive typing.
            </p>
          </div>

          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Automated Drug Interaction Checks</span>
            </div>
            <p class="card-desc">
              Cross-checks prescribed molecules against patient allergies and active kidney/liver biomarkers to prevent adverse events.
            </p>
          </div>

          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Total Medicolegal Protection</span>
            </div>
            <p class="card-desc">
              Every prescription generated has doctor credentials, registration number, patient UID, and cryptographic audit log protection.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 7: PATIENT WHATSAPP EXPERIENCE -->
    <section class="slide" data-index="6" data-tracks="all,doctor,investor" data-title="Patient WhatsApp Experience">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-teal">Patient Experience</span>
            <span class="pill pill-cyan">No Apps to Download</span>
          </div>
          <h2 class="slide-title">WhatsApp-First: 99.4% Delivery in Native Languages</h2>
          <p class="slide-subtitle">
            Indian patients already trust and use WhatsApp daily. MEDI7 turns WhatsApp into their personal lifelong health locker.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-3" style="margin-bottom: 20px;">
          <!-- CARD 1 -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>Instant Digital Prescription</span>
            </div>
            <p class="card-desc" style="margin-bottom: 12px;">
              As soon as the doctor clicks Save, the prescription PDF is formatted on official hospital letterhead and delivered to the patient’s WhatsApp before they step into the corridor.
            </p>
            <span class="pill pill-teal" style="font-size: 10px; width: fit-content;">Zero lost paper slips</span>
          </div>

          <!-- CARD 2 -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span>Instant Diagnostic Reports</span>
            </div>
            <p class="card-desc" style="margin-bottom: 12px;">
              Patients don’t need to wait in crowded hospital corridors for physical lab reports. When the lab verifies the results, the report PDF arrives automatically on WhatsApp.
            </p>
            <span class="pill pill-cyan" style="font-size: 10px; width: fit-content;">45 min patient wait saved</span>
          </div>

          <!-- CARD 3 -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span>Automated Multilingual Reminders</span>
            </div>
            <p class="card-desc" style="margin-bottom: 12px;">
              24 hours before a scheduled follow-up, the patient receives a friendly reminder in their mother tongue (Marathi, Kannada, Hindi). Patients reply "YES" to confirm.
            </p>
            <span class="pill pill-purple" style="font-size: 10px; width: fit-content;">+64% Follow-up Retention</span>
          </div>
        </div>

        <!-- WHATSAPP MESSAGE SIMULATION BOX -->
        <div class="card" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.25);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #34d399;">
              <span>💬</span> Live WhatsApp Message Samples (4 Languages)
            </div>
            <span style="font-size: 11px; color: var(--text-dim);">Powered by Official Meta Cloud / AI7 WhatsApp Bridge</span>
          </div>
          <div class="grid-4" style="gap: 12px;">
            <div style="background: #0f291e; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px; font-size: 11px; color: #d1fae5; line-height: 1.45;">
              <strong style="color: #34d399;">मराठी (Marathi):</strong><br>
              नमस्कार रमेश जी 🙏<br>MEDI7 डिजिटल हेल्थ प्रणाली मध्ये आपले स्वागत आहे. आपला Patient ID: <b>AI7-2026-00412</b>. सर्व रेकॉर्ड सुरक्षित डिजिटल सेव्ह केले जातील.
            </div>
            <div style="background: #0f291e; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px; font-size: 11px; color: #d1fae5; line-height: 1.45;">
              <strong style="color: #34d399;">ಕನ್ನಡ (Kannada):</strong><br>
              ನಮಸ್ಕಾರ ರಮೇಶ್ ಜಿ 🙏<br>ನಿಮ್ಮ ಲ್ಯಾಬ್ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ 🧪. MEDI7 Health WhatsApp: +919180198107. ಬೇಗ ಗುಣಮುಖರಾಗಿ!
            </div>
            <div style="background: #0f291e; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px; font-size: 11px; color: #d1fae5; line-height: 1.45;">
              <strong style="color: #34d399;">हिंदी (Hindi):</strong><br>
              नमस्कार रमेश जी 🙏<br>आपका पर्चा (Prescription) तैयार है 📋. अगली विजिट: 21-Oct. AI7 हेल्पलाइन: +919180198107.
            </div>
            <div style="background: #0f291e; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px; font-size: 11px; color: #d1fae5; line-height: 1.45;">
              <strong style="color: #34d399;">English:</strong><br>
              Hello Ramesh 🙏<br>Your Bill #BILL-8821 for ₹1,850 is ready. Tap to view & pay via UPI: https://ai7.health/pay/8821
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 8: 6-ROLE HOSPITAL ECOSYSTEM -->
    <section class="slide" data-index="7" data-tracks="all,doctor,investor" data-title="6-Role Hospital Ecosystem">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-purple">Operational Breadth</span>
            <span class="pill pill-cyan">Hospital-Wide Integration</span>
          </div>
          <h2 class="slide-title">The Complete 6-Role Integrated Hospital Ecosystem</h2>
          <p class="slide-subtitle">
            Every department operates on tailored, role-specific interfaces with strict role-based access control.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-3" style="gap: 16px;">
          <!-- 1. Receptionist -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span>1. Receptionist</span>
            </div>
            <p class="card-desc">
              Registers walk-in or emergency patients in under 30 seconds. Issues OPD queue tokens, assigns consulting doctors, and triggers instant WhatsApp welcome cards.
            </p>
          </div>

          <!-- 2. Doctor -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span>2. Consulting Doctor</span>
            </div>
            <p class="card-desc">
              Live OPD queue with waiting times. 3-line AI patient briefing, voice/tap e-prescription, integrated lab and radiology order requisition.
            </p>
          </div>

          <!-- 3. Lab Technician -->
          <div class="card" style="border-color: rgba(236,72,153,0.4);">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="2"><path d="M10 2v7.31"/><path d="M14 9.3V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>
              <span style="color:#f472b6;">3. Lab Technician (AI)</span>
            </div>
            <p class="card-desc">
              Tracks phlebotomy sample collection. Uploads diagnostic PDFs; <strong>Gemini AI automatically parses parameters</strong> and flags abnormals for the doctor.
            </p>
          </div>

          <!-- 4. Radiologist -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>4. Radiologist</span>
            </div>
            <p class="card-desc">
              Receives scan orders (X-Ray, Ultrasound, CT). Attaches imaging studies, records structured radiological impressions, and dispatches to doctors.
            </p>
          </div>

          <!-- 5. Pharmacist -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              <span>5. Pharmacist</span>
            </div>
            <p class="card-desc">
              Direct digital prescription lookup by Patient ID. Eliminates handwriting guesswork. Instant inventory stock decrement with low-stock alerts.
            </p>
          </div>

          <!-- 6. Hospital Owner / Admin -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>6. Hospital Owner / Admin</span>
            </div>
            <p class="card-desc">
              Executive command dashboard showing live patient footfalls, doctor workload distribution, daily revenue, pharmacy margins, and staff audit logs.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 9: TECHNICAL ARCHITECTURE & SECURITY -->
    <section class="slide" data-index="8" data-tracks="all,investor" data-title="Technical Architecture">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-cyan">Enterprise Tech Stack</span>
            <span class="pill pill-teal">Security & Compliance</span>
          </div>
          <h2 class="slide-title">Engineered for High-Concurrency & Zero Data Loss</h2>
          <p class="slide-subtitle">
            A resilient microservices-ready architecture designed for 99.99% hospital uptime on modern open-source foundations.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-2-1" style="margin-bottom: 20px;">
          <!-- STACK ARCHITECTURE -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
              <span>High-Performance Technology Stack</span>
            </div>
            <div class="grid-2" style="gap: 12px; margin-top: 6px;">
              <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                <div style="font-size: 13px; font-weight: 700; color: #60a5fa;">FastAPI (Python 3.11)</div>
                <div style="font-size: 12px; color: var(--text-muted);">Asynchronous, high-throughput REST APIs with automatic OpenAPI/Swagger documentation.</div>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                <div style="font-size: 13px; font-weight: 700; color: #34d399;">PostgreSQL 16 + SQLAlchemy</div>
                <div style="font-size: 12px; color: var(--text-muted);">Strict ACID compliance, indexed medical records, relational integrity across 10 tables.</div>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                <div style="font-size: 13px; font-weight: 700; color: #f472b6;">Google Gemini 2.0 Flash</div>
                <div style="font-size: 12px; color: var(--text-muted);">Multimodal vision for PDF parsing, medical report extraction, and vernacular language generation.</div>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                <div style="font-size: 13px; font-weight: 700; color: #fbbf24;">Redis 7 + Celery Workers</div>
                <div style="font-size: 12px; color: var(--text-muted);">Asynchronous background queue for instant PDF generation and high-volume WhatsApp dispatch.</div>
              </div>
            </div>
          </div>

          <!-- SECURITY CARD -->
          <div class="card" style="border-left: 4px solid #10b981;">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Security & DPDP 2023</span>
            </div>
            <ul class="bullet-list">
              <li class="bullet-item">
                <div class="bullet-icon teal">✓</div>
                <span><strong>Role-Based Access Control (RBAC):</strong> Receptionists cannot see clinical notes; doctors only see their assigned queues.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon teal">✓</div>
                <span><strong>Immutable Audit Trails:</strong> Timestamped IP + Staff ID logged on every mutation.</span>
              </li>
              <li class="bullet-item">
                <div class="bullet-icon teal">✓</div>
                <span><strong>Air-Gapped Option:</strong> Deployable on hospital on-premise local servers for zero cloud dependency.</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="grid-4">
          <div class="stat-box">
            <span class="stat-val primary">&lt; 120ms</span>
            <span class="stat-lbl">API Response Latency</span>
            <span class="stat-sub">High-efficiency async handlers</span>
          </div>
          <div class="stat-box">
            <span class="stat-val teal">100%</span>
            <span class="stat-lbl">Dockerized Deployment</span>
            <span class="stat-sub">Spin up entire hospital in 5 mins</span>
          </div>
          <div class="stat-box">
            <span class="stat-val purple">AES-256</span>
            <span class="stat-lbl">Storage Encryption</span>
            <span class="stat-sub">Patient confidentiality guaranteed</span>
          </div>
          <div class="stat-box">
            <span class="stat-val primary">ABDM</span>
            <span class="stat-lbl">M1/M2/M3 Ready</span>
            <span class="stat-sub">National Digital Health Stack</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 10: MARKET OPPORTUNITY & ROI CALCULATOR -->
    <section class="slide" data-index="9" data-tracks="all,investor" data-title="Market Opportunity & ROI">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-amber">Investor Deep Dive</span>
            <span class="pill pill-teal">Massive ROI for Hospitals</span>
          </div>
          <h2 class="slide-title">Market Opportunity & Interactive Hospital ROI</h2>
          <p class="slide-subtitle">
            Targeting India’s 70,000+ underserved secondary multispecialty hospitals with an irresistible, fast-payback B2B SaaS model.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="calc-container">
          <!-- LEFT: INTERACTIVE SLIDERS -->
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Interactive Hospital ROI Calculator</span>
            </div>

            <div class="slider-group">
              <div class="slider-label-row">
                <span class="slider-title">Hospital Bed Count</span>
                <span class="slider-val" id="beds-display">60 Beds</span>
              </div>
              <input type="range" id="beds-slider" min="20" max="200" step="10" value="60" oninput="calculateROI()">
            </div>

            <div class="slider-group">
              <div class="slider-label-row">
                <span class="slider-title">Average Daily OPD Patients</span>
                <span class="slider-val" id="opd-display">120 Patients / Day</span>
              </div>
              <input type="range" id="opd-slider" min="30" max="400" step="10" value="120" oninput="calculateROI()">
            </div>

            <div style="font-size: 12px; color: var(--text-dim); line-height: 1.5; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
              * Calculations factor in stationary reduction (₹18/patient + ₹650/bed), 4.2 mins saved per consultation, and +12% follow-up retention lift.
            </div>
          </div>

          <!-- RIGHT: CALCULATED VALUE -->
          <div class="card" style="background: rgba(16, 185, 129, 0.04); border-color: rgba(16, 185, 129, 0.3);">
            <div class="card-title" style="color: #34d399;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <span>Projected Annual Hospital Impact</span>
            </div>

            <div class="grid-2" style="gap: 14px; margin-bottom: 16px;">
              <div class="stat-box">
                <span class="stat-val teal" id="monthly-savings-disp">₹95,120</span>
                <span class="stat-lbl">Monthly Paper Savings</span>
                <span class="stat-sub">Stationery, printing & filing</span>
              </div>
              <div class="stat-box">
                <span class="stat-val primary" id="annual-profit-disp">₹14.8 L</span>
                <span class="stat-lbl">Net Annual Profit Boost</span>
                <span class="stat-sub">Savings + Retention Revenue</span>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.04); padding: 14px; border-radius: 8px; border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 13px; font-weight: 700; color: #fff;">Payback Period for Hospital:</div>
                <div style="font-size: 11px; color: var(--text-muted);">SaaS cost recovered through direct stationery savings</div>
              </div>
              <div style="font-family: var(--font-mono); font-size: 22px; font-weight: 800; color: #fbbf24;" id="payback-days-disp">
                28 Days
              </div>
            </div>
          </div>
        </div>

        <div class="grid-3" style="margin-top: 18px;">
          <div class="stat-box">
            <span class="stat-val amber">70,000+</span>
            <span class="stat-lbl">Target Secondary Hospitals</span>
            <span class="stat-sub">Tier-2/3 Indian private healthcare</span>
          </div>
          <div class="stat-box">
            <span class="stat-val primary">$4.2 B</span>
            <span class="stat-lbl">TAM in Emerging Markets</span>
            <span class="stat-sub">Hospital digitisation & AI copilot</span>
          </div>
          <div class="stat-box">
            <span class="stat-val teal">&gt; 80%</span>
            <span class="stat-lbl">Gross SaaS Margins</span>
            <span class="stat-sub">Scalable multi-tenant architecture</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 11: COMPETITIVE ADVANTAGE & MOAT -->
    <section class="slide" data-index="10" data-tracks="all,investor" data-title="Competitive Landscape">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-cyan">Market Positioning</span>
            <span class="pill pill-purple">Unfair Advantage</span>
          </div>
          <h2 class="slide-title">Why MEDI7 by AI7 Wins Over Legacy Hospital Systems</h2>
          <p class="slide-subtitle">
            Traditional enterprise software fails in Tier-2/3 hospitals because of painful 6-month rollouts and mandatory patient app downloads.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="card" style="padding: 10px; margin-bottom: 20px;">
          <table class="comp-table">
            <thead>
              <tr>
                <th>Feature / Capability</th>
                <th>Legacy HIMS (Cerner / Epic)</th>
                <th>Traditional Indian HIMS (Practo / KareXpert)</th>
                <th class="medi7-col">MEDI7 by AI7</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Patient Mobile Requirement</strong></td>
                <td>Proprietary Portal App (Failed Adoption)</td>
                <td>Dedicated App Download Required</td>
                <td class="medi7-col">Zero App — 100% Native WhatsApp</td>
              </tr>
              <tr>
                <td><strong>Multimodal AI PDF Report Analyzer</strong></td>
                <td>None / Third-party bolt-on ($$$)</td>
                <td>None — Manual Lab Entry Only</td>
                <td class="medi7-col">Native Gemini 2.0 Multimodal CDS</td>
              </tr>
              <tr>
                <td><strong>Deployment Timeframe</strong></td>
                <td>6 to 12 Months</td>
                <td>3 to 6 Weeks</td>
                <td class="medi7-col">Under 48 Hours</td>
              </tr>
              <tr>
                <td><strong>Regional Languages</strong></td>
                <td>English Only</td>
                <td>Limited English / Hindi</td>
                <td class="medi7-col">Marathi, Kannada, Hindi & English</td>
              </tr>
              <tr>
                <td><strong>Total Cost of Ownership</strong></td>
                <td>₹25L+ upfront + hefty maintenance</td>
                <td>₹40,000 - ₹80,000 / month</td>
                <td class="medi7-col">₹15,000 - ₹35,000 / mo (Immediate ROI)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid-3">
          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>The WhatsApp Habit Moat</span>
            </div>
            <p class="card-desc">
              Patients and staff already have WhatsApp on their phones. We eliminate the 90% drop-off barrier caused by requiring patient portal logins.
            </p>
          </div>

          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
              <span>Multimodal AI Defensibility</span>
            </div>
            <p class="card-desc">
              Trained on real Indian diagnostic report layouts, handwriting quirks, and vernacular dialects that generic Western medical AI cannot handle.
            </p>
          </div>

          <div class="card">
            <div class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>48-Hour Viral Onboarding</span>
            </div>
            <p class="card-desc">
              Dockerized microservices and zero-hardware design let any hospital go completely paperless over a single weekend.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 12: ROADMAP -->
    <section class="slide" data-index="11" data-tracks="all,doctor,investor" data-title="Product Roadmap">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-cyan">Evolution Path</span>
            <span class="pill pill-teal">Execution Timeline</span>
          </div>
          <h2 class="slide-title">Product & Clinical Roadmap: 2026 - 2027</h2>
          <p class="slide-subtitle">
            From single-hospital paperless workflows to an AI-orchestrated federated health intelligence network.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-3" style="margin-bottom: 24px;">
          <!-- PHASE 1 -->
          <div class="card" style="border-top: 4px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="pill pill-teal">Phase 1 (Complete)</span>
              <span style="font-size: 11px; color: #34d399; font-weight: 700;">LIVE IN PROD</span>
            </div>
            <div class="card-title">The Paperless Core</div>
            <ul class="bullet-list">
              <li class="bullet-item"><div class="bullet-icon teal">✓</div><span>6 Role-based Dashboards (Doctor, Lab, Pharmacy, etc.)</span></li>
              <li class="bullet-item"><div class="bullet-icon teal">✓</div><span>Multilingual WhatsApp delivery (4 languages)</span></li>
              <li class="bullet-item"><div class="bullet-icon teal">✓</div><span>Pixel-perfect digital letterheads</span></li>
              <li class="bullet-item"><div class="bullet-icon teal">✓</div><span>Full audit logging & RBAC security</span></li>
            </ul>
          </div>

          <!-- PHASE 2 -->
          <div class="card" style="border-top: 4px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="pill pill-new">Phase 2 (Current)</span>
              <span style="font-size: 11px; color: #c084fc; font-weight: 700;">IN ROLLOUT</span>
            </div>
            <div class="card-title">AI Diagnostics & Copilot</div>
            <ul class="bullet-list">
              <li class="bullet-item"><div class="bullet-icon blue">✓</div><span><strong>Multimodal AI PDF Report Analyzer</strong></span></li>
              <li class="bullet-item"><div class="bullet-icon blue">✓</div><span>Clinical Decision Support & Differential Alerts</span></li>
              <li class="bullet-item"><div class="bullet-icon blue">✓</div><span>AI Voice Scribe in regional Indian dialects</span></li>
              <li class="bullet-item"><div class="bullet-icon blue">✓</div><span>Instant UPI payment collection on WhatsApp</span></li>
            </ul>
          </div>

          <!-- PHASE 3 -->
          <div class="card" style="border-top: 4px solid #06b6d4;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="pill pill-cyan">Phase 3 (Next 12 Mos)</span>
              <span style="font-size: 11px; color: #22d3ee; font-weight: 700;">FORWARD VISION</span>
            </div>
            <div class="card-title">Predictive Hospital Network</div>
            <ul class="bullet-list">
              <li class="bullet-item"><div class="bullet-icon blue">➔</div><span><strong>ICU Early Warning System (EWS):</strong> Vital sign trajectory deterioration alerts for sepsis/shock.</span></li>
              <li class="bullet-item"><div class="bullet-icon blue">➔</div><span><strong>ABDM M3 Integration:</strong> Interoperable National Ayushman Bharat digital health IDs.</span></li>
              <li class="bullet-item"><div class="bullet-icon blue">➔</div><span>Federated Multi-Hospital Group analytics.</span></li>
            </ul>
          </div>
        </div>

        <div class="card" style="background: rgba(255,255,255,0.02);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; color: #60a5fa; flex-shrink: 0;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6z"/></svg>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: #fff;">Strategic Growth Flywheel</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Every hospital deployed strengthens AI7's proprietary regional clinical datasets, boosting AI extraction accuracy and creating an unassailable data moat in Tier-2/3 Indian healthcare.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 13: CLINICAL & COMMERCIAL VALIDATION -->
    <section class="slide" data-index="12" data-tracks="all,doctor,investor" data-title="Clinical Validation">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-teal">Traction & Validation</span>
            <span class="pill pill-cyan">Proven in Active Hospital Deployments</span>
          </div>
          <h2 class="slide-title">Real-World Impact Across AI7 Partner Hospitals</h2>
          <p class="slide-subtitle">
            Demonstrating tangible clinical efficiency, zero paper reliance, and high doctor satisfaction in active daily operations.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-4" style="margin-bottom: 24px;">
          <div class="stat-box">
            <span class="stat-val teal">84%</span>
            <span class="stat-lbl">Paper Cut in 30 Days</span>
            <span class="stat-sub">Zero physical clipboards used</span>
          </div>
          <div class="stat-box">
            <span class="stat-val primary">4.2 min</span>
            <span class="stat-lbl">Saved per Consultation</span>
            <span class="stat-sub">Clinicians focus on patients</span>
          </div>
          <div class="stat-box">
            <span class="stat-val teal">99.4%</span>
            <span class="stat-lbl">WhatsApp Report Delivery</span>
            <span class="stat-sub">Instant patient receipt</span>
          </div>
          <div class="stat-box">
            <span class="stat-val purple">0</span>
            <span class="stat-lbl">Misplaced Medical Records</span>
            <span class="stat-sub">100% digital searchability</span>
          </div>
        </div>

        <div class="grid-2">
          <!-- DOCTOR QUOTE -->
          <div class="card" style="border-left: 4px solid #3b82f6;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                Dr
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #fff;">Dr. Priya Sharma, MD</div>
                <div style="font-size: 11px; color: var(--text-dim);">Chief Medical Officer, Partner Multispecialty Hospital Network</div>
              </div>
            </div>
            <p style="font-size: 13px; color: #cbd5e1; font-style: italic; line-height: 1.6;">
              "Having the AI7 engine automatically read external 4-page lab PDFs and flag out-of-range creatinine and troponins in seconds has been a lifesaver in crowded OPD hours. I no longer waste 5 minutes searching through crumpled files."
            </p>
          </div>

          <!-- ADMIN QUOTE -->
          <div class="card" style="border-left: 4px solid #10b981;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #059669; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                AD
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #fff;">Chief Operating Officer</div>
                <div style="font-size: 11px; color: var(--text-dim);">120-Bed Multispecialty Hospital Group</div>
              </div>
            </div>
            <p style="font-size: 13px; color: #cbd5e1; font-style: italic; line-height: 1.6;">
              "Our stationery bills dropped by over ₹80,000 in the first month alone, but more importantly, our follow-up visit return rate jumped by 60% because patients actually receive automated reminders right on their WhatsApp."
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 14: THE ASK & CLOSING -->
    <section class="slide" data-index="13" data-tracks="all,doctor,investor" data-title="Partnership & The Ask">
      <div class="slide-header">
        <div class="slide-title-wrap">
          <div class="slide-pill-row">
            <span class="pill pill-teal">Next Steps</span>
            <span class="pill pill-purple">Join the Healthcare Revolution</span>
          </div>
          <h2 class="slide-title">Partner with AI7: Transforming Hospital Care with MEDI7</h2>
          <p class="slide-subtitle">
            Whether you are an investor backing India's digital health infrastructure or a clinician seeking an intelligent paperless hospital.
          </p>
        </div>
      </div>

      <div class="slide-body">
        <div class="grid-2" style="margin-bottom: 24px;">
          <!-- FOR INVESTORS -->
          <div class="card" style="background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.3);">
            <div class="card-title" style="color: #60a5fa;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <span>For Investors: Seed Expansion Round</span>
            </div>
            <p class="card-desc" style="margin-bottom: 14px;">
              Raising Seed capital to scale MEDI7 across <strong>150+ multispecialty hospitals</strong> in Karnataka, Maharashtra, and Andhra Pradesh:
            </p>
            <ul class="bullet-list" style="margin-bottom: 16px;">
              <li class="bullet-item"><div class="bullet-icon blue">✓</div><span><strong>Market Penetration:</strong> Direct hospital acquisition playbook with 48-hour onboarding.</span></li>
              <li class="bullet-item"><div class="bullet-icon blue">✓</div><span><strong>AI Moat Acceleration:</strong> Multimodal clinical report extraction across 30+ regional diagnostic lab formats.</span></li>
              <li class="bullet-item"><div class="bullet-icon blue">✓</div><span><strong>Unit Economics:</strong> Proven 28-day payback period and >80% recurring gross margins.</span></li>
            </ul>
            <span class="pill pill-cyan" style="width: fit-content;">Deck & Financial Projections Available upon Request</span>
          </div>

          <!-- FOR DOCTORS & HOSPITALS -->
          <div class="card" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.3);">
            <div class="card-title" style="color: #34d399;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span>For Doctors: 14-Day Zero-Risk Pilot</span>
            </div>
            <p class="card-desc" style="margin-bottom: 14px;">
              Bring MEDI7 into your hospital or clinical department with <strong>zero hardware investment</strong> and zero operational downtime:
            </p>
            <ul class="bullet-list" style="margin-bottom: 16px;">
              <li class="bullet-item"><div class="bullet-icon teal">✓</div><span><strong>Live in 48 Hours:</strong> We digitize your existing letterhead and formulary over the weekend.</span></li>
              <li class="bullet-item"><div class="bullet-icon teal">✓</div><span><strong>Zero Staff Learning Curve:</strong> Reception and nursing staff trained in 30 minutes.</span></li>
              <li class="bullet-item"><div class="bullet-icon teal">✓</div><span><strong>Guaranteed Paper Reduction:</strong> Save ₹40,000+ in printing in your first month alone.</span></li>
            </ul>
            <span class="pill pill-teal" style="width: fit-content;">Schedule a 15-Minute Departmental Walkthrough</span>
          </div>
        </div>

        <!-- CONTACT ROW -->
        <div class="card" style="background: rgba(15, 23, 42, 0.7); display: flex; flex-direction: row; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #fff;">Get in Touch with the AI7 Leadership Team</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
              AI7 Technologies Pvt Ltd • MEDI7 Healthcare Operating Systems
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <a href="tel:+919180198107" style="text-decoration: none; display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); color: #fff; font-size: 13px; font-weight: 600;">
              <span>📞</span> +91 91801 98107
            </a>
            <a href="mailto:investors@ai7.health" style="text-decoration: none; display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); color: #fff; font-size: 13px; font-weight: 600;">
              <span>✉️</span> investors@ai7.health
            </a>
            <button onclick="window.open('demo.html', '_blank')" class="btn-apply-rx" style="padding: 10px 18px;">
              <span>🚀 Launch Live Hospital Demo</span>
            </button>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- BOTTOM PROGRESS & NAVIGATION -->
  <div class="progress-bar-wrap">
    <div class="progress-bar-fill" id="progress-bar"></div>
  </div>

  <div class="bottom-controls">
    <button class="nav-arrow-btn" id="prev-btn" onclick="prevSlide()" title="Previous Slide [Left Arrow]">
      &#9664;
    </button>
    <div class="nav-dots" id="dots-container"></div>
    <button class="nav-arrow-btn" id="next-btn" onclick="nextSlide()" title="Next Slide [Right Arrow / Space]">
      &#9654;
    </button>
  </div>

  <!-- SPEAKER NOTES DRAWER -->
  <aside class="notes-drawer" id="notes-drawer">
    <div class="notes-header">
      <div class="notes-title">
        <span>📝</span> Speaker Notes
      </div>
      <button class="close-btn" onclick="toggleNotes()">✕</button>
    </div>

    <div>
      <div class="note-section-title" style="color: #60a5fa;">
        <span>💼</span> Investor Pitch Script
      </div>
      <div class="note-box" id="note-investor">
        Welcome to MEDI7 by AI7. Emphasize that Tier-2 and Tier-3 private hospitals in India manage 65% of the patient volume but are completely left out of modern HealthTech. MEDI7 solves this with zero patient app friction and an integrated multimodal AI copilot.
      </div>
    </div>

    <div>
      <div class="note-section-title" style="color: #34d399;">
        <span>🩺</span> Doctor Clinical Talking Points
      </div>
      <div class="note-box" id="note-doctor">
        Doctors are overwhelmed with paperwork. Show them how the 3-line briefing and the new AI PDF Report Reader catches subtle anomalies in seconds, protecting them from diagnostic fatigue without taking away their decision-making autonomy.
      </div>
    </div>

    <div>
      <div class="note-section-title" style="color: #fbbf24;">
        <span>⏱️</span> Timing & Transitions
      </div>
      <div class="note-box" id="note-timing">
        Recommended pace: 1 to 2 minutes on problem/solution; spend 3 minutes demonstrating the interactive AI PDF Report Analyzer on Slide 5.
      </div>
    </div>
  </aside>

  <!-- SLIDE GRID OVERVIEW MODAL -->
  <div class="overview-modal" id="overview-modal">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 24px; font-weight: 800; color: #fff;">Slide Directory</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Click any slide to jump directly</p>
      </div>
      <button class="action-btn" onclick="toggleOverview()" style="padding: 8px 16px;">
        ✕ Close [Esc]
      </button>
    </div>
    <div class="overview-grid" id="overview-grid-container"></div>
  </div>

  <!-- TOAST NOTIFICATION -->
  <div class="toast-notice" id="toast-notice">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span id="toast-text">Prescription recommendations updated!</span>
  </div>
</div>

<script>
/* =========================================================
   MEDI7 by AI7 PRESENTATION ENGINE & INTERACTION LOGIC
   ========================================================= */

const SPEAKER_NOTES = [
  {{
    investor: "Hook: Tier-2/3 Indian healthcare is an untapped $4.2B SaaS opportunity. 70,000+ hospitals still run on crinkled paper files. Introduce MEDI7 by AI7 as the world's first conversational, WhatsApp-first hospital operating system with a proprietary Multimodal AI Clinical Copilot.",
    doctor: "Warm welcome to medical colleagues. Reassure doctors that MEDI7 was created to eliminate the 4 hours of daily administrative typing so you can focus on patient care.",
    timing: "Suggested: 1.5 mins. Set high-energy vision."
  }},
  {{
    investor: "Highlight the dual crisis: doctors are burning out from 4 hours of paper charting, while hospital administrators lose ₹80K-₹1L/month in stationery waste and suffer a 78% patient follow-up drop-off. Show how paper is literally burning hospital margins.",
    doctor: "Address the acute pain of OPD rushes: 40 patients waiting outside, crinkled external reports from 5 different diagnostic labs, no past history, high medicolegal risk. MEDI7 eliminates this chaos.",
    timing: "Suggested: 2 mins. Build deep empathy with the pain."
  }},
  {{
    investor: "The unified architecture: zero hardware lock-in, zero app downloads. Walk through the 5-step flow. Explain why WhatsApp is our moat: 98% of Indian patients already use it daily, yielding a 99.4% engagement rate.",
    doctor: "Walk through the frictionless workflow. The moment you save an Rx, the patient receives it on WhatsApp. No lost paper, no illegible handwriting, 100% legal digital letterheads.",
    timing: "Suggested: 2 mins."
  }},
  {{
    investor: "THIS IS THE BIG INNOVATION: External PDF diagnostic reports are the biggest blind spot in digital health. Patients get scans done outside. Our multimodal Gemini 2.0 pipeline reads any PDF in under 1.8 seconds. This is a defensible moat competitors cannot match.",
    doctor: "Explain the AI Clinical Copilot. It does not replace the doctor; it acts as an expert junior registrar flagging out-of-range biomarkers, cross-referencing comorbidities (CKD, DM), and alerting to contraindicated drugs.",
    timing: "Suggested: 2.5 mins. Emphasize multimodal AI accuracy."
  }},
  {{
    investor: "Interactive Demo: Click between Case 1 (Diabetic Nephropathy), Case 2 (Cardiac Troponin), and Case 3 (Liver Injury). Demonstrate how the AI extracts structured tabular data and generates doctor-grade insights instantly.",
    doctor: "Showcase the clinical depth. Notice how in Case 1 it catches eGFR dropping to 24 mL/min and flags that Metformin is contraindicated! Click 'Adopt into Prescription' to show the 1-click clinical workflow.",
    timing: "Suggested: 3.5 mins. Hands-on interaction!"
  }},
  {{
    investor: "Doctor retention is our secret weapon. If doctors love the software, the hospital never churns. MEDI7 reduces consultation entry from 15 minutes to under 3 minutes, giving hospitals 30% more capacity.",
    doctor: "Highlight the 3-line history briefing and regional voice scribe. Explain how you can speak naturally in your dialect and have it convert into structured prescriptions.",
    timing: "Suggested: 2 mins."
  }},
  {{
    investor: "Why patient portals fail in India: less than 8% download rate. WhatsApp has a 98% penetration. Automated reminders increase follow-up compliance by 64%, creating recurring consultation revenue for the hospital.",
    doctor: "Patients love receiving their official letterhead PDF on WhatsApp. When lab tests are ready, they don't crowd your hallway; they receive the PDF automatically.",
    timing: "Suggested: 2 mins."
  }},
  {{
    investor: "Breadth of coverage: We aren't just an OPD tool. We connect Reception, Doctor, Lab, Radiology, Pharmacy, and the Owner Command Center with row-level RBAC security.",
    doctor: "Notice how all departments are synchronized. When you order a CBC or USG, the lab technician and radiologist see it immediately on their dashboards.",
    timing: "Suggested: 2 mins."
  }},
  {{
    investor: "Tech Moat: FastAPI asynchronous speed (<120ms latency), PostgreSQL 16 reliability, Celery/Redis queues, Gemini 2.0 multimodal intelligence, and full compliance with India's DPDP Act 2023.",
    doctor: "Assure doctors of medicolegal safety. Every consultation, prescription, and report access is timestamped in cryptographic audit logs.",
    timing: "Suggested: 1.5 mins."
  }},
  {{
    investor: "Financial Mechanics: TAM of $4.2B across 70,000+ hospitals. B2B SaaS of ₹15k-₹35k/mo + AI report credits. Payback period is under 30 days based solely on paper savings! Play with the ROI sliders to show the numbers.",
    doctor: "For medical directors: Show how the system pays for itself in less than a month through reduced paper, film, and toner costs while boosting hospital revenue.",
    timing: "Suggested: 3 mins. Focus on unit economics."
  }},
  {{
    investor: "Competitive Landscape: Contrast MEDI7 with legacy giants like Cerner/Epic (too expensive, 6-month setups) and legacy Indian apps like Practo (requires patient app). MEDI7 deploys in 48 hours.",
    doctor: "Unlike clunky legacy software with 40 mandatory text boxes, MEDI7 feels like an iPad-first conversational tool built for rapid OPD flow.",
    timing: "Suggested: 2 mins."
  }},
  {{
    investor: "Roadmap: Phase 1 is done and live. Phase 2 brings multimodal AI report reading and voice scribes. Phase 3 targets predictive ICU Early Warning Systems and national ABDM M3 integration.",
    doctor: "Share our clinical vision for predictive deterioration warnings: alerting ICU teams hours before a patient develops septic shock.",
    timing: "Suggested: 1.5 mins."
  }},
  {{
    investor: "Traction & Social Proof: Live metrics across partner hospitals — 84% paper eliminated, 4.2 minutes shaved off every consultation, 99.4% WhatsApp delivery, zero lost charts.",
    doctor: "Read the clinical testimonial from Dr. Priya Sharma on how MEDI7 prevents diagnostic oversight during peak OPD hours.",
    timing: "Suggested: 1.5 mins."
  }},
  {{
    investor: "The Ask: Raising Seed round for AI7 to expand across 150+ hospitals in West and South India. Invite investors for due diligence and live hospital visits.",
    doctor: "Invite doctors to start a zero-risk 14-day clinical trial. We can have their hospital running completely paperless by next Monday morning.",
    timing: "Suggested: 2 mins. Confident close and Q&A."
  }}
];

const CLINICAL_CASES = {{
  1: {{
    docName: "Thyrocare_Comprehensive_Metabolic_Panel.pdf",
    docMeta: "Uploaded 4 mins ago • 3 Pages • Patient: Ramesh Patil (58M)",
    patient: {{ name: "Ramesh Patil", age: "58 Yrs / Male", uhid: "AI7-2026-00412", date: "14-Oct-2026" }},
    labName: "THYROCARE TECHNOLOGIES LTD — CENTRAL DIAGNOSTIC REF LAB",
    rows: [
      {{ test: "HbA1c (Glycosylated Hemoglobin)", val: "10.4 %", ref: "4.0 - 5.6 %", status: "danger" }},
      {{ test: "Fasting Blood Sugar (FBS)", val: "218 mg/dL", ref: "70 - 99 mg/dL", status: "danger" }},
      {{ test: "Serum Creatinine", val: "2.8 mg/dL", ref: "0.7 - 1.3 mg/dL", status: "danger" }},
      {{ test: "Blood Urea Nitrogen (BUN)", val: "48 mg/dL", ref: "7 - 20 mg/dL", status: "danger" }},
      {{ test: "eGFR (CKD-EPI)", val: "24 mL/min/1.73m²", ref: "> 90 mL/min", status: "danger" }},
      {{ test: "Urine Microalbumin", val: "180 mg/L", ref: "< 20 mg/L", status: "danger" }},
      {{ test: "Hemoglobin (Hb)", val: "8.9 g/dL", ref: "13.0 - 17.0 g/dL", status: "warn" }},
      {{ test: "Serum Potassium", val: "5.3 mEq/L", ref: "3.5 - 5.0 mEq/L", status: "warn" }}
    ],
    flags: [
      {{ name: "Serum Creatinine", val: "2.8 mg/dL", cls: "critical" }},
      {{ name: "Estimated GFR", val: "24 mL/min (Stage 4)", cls: "critical" }},
      {{ name: "HbA1c", val: "10.4 % (Uncontrolled)", cls: "critical" }},
      {{ name: "Hemoglobin", val: "8.9 g/dL (Anemia)", cls: "warning" }}
    ],
    alertType: "danger",
    alertTitle: "🚨 CRITICAL DRUG CONTRAINDICATION & CKD ALERT",
    alertText: "Patient's eGFR has dropped to 24 mL/min/1.73m² (Stage 4 Severe CKD). Patient is currently prescribed <strong>Metformin 1000mg BD</strong>. Metformin is strictly contraindicated at eGFR &lt; 30 mL/min due to life-threatening Lactic Acidosis risk.",
    recommendations: [
      "Immediate cessation of Metformin; switch to renal-adjusted DPP-4i (Teneligliptin 20mg) or Basal Insulin.",
      "Workup for Anemia of Chronic Kidney Disease (Serum Ferritin, Transferrin Saturation, consider Erythropoietin).",
      "Immediate Nephrology referral for fistula planning & renal progression slowdown.",
      "Review Telmisartan dosage in setting of borderline hyperkalemia (K+ 5.3 mEq/L)."
    ],
    rxAddition: "Rx Updated: Discontinue Metformin 1000mg. Added Teneligliptin 20mg OD (Post-breakfast). Ordered Serum Ferritin & Iron Profile. Nephrology consult booked for 16-Oct."
  }},
  2: {{
    docName: "Apex_Emergency_Cardiac_&_Lipid_Panel.pdf",
    docMeta: "Uploaded 1 min ago • 2 Pages • Patient: Sunita Kulkarni (52F)",
    patient: {{ name: "Sunita Kulkarni", age: "52 Yrs / Female", uhid: "AI7-2026-00891", date: "14-Oct-2026" }},
    labName: "APEX MULTISPECIALTY — STAT BIOCHEMISTRY LAB",
    rows: [
      {{ test: "High Sensitivity Troponin-I", val: "0.12 ng/mL", ref: "< 0.04 ng/mL", status: "danger" }},
      {{ test: "Total Cholesterol", val: "278 mg/dL", ref: "< 200 mg/dL", status: "danger" }},
      {{ test: "LDL-Cholesterol (Direct)", val: "198 mg/dL", ref: "< 100 mg/dL", status: "danger" }},
      {{ test: "Triglycerides", val: "245 mg/dL", ref: "< 150 mg/dL", status: "warn" }},
      {{ test: "hs-CRP (Cardiovascular Risk)", val: "7.4 mg/L", ref: "< 1.0 mg/L", status: "danger" }},
      {{ test: "Creatine Kinase-MB (CK-MB)", val: "38 U/L", ref: "< 25 U/L", status: "warn" }},
      {{ test: "Random Blood Sugar", val: "142 mg/dL", ref: "< 140 mg/dL", status: "normal" }}
    ],
    flags: [
      {{ name: "hs-Troponin I", val: "0.12 ng/mL (High)", cls: "critical" }},
      {{ name: "LDL Cholesterol", val: "198 mg/dL", cls: "critical" }},
      {{ name: "hs-CRP", val: "7.4 mg/L (High Risk)", cls: "critical" }},
      {{ name: "CK-MB", val: "38 U/L (Elevated)", cls: "warning" }}
    ],
    alertType: "danger",
    alertTitle: "🚨 SUSPECTED ACUTE CORONARY SYNDROME (ACS)",
    alertText: "Troponin-I (0.12 ng/mL) with elevated CK-MB in patient presenting with exertional heaviness strongly suggests Non-ST Elevation Myocardial Ischemia (NSTEMI) or Unstable Angina. Severe dyslipidemia (LDL 198 mg/dL) indicates high plaque vulnerability.",
    recommendations: [
      "Immediate 12-lead STAT ECG and serial Troponin-I repeat in 3 hours.",
      "Initiate High-Intensity Statin Therapy (Atorvastatin 80mg OD immediately).",
      "Immediate Cardiology review for bedside 2D Echocardiography & Coronary Angiography.",
      "Dual Antiplatelet Therapy (Aspirin 300mg + Ticagrelor 180mg) loading per institutional protocol."
    ],
    rxAddition: "Rx Updated: STAT Atorvastatin 80mg OD + Aspirin 150mg OD. Transferred to Cardiac Care Unit (CCU). Bedside 2D Echo ordered."
  }},
  3: {{
    docName: "Metropolis_Liver_Function_Profile.pdf",
    docMeta: "Uploaded 8 mins ago • 2 Pages • Patient: Mohammed Ansari (46M)",
    patient: {{ name: "Mohammed Ansari", age: "46 Yrs / Male", uhid: "AI7-2026-00334", date: "14-Oct-2026" }},
    labName: "METROPOLIS HEALTHCARE LIMITED — REFERENCE LAB",
    rows: [
      {{ test: "SGPT / ALT (Alanine Aminotransferase)", val: "168 U/L", ref: "7 - 56 U/L", status: "danger" }},
      {{ test: "SGOT / AST (Aspartate Aminotransferase)", val: "145 U/L", ref: "10 - 40 U/L", status: "danger" }},
      {{ test: "Total Bilirubin", val: "2.1 mg/dL", ref: "0.2 - 1.2 mg/dL", status: "danger" }},
      {{ test: "Direct Bilirubin", val: "1.2 mg/dL", ref: "< 0.3 mg/dL", status: "warn" }},
      {{ test: "Alkaline Phosphatase (ALP)", val: "142 U/L", ref: "44 - 147 U/L", status: "normal" }},
      {{ test: "Serum Albumin", val: "3.7 g/dL", ref: "3.5 - 5.2 g/dL", status: "normal" }},
      {{ test: "Total Protein", val: "6.8 g/dL", ref: "6.0 - 8.3 g/dL", status: "normal" }}
    ],
    flags: [
      {{ name: "SGPT (ALT)", val: "168 U/L (>3x ULN)", cls: "critical" }},
      {{ name: "SGOT (AST)", val: "145 U/L (>3.5x ULN)", cls: "critical" }},
      {{ name: "Total Bilirubin", val: "2.1 mg/dL (Elevated)", cls: "warning" }},
      {{ name: "Alkaline Phos", val: "142 U/L (Normal)", cls: "warning" }}
    ],
    alertType: "danger",
    alertTitle: "⚠️ ACUTE DRUG-INDUCED LIVER INJURY (DILI) WARNING",
    alertText: "Transaminases ALT/AST are >3x the upper limit of normal with concurrent conjugated hyperbilirubinemia. Patient is undergoing Antitubercular Therapy (Isoniazid/Rifampicin) and was recently co-prescribed Atorvastatin. High risk of drug-drug hepatotoxicity.",
    recommendations: [
      "Immediately withhold Atorvastatin and hepatotoxic analgesics (Paracetamol/NSAIDs).",
      "Re-evaluate ATT regimen in consultation with Pulmonology; repeat LFT in 48 hours.",
      "Screen for viral hepatitis (HBsAg, Anti-HCV, IgM HAV) to exclude infectious superinfections.",
      "Advise patient on red flag symptoms: scleral icterus, dark urine, persistent pruritus."
    ],
    rxAddition: "Rx Updated: Withhold Atorvastatin 20mg immediately. LFT repeat ordered for 16-Oct. Added Ursodeoxycholic Acid 300mg BD. Pulmonology review scheduled."
  }}
}};

let allSlides = [];
let activeSlides = [];
let currentSlideIndex = 0;
let currentTrack = 'all';
let secondsElapsed = 0;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {{
  allSlides = Array.from(document.querySelectorAll('.slide'));
  updateActiveSlides();
  startTimer();
  renderDots();
  renderOverviewGrid();
  loadCase(1);
  calculateROI();

  document.addEventListener('keydown', (e) => {{
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {{
      e.preventDefault();
      nextSlide();
    }} else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {{
      e.preventDefault();
      prevSlide();
    }} else if (e.key === 'Home') {{
      e.preventDefault();
      jumpToSlide(0);
    }} else if (e.key === 'End') {{
      e.preventDefault();
      jumpToSlide(activeSlides.length - 1);
    }} else if (e.key === 's' || e.key === 'S') {{
      toggleNotes();
    }} else if (e.key === 'o' || e.key === 'O') {{
      toggleOverview();
    }} else if (e.key === 'f' || e.key === 'F') {{
      toggleFullScreen();
    }} else if (e.key === 'p' || e.key === 'P') {{
      window.print();
    }} else if (e.key === 'Escape') {{
      document.getElementById('overview-modal').classList.remove('open');
      document.getElementById('notes-drawer').classList.remove('open');
    }}
  }});
}});

function updateActiveSlides() {{
  if (currentTrack === 'all') {{
    activeSlides = allSlides;
  }} else {{
    activeSlides = allSlides.filter(slide => {{
      const tracks = slide.getAttribute('data-tracks') || 'all';
      return tracks.split(',').includes(currentTrack);
    }});
  }}
  currentSlideIndex = 0;
  showSlide(currentSlideIndex);
  renderDots();
  updateCounters();
}}

function setTrack(track, btn) {{
  currentTrack = track;
  document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateActiveSlides();
}}

function showSlide(index) {{
  if (index < 0) index = 0;
  if (index >= activeSlides.length) index = activeSlides.length - 1;
  currentSlideIndex = index;

  allSlides.forEach(s => s.classList.remove('active'));
  const target = activeSlides[currentSlideIndex];
  if (target) {{
    target.classList.add('active');
    const globalIdx = parseInt(target.getAttribute('data-index') || 0);
    updateSpeakerNotes(globalIdx);
  }}

  updateProgressBar();
  updateCounters();
  updateDots();
  updateNavButtons();
}}

function nextSlide() {{
  if (currentSlideIndex < activeSlides.length - 1) {{
    showSlide(currentSlideIndex + 1);
  }}
}}

function prevSlide() {{
  if (currentSlideIndex > 0) {{
    showSlide(currentSlideIndex - 1);
  }}
}}

function jumpToSlide(index) {{
  showSlide(index);
  document.getElementById('overview-modal').classList.remove('open');
}}

function updateCounters() {{
  const curNum = (currentSlideIndex + 1).toString().padStart(2, '0');
  const totalNum = activeSlides.length.toString().padStart(2, '0');
  document.getElementById('current-slide-num').textContent = curNum;
  document.getElementById('total-slide-num').textContent = totalNum;
}}

function updateProgressBar() {{
  const pct = ((currentSlideIndex + 1) / activeSlides.length) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
}}

function updateNavButtons() {{
  document.getElementById('prev-btn').disabled = (currentSlideIndex === 0);
  document.getElementById('next-btn').disabled = (currentSlideIndex === activeSlides.length - 1);
}}

function renderDots() {{
  const container = document.getElementById('dots-container');
  container.innerHTML = '';
  activeSlides.forEach((slide, idx) => {{
    const dot = document.createElement('div');
    dot.className = 'nav-dot' + (idx === currentSlideIndex ? ' active' : '');
    dot.title = slide.getAttribute('data-title') || `Slide ${{idx + 1}}`;
    dot.onclick = () => showSlide(idx);
    container.appendChild(dot);
  }});
}}

function updateDots() {{
  const dots = document.querySelectorAll('.nav-dot');
  dots.forEach((dot, idx) => {{
    if (idx === currentSlideIndex) dot.classList.add('active');
    else dot.classList.remove('active');
  }});
}}

function updateSpeakerNotes(globalIdx) {{
  const noteData = SPEAKER_NOTES[globalIdx] || {{
    investor: "Highlight unit economics and scalability for this section.",
    doctor: "Discuss clinical implications and patient outcomes.",
    timing: "Suggested: 1.5 mins."
  }};
  document.getElementById('note-investor').innerHTML = noteData.investor;
  document.getElementById('note-doctor').innerHTML = noteData.doctor;
  document.getElementById('note-timing').innerHTML = noteData.timing;
}}

function toggleNotes() {{
  const drawer = document.getElementById('notes-drawer');
  const btn = document.getElementById('notes-btn');
  drawer.classList.toggle('open');
  btn.classList.toggle('active');
}}

function toggleOverview() {{
  const modal = document.getElementById('overview-modal');
  modal.classList.toggle('open');
}}

function renderOverviewGrid() {{
  const grid = document.getElementById('overview-grid-container');
  grid.innerHTML = '';
  allSlides.forEach((slide, idx) => {{
    const title = slide.getAttribute('data-title') || `Slide ${{idx + 1}}`;
    const tracks = (slide.getAttribute('data-tracks') || 'all').split(',');

    const card = document.createElement('div');
    card.className = 'overview-card' + (idx === currentSlideIndex ? ' active' : '');
    card.onclick = () => jumpToSlide(idx);

    let pills = '';
    if (tracks.includes('doctor')) pills += '<span class="pill pill-cyan" style="font-size:9px;">Doctor</span> ';
    if (tracks.includes('investor')) pills += '<span class="pill pill-purple" style="font-size:9px;">Investor</span>';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--text-dim);">Slide ${{(idx+1).toString().padStart(2, '0')}}</span>
        <div>${{pills}}</div>
      </div>
      <div style="font-size:13px; font-weight:700; color:#fff; line-height:1.3;">${{title}}</div>
    `;
    grid.appendChild(card);
  }});
}}

function toggleFullScreen() {{
  if (!document.fullscreenElement) {{
    document.documentElement.requestFullscreen().catch(() => {{}});
  }} else {{
    if (document.exitFullscreen) {{
      document.exitFullscreen().catch(() => {{}});
    }}
  }}
}}

function startTimer() {{
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {{
    secondsElapsed++;
    const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const s = (secondsElapsed % 60).toString().padStart(2, '0');
    document.getElementById('elapsed-time').textContent = `${{m}}:${{s}}`;
  }}, 1000);
}}

/* =========================================================
   INTERACTIVE CASE DEMO (SLIDE 5)
   ========================================================= */
let currentCase = 1;

function loadCase(caseNum) {{
  currentCase = caseNum;
  document.querySelectorAll('.case-tab-btn').forEach((btn, idx) => {{
    if (idx + 1 === caseNum) btn.classList.add('active');
    else btn.classList.remove('active');
  }});

  const data = CLINICAL_CASES[caseNum];
  document.getElementById('pdf-doc-name').textContent = data.docName;
  document.getElementById('pdf-doc-meta').textContent = data.docMeta;

  let tableRows = '';
  data.rows.forEach(r => {{
    let rowCls = '';
    if (r.status === 'danger') rowCls = 'highlight-danger';
    else if (r.status === 'warn') rowCls = 'highlight-warn';

    tableRows += `
      <tr class="${{rowCls}}">
        <td>${{r.test}}</td>
        <td style="font-family:var(--font-mono); font-weight:700;">${{r.val}}</td>
        <td style="color:#64748b;">${{r.ref}}</td>
      </tr>
    `;
  }});

  document.getElementById('pdf-content-sheet').innerHTML = `
    <div class="pdf-letterhead">
      <div>
        <div class="pdf-lab-name">${{data.labName}}</div>
        <div style="font-size:9px; color:#64748b;">NABL & CAP ACCREDITED CLINICAL REFERENCE LABORATORY</div>
      </div>
      <div style="text-align:right; font-size:10px; color:#64748b;">
        Report ID: LAB-2026-${{8900 + caseNum}}<br>Date: ${{data.patient.date}}
      </div>
    </div>

    <div class="pdf-patient-strip">
      <div><strong>Patient:</strong> ${{data.patient.name}}</div>
      <div><strong>Age/Sex:</strong> ${{data.patient.age}}</div>
      <div><strong>Hospital UID:</strong> ${{data.patient.uhid}}</div>
    </div>

    <table class="pdf-table">
      <thead>
        <tr>
          <th>Investigation Parameter</th>
          <th>Observed Value</th>
          <th>Biological Reference Range</th>
        </tr>
      </thead>
      <tbody>
        ${{tableRows}}
      </tbody>
    </table>
  `;

  let flagsHtml = '';
  data.flags.forEach(f => {{
    flagsHtml += `
      <div class="flag-chip ${{f.cls}}">
        <span class="flag-name">${{f.name}}</span>
        <span class="flag-val ${{f.cls}}">${{f.val}}</span>
      </div>
    `;
  }});
  document.getElementById('flags-container').innerHTML = flagsHtml;

  let recsHtml = '';
  data.recommendations.forEach(rec => {{
    recsHtml += `<li>${{rec}}</li>`;
  }});

  document.getElementById('sug-box').innerHTML = `
    <div class="sug-header ${{data.alertType}}">
      <span>${{data.alertTitle}}</span>
    </div>
    <div class="sug-text">
      ${{data.alertText}}
    </div>
    <ol class="sug-recommendations">
      ${{recsHtml}}
    </ol>
  `;
}}

function applyToRx() {{
  const data = CLINICAL_CASES[currentCase];
  showToast(data.rxAddition);
}}

function showToast(msg) {{
  const toast = document.getElementById('toast-notice');
  document.getElementById('toast-text').textContent = msg;
  toast.style.display = 'flex';
  setTimeout(() => {{
    toast.style.display = 'none';
  }}, 4000);
}}

/* =========================================================
   INTERACTIVE ROI CALCULATOR (SLIDE 10)
   ========================================================= */
function calculateROI() {{
  const beds = parseInt(document.getElementById('beds-slider').value);
  const opd = parseInt(document.getElementById('opd-slider').value);

  document.getElementById('beds-display').textContent = `${{beds}} Beds`;
  document.getElementById('opd-display').textContent = `${{opd}} Patients / Day`;

  const paperSavings = (beds * 650) + (opd * 18 * 26);
  const retentionRev = Math.round(opd * 26 * 0.12 * 350);

  const totalMonthlyVal = paperSavings + retentionRev;
  const annualProfit = (totalMonthlyVal * 12) / 100000;

  const saasFee = 25000;
  const paybackDays = Math.max(14, Math.round(saasFee / (paperSavings / 30)));

  document.getElementById('monthly-savings-disp').textContent = `₹${{paperSavings.toLocaleString('en-IN')}}`;
  document.getElementById('annual-profit-disp').textContent = `₹${{annualProfit.toFixed(1)}} Lakhs`;
  document.getElementById('payback-days-disp').textContent = `${{paybackDays}} Days`;
}}
</script>
</body>
</html>
'''

# Write presentation.html
with open(r"c:\Users\nirma\Medi7\presentation.html", "w", encoding="utf-8") as f:
    f.write(html_content)

# Copy to demo-deploy
os.makedirs(r"c:\Users\nirma\Medi7\demo-deploy", exist_ok=True)
with open(r"c:\Users\nirma\Medi7\demo-deploy\presentation.html", "w", encoding="utf-8") as f:
    f.write(html_content)

print("Generated clean AI7 presentation HTML files.")

# Generate Widescreen 16:9 PDF using Chrome Headless
pdf_target = r"c:\Users\nirma\Medi7\MEDI7_by_AI7_Executive_Presentation.pdf"
pdf_alias = r"c:\Users\nirma\Medi7\Medi7_Presentation.pdf"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_url = r"file:///c:/Users/nirma/Medi7/presentation.html"

print("Compiling 16:9 Landscape PDF via Chrome headless...")
cmd = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_target}",
    html_url
]

res = subprocess.run(cmd, capture_output=True, text=True)
print(f"Chrome return code: {res.returncode}")

if os.path.exists(pdf_target):
    size_kb = os.path.getsize(pdf_target) / 1024
    print(f"Success! Generated: {pdf_target} ({size_kb:.1f} KB)")
    # Also copy to Medi7_Presentation.pdf
    import shutil
    shutil.copyfile(pdf_target, pdf_alias)
    print(f"Created alias: {pdf_alias}")
else:
    print(f"PDF creation failed or pending. Output: {res.stdout} {res.stderr}")
