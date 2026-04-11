import type { Book } from '../types';

interface Props {
  books: Book[];
  onSelect: (book: Book) => void;
}

export function BookShelf({ books, onSelect }: Props) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <button
            key={book.id}
            onClick={() => onSelect(book)}
            className="text-left group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
          >
            {/* Cover */}
            <div className={`h-40 bg-gradient-to-br ${book.coverGradient} flex items-end p-4 relative overflow-hidden`}>
              {/* Decorative circles */}
              <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute top-10 right-10 w-10 h-10 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-black/10" />
              <div className="relative">
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest">{book.author}</p>
                <h2 className="text-white font-bold text-lg leading-tight mt-0.5 font-serif">{book.title}</h2>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{book.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-1">
                  {book.characters.slice(0, 4).map((c) => (
                    <span
                      key={c.name}
                      title={c.name}
                      className={`w-6 h-6 rounded-full border-2 border-white ${c.color} flex items-center justify-center text-[9px] font-bold text-white`}
                    >
                      {c.name[0]}
                    </span>
                  ))}
                  {book.characters.length > 4 && (
                    <span className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] text-slate-600 font-bold">
                      +{book.characters.length - 4}
                    </span>
                  )}
                </div>
                <span className="text-xs text-amber-600 font-semibold group-hover:text-amber-700 flex items-center gap-1">
                  Read now
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
