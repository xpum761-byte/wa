import React, { useRef, useEffect, useState } from 'react';
import type { Button, Template } from '../types';

interface MessageComposerProps {
  message: string;
  onMessageChange: (message: string) => void;
  footer: string;
  onFooterChange: (footer: string) => void;
  buttons: Button[];
  onButtonChange: (index: number, field: keyof Button, value: string) => void;
  onAddButton: () => void;
  onRemoveButton: (index: number) => void;
  onSend: () => void;
  isSending: boolean;
  recipientCount: number;
  delay: number;
  onDelayChange: (delay: number) => void;
  templates: Template[];
  selectedTemplate: string;
  onApplyTemplate: (templateId: string) => void;
  onSaveTemplate: () => void;
  onDeleteTemplate: () => void;
  imageFile: File | null;
  onImageChange: (file: File | null) => void;
}

const SendIcon: React.FC = () => ( <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg> );
const LoadingSpinner: React.FC = () => ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );

export const MessageComposer: React.FC<MessageComposerProps> = (props) => {
  const {
    message, onMessageChange, footer, onFooterChange,
    buttons, onButtonChange, onAddButton, onRemoveButton,
    onSend, isSending, recipientCount, delay, onDelayChange,
    templates, selectedTemplate, onApplyTemplate, onSaveTemplate, onDeleteTemplate,
    imageFile, onImageChange
  } = props;

  const canSend = recipientCount > 0 && (message.trim().length > 0 || imageFile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(imageFile);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageChange(e.target.files[0]);
    }
  };
  
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (messageTextareaRef.current) {
        messageTextareaRef.current.style.height = 'auto';
        messageTextareaRef.current.style.height = `${messageTextareaRef.current.scrollHeight}px`;
    }
  }, [message]);


  return (
    <div className="flex flex-col h-full p-4">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
        <h2 className="text-lg font-semibold">Compose Broadcast</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Recipients: <span className="font-bold text-teal-600 dark:text-teal-400">{recipientCount}</span>
        </p>
      </div>

      {/* --- TEMPLATES SECTION --- */}
      <div className="p-3 mb-4 border border-gray-200 dark:border-gray-700 rounded-lg flex-shrink-0">
        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Templates</h3>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTemplate}
            onChange={(e) => onApplyTemplate(e.target.value)}
            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            disabled={isSending}
          >
            <option value="">Load a template...</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={onSaveTemplate} disabled={isSending || (!message.trim() && buttons.length === 0)} className="px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-gray-400">Save</button>
          <button onClick={onDeleteTemplate} disabled={isSending || !selectedTemplate} className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-400">Delete</button>
        </div>
      </div>
      
      <div className="flex-grow flex flex-col overflow-y-auto pr-2">
         {/* --- ATTACH IMAGE SECTION --- */}
         <div className="p-3 mb-4 border border-gray-200 dark:border-gray-700 rounded-lg flex-shrink-0">
            <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Attach Image</h3>
            {imagePreview ? (
                <div className="relative group w-32 h-32">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg"/>
                    <button 
                        onClick={() => onImageChange(null)}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                    >
                       &times;
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    className="px-3 py-2 text-sm font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 disabled:bg-gray-400"
                >
                    Choose Image
                </button>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleImageSelect}
            />
        </div>
        <div className="flex-grow">
            <textarea
              ref={messageTextareaRef}
              rows={4}
              placeholder={imageFile ? "Type your caption here..." : "Type your message here..."}
              value={message}
              onChange={e => onMessageChange(e.target.value)}
              className="w-full p-3 resize-none bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
              disabled={isSending}
            />
        </div>
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 mt-2 pt-3">
          <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Message Options</h3>
          {/* Footer Input */}
          <input
            type="text"
            placeholder="Footer text (optional)"
            value={footer}
            onChange={(e) => onFooterChange(e.target.value)}
            className="w-full p-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            disabled={isSending}
          />
          {/* Buttons Section */}
          <div className="space-y-3">
            {buttons.map((button, index) => (
              <div key={index} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                   <select
                      value={button.type}
                      onChange={(e) => onButtonChange(index, 'type', e.target.value)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      disabled={isSending}
                    >
                      <option value="reply">Reply</option>
                      <option value="url">URL</option>
                      <option value="call">Call</option>
                    </select>
                   <input
                    type="text"
                    placeholder="Button Display Text"
                    value={button.displayText}
                    onChange={(e) => onButtonChange(index, 'displayText', e.target.value)}
                    className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={isSending}
                  />
                  <button onClick={() => onRemoveButton(index)} disabled={isSending} className="p-2 text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
                </div>
                {(button.type === 'url' || button.type === 'call') && (
                   <input
                    type={button.type === 'url' ? 'text' : 'tel'}
                    placeholder={button.type === 'url' ? 'https://example.com' : '6281234567890'}
                    value={button.payload || ''}
                    onChange={(e) => onButtonChange(index, 'payload', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={isSending}
                  />
                )}
              </div>
            ))}
            {buttons.length < 3 && (
              <button onClick={onAddButton} disabled={isSending} className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200 transition-colors">+ Add Button</button>
            )}
          </div>
        </div>
      </div>
      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
           <label htmlFor="delay-seconds" className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-300">
            Delay (seconds)
            <span className="text-xs text-gray-500 dark:text-gray-400">Time between each message</span>
           </label>
           <input
             type="number" id="delay-seconds" value={delay}
             onChange={(e) => onDelayChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
             min="1"
             className="w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
             disabled={isSending}
           />
        </div>
        <div className="flex justify-end items-center">
            <button
              onClick={onSend}
              disabled={isSending || !canSend}
              className={`flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white transition-all duration-300 ${ (isSending || !canSend) ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500' }`}
            >
              {isSending ? ( <><LoadingSpinner /><span>Broadcasting...</span></> ) : ( <><SendIcon /><span className="ml-2">Send Broadcast</span></> )}
            </button>
        </div>
      </div>
    </div>
  );
};