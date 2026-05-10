/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Sparkles, 
  Image as ImageIcon, 
  User, 
  Bot, 
  Loader2, 
  Trash2, 
  Maximize2,
  X
} from "lucide-react";

// --- Types ---
type MessageRole = 'user' | 'assistant';
type MessageType = 'text' | 'image';

interface Message {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  prompt?: string; // Original prompt for images
  timestamp: Date;
}

// --- Constants ---
const SYSTEM_PROMPT = `You are Lumina, a helpful and creative AI assistant. 
Your tone is sophisticated, clear, and slightly poetic. 
You can help with questions, brainstorming, and visualizing ideas.
If asked to visualize something or create an image, acknowledge the request gracefully.`;

const IMAGE_MODEL = "gemini-2.5-flash-image";
const TEXT_MODEL = "gemini-3-flash-preview";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  // Initialize AI
  useEffect(() => {
    if (!aiRef.current && process.env.GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (forcedType?: MessageType) => {
    if (!input.trim() || isLoading || !aiRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: 'text',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const isImageRequest = forcedType === 'image' || 
      input.toLowerCase().includes('generate an image') || 
      input.toLowerCase().includes('visualize') ||
      input.toLowerCase().includes('create a picture');

    try {
      if (isImageRequest) {
        setIsGeneratingImage(true);
        const response = await aiRef.current.models.generateContent({
          model: IMAGE_MODEL,
          contents: { parts: [{ text: input }] },
          config: {
            imageConfig: { aspectRatio: "1:1" }
          }
        });

        let imageUrl = '';
        let assistantText = '';

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          } else if (part.text) {
            assistantText += part.text;
          }
        }

        if (imageUrl) {
          const imageMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            type: 'image',
            content: imageUrl,
            prompt: input,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, imageMsg]);
        } else if (assistantText) {
          const textMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            type: 'text',
            content: assistantText,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, textMsg]);
        }
      } else {
        // Text conversation
        const history = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

        const response = await aiRef.current.models.generateContent({
          model: TEXT_MODEL,
          contents: [
            ...history,
            { role: 'user', parts: [{ text: input }] }
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
          }
        });

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          type: 'text',
          content: response.text || "I'm sorry, I couldn't generate a response.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        type: 'text',
        content: "I encountered an error while processing your request. Please ensure your API key is configured correctly.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-lumina-primary/20 blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-lumina-secondary/20 blur-[120px] animate-float" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-lumina-accent/10 blur-[100px] animate-pulse" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl h-[90vh] flex flex-col mx-4 glass-panel rounded-3xl overflow-hidden">
        
        {/* Header */}
        <header className="px-8 py-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-lumina-primary to-lumina-secondary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-medium tracking-tight">Lumina</h1>
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-widest">Creative Assistant</span>
            </div>
          </div>
          <button 
            onClick={clearChat}
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </header>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-8 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
              <div className="space-y-4 opacity-60">
                <Bot className="w-12 h-12 text-lumina-primary mx-auto" />
                <div className="max-w-xs mx-auto">
                  <p className="text-lg font-display text-white">How can I assist you today?</p>
                  <p className="text-sm text-zinc-400 mt-2">
                    Ask me questions, brainstorm ideas, or ask me to visualize something for you.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl w-full">
                {[
                  "Help me write a creative poem about a digital star.",
                  "Visualize a steampunk library in 4K.",
                  "Explain how large language models work in' a simple way.",
                  "Create a picture of a futuristic garden in the sky."
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-left transition-all text-sm text-zinc-300 hover:text-white group"
                  >
                    <span className="opacity-50 group-hover:opacity-100 transition-opacity">✨ {prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-white/10' : 'bg-lumina-primary/20'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-lumina-primary" />}
                </div>
                
                <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-zinc-100 text-zinc-900 rounded-tr-none' 
                      : 'bg-white/5 text-zinc-100 border border-white/5 rounded-tl-none'
                  }`}>
                    {msg.type === 'text' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="relative group">
                        <img 
                          src={msg.content} 
                          alt={msg.prompt} 
                          className="rounded-xl w-full aspect-square object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImage(msg.content)}
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => setPreviewImage(msg.content)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        {msg.prompt && (
                          <div className="mt-4 p-3 bg-black/20 rounded-lg text-xs italic text-zinc-400 text-left border-l-2 border-lumina-primary">
                            Visualizing: {msg.prompt}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-lumina-primary/20 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-lumina-primary animate-spin" />
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1.5 items-center py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-zinc-400 ml-2 font-display">
                    {isGeneratingImage ? "Visualizing your idea..." : "Lumina is thinking..."}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 pt-4 border-t border-white/5">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything... (or ask me to visualize something)"
              className="w-full glass-input rounded-2xl py-4 pl-6 pr-24 resize-none min-h-[64px] max-h-32 text-sm"
              rows={1}
            />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleSend('image')}
                disabled={isLoading || !input.trim()}
                className="p-2 text-zinc-400 hover:text-lumina-accent disabled:opacity-50 transition-colors"
                title="Force image generation"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2 bg-gradient-to-br from-lumina-primary to-lumina-secondary text-white rounded-xl shadow-lg hover:shadow-lumina-primary/20 disabled:opacity-50 transition-all active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
          <p className="mt-4 text-center text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
            Powered by Gemini AI Engine
          </p>
        </div>
      </div>

      {/* Image Preview Overlay */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12"
          >
            <button className="absolute top-6 right-6 text-white hover:text-zinc-400 transition-colors">
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full rounded-2xl shadow-3xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
