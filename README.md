# StoryCast — Reading Reimagined

> Audiobooks are passive. E-books are lonely. **StoryCast** is something new — a reading companion that **listens**, **explains**, and **performs** alongside you.

## Features

- **🎭 Performs** — Every character speaks in their own unique voice using the Web Speech API. Dialogue comes alive with distinct pitch, pace, and personality.
- **💡 Explains** — Your AI reading companion illuminates passages, decodes literary devices, and answers questions about themes and characters.
- **🎤 Listens** — Ask questions out loud using your microphone; the companion hears you and responds conversationally.
- **📖 Synced Text** — The currently narrated paragraph is highlighted as you follow along.
- **⚡ Speed Control** — Read at your own pace (0.75× – 1.75×).
- **📚 Classic Library** — Start with _Alice's Adventures in Wonderland_ (public domain), with more titles to come.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS v3 |
| Narration | Web Speech API (`SpeechSynthesis`) |
| Voice Input | Web Speech API (`SpeechRecognition`) |
| AI Companion | Keyword-based response engine (extensible to LLM API) |

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

## Browser Support

Speech synthesis and recognition work best in **Chrome** and **Edge**. Firefox supports synthesis but not recognition. Safari has partial support.
