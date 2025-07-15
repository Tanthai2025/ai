
import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import { Message, Role } from '../types';
import { createChat, sendMessageInChat } from '../services/geminiService';
import { SendIcon, CloseIcon } from './icons';

interface ChatbotProps {
  onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logoUrl = "https://i.postimg.cc/90YYgzYG/econova-logo-2.png";

  // State for dragging functionality
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef<{ startX: number; startY: number; initialTop: number; initialLeft: number; } | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    // Initialize chat session and send the first greeting message from the bot
    const initChat = async () => {
        setIsLoading(true);
        try {
            // createChat is now async to fetch the knowledge base
            const newChat = await createChat();
            setChatSession(newChat);
            // A more natural initial prompt to get a greeting based on the new system instructions.
            const greeting = await sendMessageInChat(newChat, "Xin chào, hãy giới thiệu bản thân và gửi lời chào đến khách hàng.");
            setMessages([{ role: Role.MODEL, content: greeting }]);
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            setMessages([{ role: Role.MODEL, content: "Xin chào, ECO Bot không sẵn sàng vào lúc này. Vui lòng thử lại sau." }]);
        } finally {
            setIsLoading(false);
        }
    };
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    const chatNode = chatWindowRef.current;
    if (!chatNode) return;

    e.preventDefault();
    setIsDragging(true);

    const rect = chatNode.getBoundingClientRect();

    // On the first drag, capture initial position and switch to fixed positioning with top/left
    const currentPosition = position || { top: rect.top, left: rect.left };
    if (!position) {
      setPosition(currentPosition);
    }
    
    dragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialTop: currentPosition.top,
      initialLeft: currentPosition.left,
    };
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging || !dragInfo.current) return;
      e.preventDefault();

      const dx = e.clientX - dragInfo.current.startX;
      const dy = e.clientY - dragInfo.current.startY;

      setPosition({
        top: dragInfo.current.initialTop + dy,
        left: dragInfo.current.initialLeft + dx,
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading || !chatSession) return;

    const newUserMessage: Message = { role: Role.USER, content: trimmedInput };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await sendMessageInChat(chatSession, trimmedInput);
      const newAiMessage: Message = { role: Role.MODEL, content: aiResponse };
      setMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: Role.MODEL,
        content: "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const rootClasses = [
    "w-80 h-[28rem] sm:w-96 sm:h-[32rem]",
    "bg-white rounded-xl shadow-2xl flex flex-col",
    // When `position` is null (before dragging), use fixed classes for bottom-right.
    // When `position` is set (during/after dragging), use `fixed` and let inline styles handle top/left.
    position ? 'fixed z-50' : 'fixed z-50 bottom-5 right-5'
  ].join(' ');

  const rootStyles: React.CSSProperties = position
    ? { top: `${position.top}px`, left: `${position.left}px` }
    : {};

  return (
    <div ref={chatWindowRef} className={rootClasses} style={rootStyles}>
      {/* Header */}
      <div 
        onMouseDown={handleDragStart}
        className="bg-teal-700 text-white p-4 rounded-t-xl flex justify-between items-center cursor-move"
      >
        <h3 className="font-bold text-lg">ECO Bot</h3>
        <button
          onClick={onClose}
          className="hover:bg-teal-800 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close chat"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
              {msg.role === Role.MODEL && (
                 <img
                    src={logoUrl}
                    alt="ECO Bot logo"
                    className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                  />
              )}
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === Role.USER
                    ? 'bg-teal-600 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
               <img
                  src={logoUrl}
                  alt="ECO Bot logo"
                  className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                />
              <div className="max-w-[80%] p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 p-3 bg-white rounded-b-xl">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 w-full px-4 py-2 text-sm bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-teal-700 text-white p-3 rounded-full hover:bg-teal-800 disabled:bg-teal-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 transition-colors"
             aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;