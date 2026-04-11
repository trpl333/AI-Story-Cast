import { useState } from 'react';
import type { Book } from './types';
import { books } from './data/books';
import { LandingPage } from './components/LandingPage';
import { ReadingView } from './components/ReadingView';

export default function App() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  if (selectedBook) {
    return <ReadingView book={selectedBook} onClose={() => setSelectedBook(null)} />;
  }

  return <LandingPage books={books} onSelectBook={setSelectedBook} />;
}
