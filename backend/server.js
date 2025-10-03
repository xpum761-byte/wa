const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity, can be restricted in production
  },
});

let sock;
let isBroadcasting = false;
let clients = new Set();

// Use a local folder for auth info. This works locally and on Render's persistent disk.
const authPath = 'auth_info_baileys';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR code received, sending to frontend...');
      const qrCodeUrl = await qrcode.toDataURL(qr);
      clients.forEach(client => {
          client.emit('qr', qrCodeUrl);
          client.emit('status', { status: 'qr', message: 'Scan QR code to connect.' });
      });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
      clients.forEach(client => client.emit('status', { status: 'disconnected', message: 'WhatsApp disconnected.' }));
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('opened connection');
      clients.forEach(client => client.emit('status', { status: 'connected', message: 'WhatsApp is connected!' }));
    }
  });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  clients.add(socket);
  
  if (sock && sock.ws.readyState === sock.ws.OPEN) {
    socket.emit('status', { status: 'connected', message: 'WhatsApp is already connected!' });
  } else {
    socket.emit('status', { status: 'idle', message: 'WhatsApp is idle.' });
  }

  socket.on('connect-wa', async () => {
    if (sock && sock.ws.readyState === sock.ws.OPEN) {
        socket.emit('status', { status: 'connected', message: 'WhatsApp is already connected!' });
        return;
    }
    try {
        socket.emit('status', { status: 'connecting', message: 'Initializing WhatsApp connection...' });
        await connectToWhatsApp();
    } catch (err) {
        console.error("Failed to connect to WhatsApp:", err);
        socket.emit('status', { status: 'error', message: 'Failed to initialize connection. Please try again.' });
    }
  });


  socket.on('start-broadcast', async ({ numbers, message, footer, buttons, delay: delaySeconds, image }) => {
    if (isBroadcasting) {
        socket.emit('status', { status: 'error', message: 'Another broadcast is already in progress.' });
        return;
    }
    if (!sock || sock.ws.readyState !== sock.ws.OPEN) {
        socket.emit('status', { status: 'error', message: 'WhatsApp is not connected. Please connect first.' });
        return;
    }

    console.log(`Starting broadcast to ${numbers.length} numbers.`);
    isBroadcasting = true;
    clients.forEach(client => client.emit('status', { status: 'running', message: 'Broadcast has started...' }));
    let errorCount = 0;

    try {
        for (let i = 0; i < numbers.length; i++) {
            if (!isBroadcasting) {
                console.log('Broadcast stopped by user.');
                break;
            }
            const number = numbers[i];
            const formattedNumber = `${number}@s.whatsapp.net`;
            
            try {
                console.log(`Sending message to ${number}`);
                
                const hasButtons = buttons && Array.isArray(buttons) && buttons.length > 0;
                let templateButtons;

                if (hasButtons) {
                    templateButtons = buttons.map((btn, idx) => {
                        if (btn.type === 'reply') {
                            return { index: idx + 1, quickReplyButton: { displayText: btn.displayText, id: `reply-btn-${Date.now()}-${idx}` } };
                        }
                        if (btn.type === 'url' && btn.payload) {
                            return { index: idx + 1, urlButton: { displayText: btn.displayText, url: btn.payload } };
                        }
                        if (btn.type === 'call' && btn.payload) {
                            return { index: idx + 1, callButton: { displayText: btn.displayText, phoneNumber: btn.payload } };
                        }
                        return null;
                    }).filter(Boolean);
                }

                if (image) {
                    const imageBuffer = Buffer.from(image.split(';base64,').pop(), 'base64');
                    const messageOptions = {
                        image: imageBuffer,
                        caption: message,
                        footer: footer || undefined,
                        templateButtons: (templateButtons && templateButtons.length > 0) ? templateButtons : undefined,
                    };
                    await sock.sendMessage(formattedNumber, messageOptions);
                } else if (hasButtons && templateButtons.length > 0) {
                    const buttonMessage = {
                        text: message,
                        footer: footer || '',
                        templateButtons: templateButtons,
                    };
                    await sock.sendMessage(formattedNumber, buttonMessage);
                } else {
                    await sock.sendMessage(formattedNumber, { text: message });
                }

                clients.forEach(client => client.emit('progress', { current: i + 1, total: numbers.length, currentNumber: number }));
                await delay(delaySeconds * 1000);
            } catch (error) {
                console.error(`Failed to send message to ${number}:`, error);
                errorCount++;
            }
        }
    } finally {
        isBroadcasting = false;
        const finalMessage = errorCount > 0 
            ? `Broadcast completed with ${errorCount} failure(s).` 
            : 'Broadcast completed successfully.';
        
        clients.forEach(client => client.emit('status', { status: 'finished', message: finalMessage }));
        console.log('Broadcast finished.');
    }
  });
  
  socket.on('stop-broadcast', () => {
    isBroadcasting = false;
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    clients.delete(socket);
  });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));