import { useState, useRef, useEffect } from 'react';
import type { CompanionMessage } from '../types';
import { getCompanionResponse } from '../utils/companion';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface Props {
  currentPassage: string;
  onCompanionSpeak: (text: string) => void;
}

export function CompanionPanel({ currentPassage, onCompanionSpeak }: Props) {
  const [messages, setMessages] = useState<CompanionMessage[]>([
    {
      id: 'welcome',
      role: 'companion',
      text: "Hello! I'm your StoryCast reading companion. I can explain passages, tell you about characters, or discuss themes. Ask me anything about what you're reading — or tap the microphone to speak!",
      timestamp: 0,
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const addMessage = (role: 'user' | 'companion', text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, timestamp: Date.now() },
    ]);
  };

  const handleQuestion = (question: string) => {
    if (!question.trim()) return;
    addMessage('user', question);
    setInput('');
    setIsThinking(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const contextualQ = `${question} ${currentPassage}`.toLowerCase();
      const response = getCompanionResponse(contextualQ);
      addMessage('companion', response);
      onCompanionSpeak(response);
      setIsThinking(false);
    }, 800);
  };

  const { isListening, start: startListening } = useSpeechRecognition({
    onResult: (transcript) => handleQuestion(transcript),
    onError: (err) => {
      addMessage('companion', `Sorry, I couldn't hear that clearly (${err}). Please type your question instead.`);
    },
  });

  const handleExplainCurrent = () => {
    handleQuestion(`Can you explain this passage: "${currentPassage.slice(0, 120)}..."`);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-500 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
          🦉
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">Story Companion</p>
          <p className="text-purple-200 text-xs">Listens • Explains • Performs</p>
        </div>
        {isListening && (
          <div className="ml-auto flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-white text-xs">Listening…</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'companion' && (
              <span className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-sm shrink-0 mt-0.5 mr-1">
                🦉
              </span>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-500 text-white rounded-br-sm'
                  : 'bg-violet-50 text-slate-800 rounded-bl-sm border border-violet-100'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <span className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-sm shrink-0 mt-0.5 mr-1">
              🦉
            </span>
            <div className="bg-violet-50 border border-violet-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="px-3 pb-2">
        <button
          onClick={handleExplainCurrent}
          className="w-full text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded-lg py-1.5 transition-colors text-left px-2 font-medium"
        >
          💡 Explain the current passage
        </button>
      </div>

      {/* Input */}
      <div className="p-3 pt-0 flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuestion(input)}
            placeholder="Ask about the story…"
            className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
          />
        </div>

        {/* Microphone button */}
        <button
          onClick={startListening}
          disabled={isListening}
          title="Ask with your voice"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Send button */}
        <button
          onClick={() => handleQuestion(input)}
          disabled={!input.trim()}
          title="Send"
          className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 disabled:opacity-30 transition-all shrink-0"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
