
import React, { useState } from 'react';
import Chatbot from './components/Chatbot';
import { ChatBubbleIcon } from './components/icons';

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  return (
    <div className="font-sans">
      <div className="fixed bottom-5 right-5 z-50">
        {isChatOpen ? (
          <Chatbot onClose={toggleChat} />
        ) : (
          <button
            onClick={toggleChat}
            className="bg-teal-700 text-white p-4 rounded-full shadow-lg hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 transition-transform transform hover:scale-110"
            aria-label="Open chat"
          >
            <ChatBubbleIcon />
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
