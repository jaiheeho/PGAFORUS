'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, LoadingSpinner, Button } from '@/components/ui';
import { Brain, RefreshCw, AlertCircle, MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface TournamentAISummaryProps {
  tournamentName?: string;
  onSummaryGenerated?: (summary: string) => void;
}

interface SummaryData {
  summary: string;
  tournamentData: {
    name: string;
    status: string;
    round: string;
    lastUpdated: string;
  };
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function TournamentAISummary({ tournamentName, onSummaryGenerated }: TournamentAISummaryProps) {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSummary = async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/tournament-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          type: 'summary',
          forceRefresh 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tournament summary');
      }

      const data = await response.json();
      setSummaryData(data);
      setHasInitialLoad(true);
      onSummaryGenerated?.(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Remove automatic fetching on mount
  useEffect(() => {
    // Only auto-load if we haven't loaded before and component is mounted
    if (!hasInitialLoad && !summaryData) {
      fetchSummary(false);
    }
  }, [hasInitialLoad, summaryData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleRefresh = () => {
    fetchSummary(true); // Force refresh when user clicks refresh
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/tournament-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'chat',
          message: inputMessage,
          context: { summary: summaryData?.summary }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "Who are the favorites to win?",
    "What's the weather like?",
    "Any notable performances?",
    "What should I watch for?"
  ];

  // Show initial load state only for first load
  if (isLoading && !hasInitialLoad) {
    return (
      <Card className="mb-4">
        <CardContent className="py-6">
          <div className="flex items-center justify-center space-x-3">
            <LoadingSpinner className="w-5 h-5" />
            <span className="text-gray-600">Loading AI tournament summary...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && !summaryData) {
    return (
      <Card className="mb-4 border-red-200">
        <CardContent className="py-6">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load summary: {error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchSummary(false)}
              className="ml-auto"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state with load button
  if (!summaryData && !isLoading) {
    return (
      <Card className="mb-4 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mx-auto shadow-sm">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">AI Tournament Analysis</h3>
              <p className="text-sm text-blue-700 mb-4">
                Get AI-powered insights and analysis for {tournamentName || 'the current tournament'}
              </p>
              <Button 
                onClick={() => fetchSummary(false)}
                className="bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoading}
              >
                <Brain className="w-4 h-4 mr-2" />
                {isLoading ? 'Generating...' : 'Generate AI Summary'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardContent className="py-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">AI Tournament Analysis</h3>
                <p className="text-sm text-blue-700">
                  {summaryData?.tournamentData.name} • {summaryData?.tournamentData.status} • Round {summaryData?.tournamentData.round}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleChatToggle}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                disabled={!summaryData}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {isChatOpen ? 'Hide' : 'Chat'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* AI Summary with Beautiful Markdown Rendering */}
          {summaryData && (
            <div className="bg-white rounded-lg p-5 shadow-sm border border-blue-100">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-gray-800 mb-3 mt-5 flex items-center">
                        <span className="w-1 h-6 bg-blue-500 rounded-full mr-3"></span>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-md font-medium text-gray-800 mb-2 mt-4">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 mb-3 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-none ml-0 mb-4 space-y-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal ml-5 mb-4 space-y-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700 leading-relaxed flex items-start">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span>{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900 bg-yellow-100 px-1 rounded">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-blue-700 font-medium">
                        {children}
                      </em>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 my-4 bg-blue-50 py-2 rounded-r">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                        {children}
                      </code>
                    ),
                    hr: () => (
                      <hr className="border-gray-200 my-6" />
                    ),
                  }}
                >
                  {summaryData.summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Chat Interface */}
          {isChatOpen && summaryData && (
            <div className="bg-white rounded-lg shadow-sm border border-blue-100">
              <div className="p-4 border-b border-blue-100">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2 text-blue-600" />
                  Ask AI About Tournament
                </h4>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {/* Messages */}
                  <div className="max-h-80 overflow-y-auto space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-500 py-6">
                        <Bot className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium mb-3">Ask me anything about the tournament!</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {suggestedQuestions.map((question, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => setInputMessage(question)}
                              className="text-xs hover:bg-blue-50 hover:border-blue-300"
                            >
                              {question}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex space-x-3 ${
                          message.type === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.type === 'ai' && (
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        <div
                          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                            message.type === 'user'
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                              : 'bg-gray-50 text-gray-800 border border-gray-200'
                          }`}
                        >
                          {message.type === 'ai' ? (
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => (
                                    <p className="text-gray-700 mb-1 leading-relaxed last:mb-0">
                                      {children}
                                    </p>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-gray-900">
                                      {children}
                                    </strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="italic text-blue-700">
                                      {children}
                                    </em>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-none ml-0 mb-1 space-y-1">
                                      {children}
                                    </ul>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-gray-700 leading-relaxed flex items-start">
                                      <span className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                      <span>{children}</span>
                                    </li>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <span>{message.content}</span>
                          )}
                          <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {message.type === 'user' && (
                          <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isChatLoading && (
                      <div className="flex space-x-3 justify-start">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="flex space-x-2 pt-2 border-t border-gray-200">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about the tournament..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm bg-white text-black placeholder-gray-500"
                      disabled={isChatLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isChatLoading}
                      size="sm"
                      className="bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timestamp */}
          {summaryData && (
            <div className="text-xs text-blue-600 border-t border-blue-200 pt-3">
              <div className="flex items-center justify-between">
                <span>Generated: {new Date(summaryData.tournamentData.lastUpdated).toLocaleString()}</span>
                <span className="text-blue-500 flex items-center">
                  <Brain className="w-3 h-3 mr-1" />
                  Powered by GPT-4o
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 