import React from 'react';

// ─── Puzzle geometry: 400×300 viewport, cells meet at (200, 150)
// Tab/blank radius ≈ 25px, positioned at mid-point of each shared edge
//
// Piece 1 (top-left  · peach): tab → right edge, tab ↓ bottom edge
// Piece 2 (top-right · rust ): blank ← left edge, tab ↓ bottom edge
// Piece 3 (bot-left  · rust ): blank ↑ top edge,  tab → right edge
// Piece 4 (bot-right · peach): blank ↑ top edge,  blank ← left edge

const PEACH = '#DF9E80';
const RUST  = '#C44322';
const FONT  = "'Jost', 'Helvetica Neue', Arial, sans-serif";

// Shared bezier helpers — all tabs/blanks use the same curve so pieces interlock cleanly.
// Tab going RIGHT (piece 1 right, piece 3 right):
//   path segment FROM y_start TO y_end at x=200, tip at x=225
// Blank going LEFT (piece 2 left, piece 4 left — reversed tab):
//   same curve traced in reverse so it carves an exact mirror

const PIECES = [
  {
    // ── Piece 1: top-left (Content / Language) ──────────────────
    // Tab protrudes RIGHT at y=75; Tab protrudes DOWN at x=100
    d: [
      'M 0,0',
      'L 200,0',
      'L 200,55',
      'C 200,55 225,55 225,75',    // tab right: out
      'C 225,95 200,95 200,95',    // tab right: back
      'L 200,150',
      'L 120,150',
      'C 120,150 120,175 100,175', // tab down: out
      'C 80,175 80,150 80,150',    // tab down: back
      'L 0,150',
      'Z',
    ].join(' '),
    fill: PEACH,
    color: '#1c1c1c',
    title: 'Content',
    subs: ['Language'],
    tx: 24, ty: 34,
  },
  {
    // ── Piece 2: top-right (Context / System Elements) ──────────
    // Blank on LEFT at y=75 (fits piece 1's right tab); Tab DOWN at x=300
    d: [
      'M 200,0',
      'L 400,0',
      'L 400,150',
      'L 320,150',
      'C 320,150 320,175 300,175', // tab down: out
      'C 280,175 280,150 280,150', // tab down: back
      'L 200,150',
      'L 200,95',
      'C 200,95 225,95 225,75',    // blank left: carve (same curve as piece 1 tab, reversed)
      'C 225,55 200,55 200,55',    // blank left: return
      'L 200,0',
      'Z',
    ].join(' '),
    fill: RUST,
    color: '#ffffff',
    title: 'Context',
    subs: ['System Elements'],
    tx: 228, ty: 34,
  },
  {
    // ── Piece 3: bottom-left (Cultural Nuances / Qualitative Data)
    // Blank on TOP at x=100 (fits piece 1's bottom tab); Tab RIGHT at y=225
    d: [
      'M 0,150',
      'L 80,150',
      'C 80,150 80,175 100,175',   // blank top: carve (piece 1 bottom tab reversed)
      'C 120,175 120,150 120,150', // blank top: return
      'L 200,150',
      'L 200,205',
      'C 200,205 225,205 225,225', // tab right: out
      'C 225,245 200,245 200,245', // tab right: back
      'L 200,300',
      'L 0,300',
      'Z',
    ].join(' '),
    fill: RUST,
    color: '#ffffff',
    title: 'Cultural Nuances',
    subs: ['Qualitative Data'],
    tx: 20, ty: 248,
  },
  {
    // ── Piece 4: bottom-right (Tools) ───────────────────────────
    // Blank on TOP at x=300 (fits piece 2's bottom tab); Blank LEFT at y=225 (fits piece 3's right tab)
    d: [
      'M 200,150',
      'L 280,150',
      'C 280,150 280,175 300,175', // blank top: carve
      'C 320,175 320,150 320,150', // blank top: return
      'L 400,150',
      'L 400,300',
      'L 200,300',
      'L 200,245',
      'C 200,245 225,245 225,225', // blank left: carve (piece 3 right tab reversed)
      'C 225,205 200,205 200,205', // blank left: return
      'L 200,150',
      'Z',
    ].join(' '),
    fill: PEACH,
    color: '#1c1c1c',
    title: 'Tools',
    subs: ['For testing every part', 'of the design process'],
    tx: 228, ty: 248,
  },
];

export default function PuzzlePillars() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: '60px 24px',
        boxSizing: 'border-box',
      }}
    >
      <svg
        viewBox="-4 -4 408 308"
        style={{ width: '100%', maxWidth: 560, height: 'auto', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Pillars of International: Content, Context, Cultural Nuances, Tools"
      >
        {PIECES.map((p, i) => (
          <g key={i}>
            {/* stroke matches fill to seal any sub-pixel anti-aliasing gaps */}
            <path d={p.d} fill={p.fill} stroke={p.fill} strokeWidth="1.5" />

            <text
              x={p.tx}
              y={p.ty}
              fill={p.color}
              fontFamily={FONT}
              fontWeight="600"
              fontSize="17"
            >
              {p.title}
            </text>

            {p.subs.map((line, j) => (
              <text
                key={j}
                x={p.tx}
                y={p.ty + 20 + j * 19}
                fill={p.color}
                fontFamily={FONT}
                fontWeight="300"
                fontSize="14"
              >
                {line}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
