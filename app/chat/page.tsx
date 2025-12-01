'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePipeline } from '@/lib/hooks/use-pipeline';
import { cn } from '@/lib/utils';
import { Database } from '@/supabase/functions/_lib/database';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';

export default function ChatPage() {
  const supabase = createClientComponentClient<Database>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const generateEmbedding = usePipeline(
    'feature-extraction',
    'Supabase/gte-small'
  );

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
    });

  const isReady = !!generateEmbedding;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="max-w-4xl mx-auto flex flex-col w-full h-full px-4">
      {/* Header */}
      <div className="py-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-lg">Document Assistant</h1>
            <p className="text-xs text-gray-500">Ask questions about your uploaded files</p>
          </div>
          {!isReady && (
            <div className="ml-auto flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Loading AI...
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Start a Conversation</h2>
            <p className="text-gray-500 max-w-sm mb-6">
              Ask questions about your uploaded documents. I&apos;ll find relevant information and provide accurate answers.
            </p>
            <div className="grid gap-2 text-sm">
              <div className="bg-gray-50 rounded-lg px-4 py-2 text-gray-600">
                💡 &quot;What are the main topics covered?&quot;
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-2 text-gray-600">
                💡 &quot;Summarize the key points&quot;
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-2 text-gray-600">
                💡 &quot;Find information about...&quot;
              </div>
            </div>
          </div>
        )}

        {messages.map(({ id, role, content }) => (
          <div
            key={id}
            className={cn(
              'flex gap-3',
              role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            )}
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
                role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
            </div>
            {role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t bg-white py-4 sticky bottom-0">
        <form
          className="flex items-center gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!generateEmbedding || !input.trim()) return;

            const output = await generateEmbedding(input, {
              pooling: 'mean',
              normalize: true,
            });

            const embedding = JSON.stringify(Array.from(output.data));

            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (!session) return;

            handleSubmit(e, {
              options: {
                headers: {
                  authorization: `Bearer ${session.access_token}`,
                },
                body: {
                  embedding,
                },
              },
            });
          }}
        >
          <div className="flex-1 relative">
            <Input
              type="text"
              autoFocus
              placeholder={isReady ? "Ask a question about your documents..." : "Loading AI model..."}
              value={input}
              onChange={handleInputChange}
              disabled={!isReady}
              className="pr-12 py-6 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>
          <Button
            type="submit"
            disabled={!isReady || !input.trim()}
            className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </form>
      </div>
    </div>
  );
}
