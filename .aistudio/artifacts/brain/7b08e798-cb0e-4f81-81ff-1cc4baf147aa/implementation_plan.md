# Khan G AI — Khan G Tools Unified AI Tool Ecosystem (Revised)

A revised architectural blueprint and tool taxonomy to turn Khan G AI into the intelligent AI control center for the Khan G Tools platform, strictly grounded in the **Khan G Tools Integration Brief** (`khan-g-tools-brief.md`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Key revisions based on the Khan G Tools brief and user instructions:
> 1. **Phase 1 Implementation Boundary**: Implement **Phase 1 only first** (Unified Tool Registry + Hybrid Autonomous Workflow Runner + the verified 21 native engines). Stop and provide an audit report before proceeding to Phase 2.
> 2. **Complete ~100 Tools Taxonomy**: Every single tool from `scripts/tools-catalog.js` is mapped to one of three operational states:
>    - **Existing Server API / Verified Engine**: Reused directly via Express routers or native Node.js engines.
>    - **Port from Shared Engines (`scripts/engines/`)**: Replaces client-only DOM hooks with secure server adapters using ported engine algorithms (e.g. Passport Photo, Photo Sheet, QR Generator, Invoicing).
>    - **Marked "Not Yet AI-Callable"**: Transparently documented with explicit reason codes (e.g. interactive screen pickers, live WYSIWYG editors, hand-drawing canvas, or admin routes).
> 3. **Security, Secrets & Admin Isolation**:
>    - Admin routes (`/api/admin/*`, `middleware/adminAuth.js`) are strictly forbidden from AI registry exposure.
>    - Environment variable names (`ADMIN_KEY`, `SESSION_SECRET`, `REMOVE_BG_API_KEY`, `MONGODB_URI`, etc.) and values are strictly isolated and never sent to LLMs or client responses.
>    - All executions enforce `middleware/usageLimits.js` (Free vs Pro daily quotas based on user token or IP).

---

## 1. Baseline Architecture & Codebase Map

### 1.1 Existing Khan G AI Foundation
- **Conversational Engine**: `server/lib/aiProvider.ts` with multi-model provider abstraction (Gemini 3.8 Flash, Groq Llama-3.3-70B, OpenRouter, Mistral, DeepSeek, and rule-based intent fallback).
- **Backend**: Express 4 server on port 3000 (`server.ts`) with Multer memory buffer uploads and 60-minute TTL file cache in `.tmp_storage/`.
- **Database & Persistence**: Persistent Firestore store for chat sessions, messages, and user subscription records.
- **Middleware**: IP/User rate limiting, total upload payload inspection, and token validation.

### 1.2 Integration with Khan G Tools
- Khan G Tools contains ~100 tools cataloged in `scripts/tools-catalog.js`.
- The majority of tools are browser-side HTML/JS apps in `public/tools/<tool-id>/`.
- Server APIs that really exist:
  - `POST /api/pdf/analyze`, `GET /api/pdf/status`
  - `POST /api/ocr/parse`, `/extract`
  - `POST /api/background-remover/remove`
  - `POST /api/inkling/write`, `/code-review`, `/seo-generator`, `/summarize`
  - `POST /api/expenses`, `/budget`, `/summary`
  - `POST /api/card/cards`, `GET /api/card/cards/:slug`
  - `POST /api/countdown/countdowns`

---

## 2. Centralized Tool Registry Architecture & ~100 Tool Taxonomy

The Registry (`server/tools/registry.ts`) serves as the single source of truth for AI tool routing. Each tool definition contains:
- `id` (exact slug from `scripts/tools-catalog.js`)
- `name` and `category` (10 initial categories)
- `description` and `supportedIntents`
- `parameters` (standardized JSON schema)
- `requiresUpload` (boolean)
- `chainable` (boolean)
- `isAiCallable` (boolean)
- `status` (`'verified'` | `'ported_engine'` | `'not_yet_callable'`)
- `unavailableReason` (present when `isAiCallable === false`)
- `handler` (server function executing real logic)

### Complete Taxonomy Mapping (~100 Tools)

#### Category 1: PDF Tools (17 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `pdf-merger` | **Verified** | pdf-lib page concatenation | Fully functional |
| `pdf-splitter` | **Verified** | pdf-lib page extraction | Fully functional |
| `pdf-compressor` | **Verified** | pdf-lib object stream optimizer | Fully functional |
| `pdf-to-word` | **Verified** | pdf-parse + docx paragraphs | Fully functional |
| `word-to-pdf` | **Verified** | docx parser + pdf-lib rendering | Fully functional |
| `image-to-pdf` | **Verified** | pdf-lib image embedder | Fully functional |
| `jpg-to-pdf` | **Verified** | Reuses `image-to-pdf` engine | Fully functional |
| `pdf-text-extractor` | **Verified** | pdf-parse text stream extractor | Fully functional |
| `pdf-nup-maker` | **Ported (Phase 1)** | Port `scripts/engines/pdf-engines.js` (2-up/4-up A4 layout) | Engine port |
| `print-layout-maker`| **Ported (Phase 1)** | Port `scripts/engines/pdf-engines.js` (printable margins & crop marks) | Engine port |
| `pdf-page-reorder` | **Ported (Phase 1)** | Port `scripts/engines/pdf-engines.js` (page sequence shuffle) | Engine port |
| `pdf-page-delete` | **Ported (Phase 1)** | Port `scripts/engines/pdf-engines.js` (page omission filter) | Engine port |
| `pdf-rotate` | **Ported (Phase 1)** | Port `scripts/engines/pdf-engines.js` (90°/180° page rotation) | Engine port |
| `pdf-extract-pages` | **Ported (Phase 1)** | Reuses `pdf-splitter` page range selector | Fully functional |
| `pdf-watermark` | **Ported (Phase 1)** | Port `scripts/engines/pdf-engines.js` (diagonal opacity text overlay) | Engine port |
| `pdf-booklet-maker` | **Ported (Phase 2)** | Requires duplex folding imposition math | Queued for Phase 2 |
| `pdf-lock-unlock` | **Not Callable** | Requires native crypto / qpdf binaries | Server environment lacks qpdf binary |
| `pdf-metadata-editor`| **Ported (Phase 2)** | Port pdf-lib document info modifier | Queued for Phase 2 |
| `pdf-repair` | **Not Callable** | Corrupt PDF recovery requires Ghostscript | Binary dependency unavailable |
| `pdf-to-image` / `pdf-to-jpg` / `pdf-to-png` | **Ported (Phase 2)** | Requires pdf2pic / poppler pdftoppm | Multi-page render adapter needed |

#### Category 2: Image Tools (17 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `image-resizer` | **Verified** | Sharp pixel / percentage resizer | Fully functional |
| `image-compressor` | **Verified** | Sharp iterative quality & KB compressor | Fully functional |
| `image-converter` | **Verified** | Sharp to WebP, PNG, JPG, AVIF | Fully functional |
| `jpg-to-png` | **Verified** | Reuses `image-converter` | Fully functional |
| `png-to-jpg` | **Verified** | Reuses `image-converter` | Fully functional |
| `webp-converter` | **Verified** | Reuses `image-converter` | Fully functional |
| `grayscale-converter` | **Verified** | Sharp `.grayscale()` pipeline | Fully functional |
| `image-rotator` | **Verified** | Sharp `.rotate(angle)` | Fully functional |
| `image-flipper` | **Verified** | Sharp `.flip()` / `.flop()` | Fully functional |
| `image-cropper` | **Verified** | Sharp `.extract({ left, top, width, height })` | Fully functional |
| `passport-photo-maker`| **Ported (Phase 1)** | Port `scripts/engines/image-engines.js` (2×2 / 35×45mm framing) | Engine port |
| `photo-sheet-maker` | **Ported (Phase 1)** | Port `scripts/engines/image-engines.js` (A4 multi-photo grid) | Engine port |
| `brightness-contrast` | **Ported (Phase 1)** | Sharp `.modulate({ brightness })` + `.linear()` | Engine port |
| `image-sharpen` | **Ported (Phase 1)** | Sharp `.sharpen()` | Engine port |
| `image-metadata-remover`| **Ported (Phase 1)**| Sharp stripped EXIF save | Engine port |
| `image-color-extractor`| **Ported (Phase 2)** | Color quantization / dominant palette | Queued for Phase 2 |
| `background-remover` | **Existing API** | Reuses `/api/background-remover/remove` if key exists | Needs `REMOVE_BG_API_KEY` |
| `background-blur` / `background-changer` | **Not Callable** | Requires ML segmentation model or external API | API key / weights not loaded |
| `image-upscaler` | **Not Callable** | Requires super-resolution neural weights (Real-ESRGAN)| GPU/Heavy model required |
| `dpi-checker` | **Ported (Phase 1)** | Sharp metadata density inspection | Engine port |
| `favicon-generator` | **Ported (Phase 1)** | Multi-size Sharp resizing (16, 32, 48, 64) to ZIP | Engine port |
| `photo-collage-maker`| **Ported (Phase 2)** | Multi-slot canvas composite | Queued for Phase 2 |
| `meme-maker` | **Ported (Phase 2)** | Text composite over image | Queued for Phase 2 |

#### Category 3: OCR (3 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `document-ocr` | **Verified** | Gemini multimodal vision / `/api/ocr/parse` | Fully functional |
| `pdf-ocr` | **Verified** | PDF rasterization + Gemini vision OCR | Fully functional |
| `extract-text-ocr` | **Verified** | Server OCR service (`ocrService.ts`) | Fully functional |

#### Category 4: Print & Photocopy Tools (3 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `print-photocopy` | **Ported (Phase 1)** | High-contrast B&W threshold filter via Sharp | Engine port |
| `photo-sheet-maker` | **Ported (Phase 1)** | Arranging 4/6/8 passport photos on A4 sheet | Engine port |
| `print-layout-maker`| **Ported (Phase 1)** | Document padding, cut marks, and print formatting | Engine port |

#### Category 5: Business Tools (8 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `invoice-maker` | **Ported (Phase 1)** | Port `scripts/engines/biz-engines.js` (PDF invoice generator) | Engine port |
| `receipt-maker` | **Ported (Phase 1)** | Port `scripts/engines/biz-engines.js` (Thermal/A4 receipt PDF) | Engine port |
| `quotation-maker` | **Ported (Phase 1)** | Port `scripts/engines/biz-engines.js` (Formal quote PDF) | Engine port |
| `purchase-order-maker`| **Ported (Phase 1)**| Port `scripts/engines/biz-engines.js` (PO document generator) | Engine port |
| `expense-tracker` | **Existing API** | Connects to `/api/expenses` Express router | Existing Server API |
| `gst-tax-calculator`| **Ported (Phase 1)** | Deterministic mathematical calculation | Engine port |
| `profit-margin-calculator`| **Ported (Phase 1)**| Deterministic mathematical calculation | Engine port |
| `discount-calculator`| **Ported (Phase 1)**| Deterministic mathematical calculation | Engine port |
| `digital-business-card`| **Existing API** | Connects to `/api/card/cards` | Existing Server API |

#### Category 6: Productivity & Math Tools (10 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `word-counter` | **Ported (Phase 1)** | Statistical text & document metrics | Engine port |
| `character-counter` | **Ported (Phase 1)** | Exact string character analysis | Engine port |
| `age-calculator` | **Ported (Phase 1)** | Deterministic date difference calculation | Engine port |
| `date-calculator` | **Ported (Phase 1)** | Calendar day additions & workdays | Engine port |
| `percentage-calculator`| **Ported (Phase 1)**| Mathematical percentage solver | Engine port |
| `unit-converter` | **Ported (Phase 1)** | Metric/Imperial conversion matrix | Engine port |
| `currency-converter`| **Not Callable** | Requires live forex API feed | Live rates feed not configured |
| `countdown-maker` | **Existing API** | Connects to `/api/countdown/countdowns` | Existing Server API |
| `booking-manager` | **Existing API** | Connects to `/api/booking/bookings` (User-facing) | Existing Server API |
| `study-hub` | **Verified** | Khan G AI Academic Revision Engine | Fully functional |

#### Category 7: AI Writing & Text Tools (12 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `ai-text-summarizer`| **Verified** | Gemini / Groq summarization engine | Fully functional |
| `ai-writing-assistant`| **Verified**| Gemini / Groq essay & report generator | Fully functional |
| `inkling` | **Existing API** | Connects to `/api/inkling/write` | Existing Server API |
| `text-cleaner` | **Ported (Phase 1)** | Port `scripts/engines/dev-engines.js` (whitespace, accents)| Engine port |
| `duplicate-line-remover`| **Ported (Phase 1)**| Deduplication algorithm | Engine port |
| `case-converter` | **Ported (Phase 1)** | upper, lower, title, camel, snake, kebab | Engine port |
| `sort-lines` | **Ported (Phase 1)** | Alphabetical, numerical, length sorting | Engine port |
| `text-formatter` | **Ported (Phase 1)** | Markdown / prose alignment | Engine port |
| `text-to-slug` | **Ported (Phase 1)** | URL slug generation | Engine port |
| `lorem-ipsum-generator`| **Ported (Phase 1)**| Dummy text generator | Engine port |
| `markdown-to-html` | **Ported (Phase 1)** | Markdown AST parser | Engine port |
| `html-to-markdown` | **Ported (Phase 1)** | HTML DOM to Markdown converter | Engine port |
| `markdown-editor` | **Not Callable** | Interactive WYSIWYG editor UI | Client-side interface only |

#### Category 8: Security & Dev Tools (10 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `zip-files` | **Verified** | AdmZip archive packing | Fully functional |
| `unzip-file` | **Verified** | AdmZip extraction with Zip Slip protection | Fully functional |
| `password-generator`| **Ported (Phase 1)**| Cryptographically secure string generation | Engine port |
| `password-strength-checker`| **Ported (Phase 1)**| Entropy score analysis | Engine port |
| `hash-generator` | **Ported (Phase 1)** | Node crypto (MD5, SHA1, SHA256, SHA512) | Engine port |
| `base64-converter` | **Ported (Phase 1)** | Buffer encode/decode | Engine port |
| `uuid-generator` | **Ported (Phase 1)** | Crypto `randomUUID()` | Engine port |
| `url-encoder-decoder`| **Ported (Phase 1)**| `encodeURIComponent` / `decodeURIComponent` | Engine port |
| `text-encrypt-decrypt`| **Ported (Phase 1)**| AES-256-GCM cipher pipeline | Engine port |
| `admin-telemetry` | **Not Callable** | Restricted to server admin console | Never exposed to AI |

#### Category 9: Document & Data Tools (8 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `calculate-excel-data`| **Verified**| ExcelJS statistical & formula processor | Fully functional |
| `convert-csv-to-excel`| **Verified**| ExcelJS CSV to XLSX | Fully functional |
| `convert-excel-to-csv`| **Verified**| ExcelJS XLSX to CSV | Fully functional |
| `text-or-csv-to-excel`| **Verified**| ExcelJS structured table import | Fully functional |
| `csv-to-json` | **Ported (Phase 1)** | Fast CSV parser to JSON | Engine port |
| `json-to-csv` | **Ported (Phase 1)** | JSON object array to CSV | Engine port |
| `json-formatter` | **Ported (Phase 1)** | JSON parse + beautifier/minifier | Engine port |
| `json-validator` | **Ported (Phase 1)** | JSON syntax error detector | Engine port |
| `xml-formatter` | **Ported (Phase 1)** | XML DOM beautifier | Engine port |

#### Category 10: Utility & Browser-Only Tools (8 Tools)
| Tool ID | Status | Execution Strategy / Port Source | Reason (if not callable) |
| :--- | :--- | :--- | :--- |
| `qr-code-generator`| **Ported (Phase 1)** | Real SVG/PNG QR matrix renderer | Engine port |
| `barcode-generator`| **Ported (Phase 1)** | Code128 / EAN13 barcode generator | Engine port |
| `color-picker` | **Not Callable** | Interactive eyedropper & screen magnifier | Browser UI only |
| `color-tools` | **Not Callable** | Interactive color wheel / contrast tester | Browser UI only |
| `signature-maker` | **Not Callable** | Interactive gesture-drawing canvas | User hand-drawing only |
| `screenshot-stitcher`| **Not Callable**| Manual image alignment canvas | Client-side visual tool |
| `random-number-generator`| **Ported (Phase 1)**| Crypto RNG | Engine port |
| `username-generator`| **Ported (Phase 1)**| Lexical username generator | Engine port |
| `timezone-converter`| **Ported (Phase 1)**| Intl date/time engine | Engine port |

---

## 3. Workflow Chaining Engine (`server/services/workflowRunner.ts`)

A dedicated pipeline runner enabling multi-step workflows with real intermediate buffer passing:

```
[User Request: "Crop this to passport size and put 6 on an A4 sheet in PDF"]
                              │
                              ▼
                   [Intent Analyzer & Planner]
     Identifies: passport-photo-maker ──> photo-sheet-maker ──> image-to-pdf
                              │
                              ▼
           [Single Workflow Approval Gate in Chat UI]
           "Approve Plan: 3 Steps (Estimated Time: 1.2s)"
                              │ (User clicks "Approve & Run")
                              ▼
                [WorkflowRunner Execution]
   Step 1: passport-photo-maker ──(Buffer 1)──> Status: Done
   Step 2: photo-sheet-maker    ──(Buffer 2)──> Status: Done
   Step 3: image-to-pdf         ──(Buffer 3)──> Status: Done
                              │
                              ▼
                [Dedicated Tool Card in Chat]
   - Shows: Step 1 (310ms), Step 2 (450ms), Step 3 (380ms)
   - Real Download Action: "passport_sheet_6up.pdf" (1.8 MB)
   - Contextual Suggestion: "Need to print? I can adjust print margins."
```

### Safety & Error Recovery Rules:
- **Zero Fabrication**: If Step 2 fails, Step 3 never executes. The error from Step 2 is returned truthfully.
- **Intermediate Storage**: Intermediate buffers are processed in memory and only the final artifact (or user-requested intermediate checkpoints) are saved with TTL.
- **Quota Tracking**: Each tool executed calls `checkLimit` / `recordUsage` under `services/usageService.ts`.

---

## 4. Phase 1 Implementation Scope (Strictly Enforced)

In accordance with user instructions, **Phase 1 ONLY** will be executed first:

1. **`server/tools/registry.ts`**:
   - Central Registry containing all ~100 tools defined with metadata, categories, and AI-callability flags.
   - 21 Verified native engines connected and active.
   - Core ported engines for workflows: `passport-photo-maker`, `photo-sheet-maker`, `print-layout-maker`, `qr-code-generator`, `invoice-maker`, `word-counter`.
   - Remaining tools cataloged with explicit reasons if not callable.
2. **`server/services/workflowRunner.ts`**:
   - Multi-step sequential pipeline with buffer piping.
   - Single confirmation gate for multi-step tasks.
   - Quota checks per step.
3. **`src/components/ToolExecutionCard.tsx`**:
   - Clean, zero-pill UI card matching the Khan G AI design system.
   - Real status indicators: `Queued`, `Running`, `Done`, `Failed`.
   - Live step-by-step progress lines.
   - Download & preview buttons shown only when files are on disk.
4. **Verification & Audit Report**:
   - Verification tests for single tools and chained workflows.
   - Detailed status report of connected tools vs pending Phase 2 tools.
   - **STOP for user review before starting Phase 2.**

---

## 5. Verification Plan

1. **Single Tool Executions**:
   - Test `image-resizer` (Sharp) with 600×400px.
   - Test `passport-photo-maker` verifying 2×2 inch 300 DPI crop.
   - Test `qr-code-generator` verifying valid QR SVG/PNG.
   - Test `word-counter` on a multi-paragraph sample.
2. **Multi-Tool Workflow Execution**:
   - Upload sample photo $\rightarrow$ Chained execution: `passport-photo-maker` $\rightarrow$ `photo-sheet-maker` $\rightarrow$ `image-to-pdf`.
   - Verify workflow confirmation UI appears before execution.
   - Verify all 3 steps execute in sequence with real buffer passing.
   - Verify downloaded PDF contains the 6-up passport layout on A4.
3. **Security Invariant Verification**:
   - Ensure `ADMIN_KEY` and environment secrets are never in AI prompts or client payloads.
   - Verify rate limiting and quota enforcement prevent unauthorized executions.
   - Verify non-callable tools return a truthful, clean explanation instead of failing silently.
4. **Compile & Lint**:
   - `npm run build` and `npm run lint` (`tsc --noEmit`) passing with 0 errors.
