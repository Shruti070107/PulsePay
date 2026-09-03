# PulsePay Design System

## Direction
PulsePay is a light, precise fintech operations console. Interfaces prioritize scanability, evidence, clear status, and bounded action over decoration.

## Tokens
- Canvas: `#F7F8FA`
- Surface: `#FFFFFF`
- Secondary surface: `#F1F5F9`
- Hover surface: `#F8FAFC`
- Primary text: `#0F172A`
- Secondary text: `#475569`
- Muted text: `#94A3B8`
- Border: `#E2E8F0`
- Brand/action blue: `#2563EB`; hover `#1D4ED8`
- Success: `#059669`
- Warning: `#D97706`
- Danger: `#DC2626`
- Info: `#0284C7`

No gradients, glow, neon, purple, indigo, violet, or decorative color. Color communicates action, safety, warning, or failure.

## Type
Inter is used for all ordinary UI text. IBM Plex Mono is reserved for payment IDs, transaction IDs, timestamps, and technical identifiers.

- Page title: 24px / 32px / 600
- Section heading: 16px / 24px / 600
- Body: 14px / 20px / 400
- Small: 13px / 18px / 400
- Labels: 12px / 16px / 500
- KPI: 24-28px / 32px / 600

## Layout
Use the spacing scale `4, 8, 12, 16, 24, 32, 40, 48, 64px`. Desktop page padding is 32px, tablet 24px, and mobile 16-20px. Major sections use 32px gaps.

## Shape and depth
Buttons and inputs use 6px corners, status tags 4px, panels and modals 8px. Default borders are `1px solid #E2E8F0`; shadows are rare and limited to `0 1px 3px rgba(15,23,42,0.06)`.

## Components
Use one clear primary CTA per view. Secondary actions are white with a border. Tables stay flush with their containing section. Avoid nested cards and decorative icons. Functional icons use Lucide.

## Safety language
Green means permitted or recovered, amber means attention, red means blocked, duplicate, or failed, and neutral means ordinary information. Always distinguish model outputs (probability, EV, ranking) from deterministic safety outputs (duplicate protection, retry budget, idempotency, permanent-decline and financial-viability gates).

## Product principle
`DETECT -> SCORE -> CALIBRATE -> OPTIMIZE -> PROTECT -> EXECUTE -> MEASURE`

All data is synthetic and all execution remains bounded and backend-controlled.
