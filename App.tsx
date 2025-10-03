import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { ConnectionStatus, SendProgress, Button, Template } from './types';
import { Header } from './components/Header';
import { MessageComposer } from './components/MessageComposer';
import { StatusModal } from './components/StatusModal';

// @ts-ignore
const backendUrl = 'http://localhost:4000'; // Connect to the Node.js backend
// @ts-ignore
const socket = io(backendUrl, { autoConnect: false });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });


const App: React.FC = () => {
  const [phoneNumbersText, setPhoneNumbersText] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [footer, setFooter] = useState<string>('');
  const [buttons, setButtons] = useState<Button[]>([]);
  const [delaySeconds, setDelaySeconds] = useState<number>(5);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // --- Simplified State Management ---
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string>('');
  const [progress, setProgress] = useState<SendProgress>({ current: 0, total: 0, currentNumber: '' });

  // Derive state from a single source of truth (`connectionStatus`)
  const isBroadcasting = useMemo(() => connectionStatus === 'running', [connectionStatus]);
  const isModalOpen = useMemo(() => !['idle', 'connected'].includes(connectionStatus), [connectionStatus]);


  // Load templates from localStorage on initial render
  useEffect(() => {
    const storedTemplates = localStorage.getItem('wa-templates');
    if (storedTemplates) {
      setTemplates(JSON.parse(storedTemplates));
    }
  }, []);

  const recipientCount = useMemo(() => {
    const numbers = phoneNumbersText
      .split('\n')
      .map(n => n.replace(/\D/g, ''))
      .filter(n => n.length > 5);
    return new Set(numbers).size;
  }, [phoneNumbersText]);

  const handleStatusUpdate = useCallback((statusUpdate: { status: ConnectionStatus, message: string }) => {
    setConnectionStatus(statusUpdate.status);
    setModalMessage(statusUpdate.message);
    if (statusUpdate.status === 'connected') {
      setQrCode(null);
    }
  }, []);

  useEffect(() => {
    socket.on('connect', () => console.log('Connected to backend socket'));
    socket.on('disconnect', () => {
      handleStatusUpdate({ status: 'disconnected', message: 'Connection to server lost.' });
    });
    socket.on('qr', (qr: string) => {
      setConnectionStatus('qr');
      setQrCode(qr);
      setModalMessage('Scan this QR code with your WhatsApp app.');
    });
    socket.on('status', handleStatusUpdate);
    socket.on('progress', (progressData: SendProgress) => setProgress(progressData));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('qr');
      socket.off('status', handleStatusUpdate);
      socket.off('progress');
    };
  }, [handleStatusUpdate]);

  const saveTemplate = () => {
    const name = prompt('Enter a name for this template:');
    if (name && name.trim()) {
      const newTemplate: Template = {
        id: `template-${Date.now()}`,
        name: name.trim(),
        message,
        footer,
        buttons,
      };
      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      localStorage.setItem('wa-templates', JSON.stringify(updatedTemplates));
      alert(`Template "${name}" saved!`);
    }
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setImageFile(null); // Clear image when applying template
    if (!templateId) {
      setMessage('');
      setFooter('');
      setButtons([]);
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.message);
      setFooter(template.footer || '');
      setButtons(template.buttons || []);
    }
  };

  const deleteTemplate = () => {
    if (!selectedTemplate) {
      alert('Please select a template to delete.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter(t => t.id !== selectedTemplate);
      setTemplates(updatedTemplates);
      localStorage.setItem('wa-templates', JSON.stringify(updatedTemplates));
      setSelectedTemplate('');
      applyTemplate(''); // Clear fields
    }
  };

  const handleButtonChange = (index: number, field: keyof Button, value: string) => {
    const newButtons = buttons.map((button, i) => {
      if (i === index) {
        const updatedButton = { ...button, [field]: value };
        if (field === 'type') {
          updatedButton.payload = ''; // Reset payload when type changes
        }
        return updatedButton;
      }
      return button;
    });
    setButtons(newButtons);
  };

  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { type: 'reply', displayText: '' }]);
    }
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const startBroadcast = async () => {
    // Client-side validation for immediate feedback
    if (connectionStatus !== 'connected') {
      handleStatusUpdate({ status: "error", message: "WhatsApp is not connected. Please connect first." });
      return;
    }
    const numbers = Array.from(new Set(phoneNumbersText.split('\n').map(n => n.replace(/\D/g, '')).filter(n => n.length > 5)));
    if (numbers.length === 0) {
      handleStatusUpdate({ status: "error", message: "Please enter at least one valid phone number." });
      return;
    }
    // Message can be empty if an image is present (it becomes the caption)
    if (!message.trim() && !imageFile) {
      handleStatusUpdate({ status: "error", message: "Message cannot be empty." });
      return;
    }

    let imageBase64: string | null = null;
    if (imageFile) {
        try {
            imageBase64 = await fileToBase64(imageFile);
        } catch (error) {
            console.error("Error converting file to base64:", error);
            handleStatusUpdate({ status: "error", message: "Could not process the image file." });
            return;
        }
    }
    
    // Frontend only emits the request. It does NOT set its own state.
    // The backend is the source of truth for the 'running' status.
    setProgress({ current: 0, total: numbers.length, currentNumber: '' });
    socket.emit('start-broadcast', { numbers, message, footer, buttons, delay: delaySeconds, image: imageBase64 });
  };

  const stopBroadcast = () => {
    socket.emit('stop-broadcast');
  };

  const handleConnect = () => {
    setConnectionStatus('connecting');
    socket.connect(); // Manually connect
    socket.emit('connect-wa');
  };

  const closeModal = () => {
    if (isBroadcasting) {
      stopBroadcast();
    }
    // Reset to a sensible default state after closing a terminal modal
    setConnectionStatus(socket.connected ? 'connected' : 'idle');
  };

  const numbersTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (numbersTextareaRef.current) {
      numbersTextareaRef.current.style.height = 'auto';
      numbersTextareaRef.current.style.height = `${numbersTextareaRef.current.scrollHeight}px`;
    }
  }, [phoneNumbersText]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-sans">
      <Header onConnect={handleConnect} status={connectionStatus} />
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow-lg h-[calc(100vh-150px)] flex flex-col p-4">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
              <h2 className="text-lg font-semibold">Enter Phone Numbers</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">One number per line. Ex: 62812...</p>
            </div>
            <textarea
              ref={numbersTextareaRef}
              rows={10}
              className="w-full p-3 resize-none bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 overflow-y-auto"
              placeholder={'6281234567890\n6289876543210'}
              value={phoneNumbersText}
              onChange={e => setPhoneNumbersText(e.target.value)}
              disabled={isBroadcasting}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-right flex-shrink-0">{recipientCount} valid numbers detected.</p>
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg h-[calc(100vh-150px)] flex flex-col">
            <MessageComposer
              message={message} onMessageChange={setMessage}
              footer={footer} onFooterChange={setFooter}
              buttons={buttons} onButtonChange={handleButtonChange}
              onAddButton={addButton} onRemoveButton={removeButton}
              onSend={startBroadcast}
              isSending={isBroadcasting}
              recipientCount={recipientCount}
              delay={delaySeconds} onDelayChange={setDelaySeconds}
              templates={templates}
              selectedTemplate={selectedTemplate}
              onApplyTemplate={applyTemplate}
              onSaveTemplate={saveTemplate}
              onDeleteTemplate={deleteTemplate}
              imageFile={imageFile}
              onImageChange={setImageFile}
            />
          </div>
        </div>
      </main>
      {isModalOpen && (
        <StatusModal
          status={connectionStatus} message={modalMessage} onClose={closeModal}
          progress={progress} qrCode={qrCode}
        />
      )}
    </div>
  );
};

export default App;