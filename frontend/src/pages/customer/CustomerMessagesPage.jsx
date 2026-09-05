import React from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Send } from 'lucide-react';

export const CustomerMessagesPage = () => {
  const { customerSlug } = useParams();

  // Mock messages for portal demonstration
  const messages = [
    {
      id: 1,
      sender: 'ACME Corp Sales',
      role: 'provider',
      content: 'Here is the revised quotation for the annual subscription. We have applied a 10% volume discount.',
      timestamp: '2026-09-04T14:30:00Z',
    },
    {
      id: 2,
      sender: 'Customer Admin',
      role: 'customer',
      content: 'Looks good. We will proceed with this.',
      timestamp: '2026-09-04T15:45:00Z',
    },
    {
      id: 3,
      sender: 'System',
      role: 'system',
      content: 'Quotation Q-2026-0092 confirmed. Subscription provisioned.',
      timestamp: '2026-09-05T09:12:00Z',
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#111826] tracking-tight">Messages</h1>
        <p className="text-sm text-[#2E3141]/70 mt-1">Communicate directly with your account representative.</p>
      </div>

      {/* Chat Area */}
      <div className="bg-[#FFFFFF] rounded-xl shadow-sm border border-neutral-200/60 flex flex-col flex-1 overflow-hidden">
        
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/30">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col max-w-[80%] ${msg.role === 'customer' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div className="flex items-baseline gap-2 mb-1 px-1">
                <span className="text-xs font-semibold text-neutral-700">{msg.sender}</span>
                <span className="text-[10px] text-neutral-400">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                msg.role === 'customer' 
                  ? 'bg-[#724B66] text-white rounded-br-none'
                  : msg.role === 'system'
                  ? 'bg-neutral-200 text-neutral-700 w-full text-center italic rounded-xl mx-auto'
                  : 'bg-white border border-neutral-200 text-[#111826] rounded-bl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-neutral-200/60">
          <div className="relative flex items-center">
            <textarea 
              className="w-full pl-4 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition-all resize-none"
              placeholder="Type your message..."
              rows="1"
            />
            <button className="absolute right-2 p-2 bg-[#724B66] text-white rounded-lg hover:bg-[#5a3a50] transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
