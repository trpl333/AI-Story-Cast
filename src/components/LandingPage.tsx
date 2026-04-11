import type { Book } from '../types';
import { BookShelf } from './BookShelf';

interface Props {
  books: Book[];
  onSelectBook: (book: Book) => void;
}

export function LandingPage({ books, onSelectBook }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute top-20 right-0 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-full h-48 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
          {/* Logo mark */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 mb-8 text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-slate-300">Reading Reimagined</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 font-serif">
            Story
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Cast
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-4">
            Not just replayed.{' '}
            <span className="text-white font-medium">Not just replayed.</span>
          </p>

          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Audiobooks are passive. E-books are lonely.{' '}
            <span className="text-amber-400 font-medium">StoryCast</span> is something new — a reading
            companion that{' '}
            <span className="text-violet-400 font-medium">listens</span>,{' '}
            <span className="text-blue-400 font-medium">explains</span>, and{' '}
            <span className="text-emerald-400 font-medium">performs</span> alongside you.
          </p>

          <button
            onClick={() => {
              const shelf = document.getElementById('bookshelf');
              shelf?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-full text-lg shadow-2xl shadow-amber-500/20 transition-all hover:scale-105"
          >
            Start Reading
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </section>

      {/* Feature pillars */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: '🎭',
              title: 'Performs',
              color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
              textColor: 'text-emerald-400',
              description:
                'Every character speaks in their own unique voice. Dialogue comes alive with distinct tones, pace, and personality.',
            },
            {
              icon: '💡',
              title: 'Explains',
              color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
              textColor: 'text-blue-400',
              description:
                'Your AI reading companion is always ready to illuminate passages, decode literary devices, and reveal hidden meaning.',
            },
            {
              icon: '🎤',
              title: 'Listens',
              color: 'from-violet-500/20 to-violet-600/10 border-violet-500/20',
              textColor: 'text-violet-400',
              description:
                'Ask questions out loud. Your companion hears you and responds conversationally — just like a reading friend.',
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className={`bg-gradient-to-br ${feat.color} border rounded-2xl p-6`}
            >
              <div className="text-4xl mb-3">{feat.icon}</div>
              <h3 className={`text-xl font-bold mb-2 ${feat.textColor}`}>{feat.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bookshelf */}
      <section id="bookshelf" className="max-w-5xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white font-serif">Classic Library</h2>
          <p className="text-slate-400 mt-1">Public-domain masterpieces, reimagined for a new kind of reading.</p>
        </div>
        <BookShelf books={books} onSelect={onSelectBook} />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-slate-500 text-sm">
        <p>StoryCast — Reading reimagined. Not just replayed.</p>
      </footer>
    </div>
  );
}
