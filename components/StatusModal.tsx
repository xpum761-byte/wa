import React from 'react';
import type { ConnectionStatus, SendProgress } from '../types';

interface StatusModalProps {
  status: ConnectionStatus;
  message: string;
  onClose: () => void;
  progress: SendProgress;
  qrCode?: string | null;
}

const LoadingIcon: React.FC = () => (
    <svg className="animate-spin h-12 w-12 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const SuccessIcon: React.FC = () => (
    <svg className="h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

const ErrorIcon: React.FC = () => (
    <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

const getStatusDetails = (status: ConnectionStatus) => {
    switch (status) {
        case 'connecting':
            return { icon: <LoadingIcon />, title: 'Connecting to WhatsApp...' };
        case 'qr':
            return { icon: null, title: 'Scan QR Code' };
        case 'running':
            return { icon: <LoadingIcon />, title: 'Broadcast in Progress' };
        case 'finished':
            return { icon: <SuccessIcon />, title: 'Success' };
        case 'error':
        case 'disconnected':
            return { icon: <ErrorIcon />, title: 'Error / Disconnected' };
        default:
            return { icon: <LoadingIcon />, title: 'Status' };
    }
};

export const StatusModal: React.FC<StatusModalProps> = ({ status, message, onClose, progress, qrCode }) => {
  const { icon, title } = getStatusDetails(status);
  const progressPercentage = (progress && progress.total > 0) ? (progress.current / progress.total) * 100 : 0;
  
  const isBroadcasting = status === 'running';
  const isDismissible = ['finished', 'error', 'disconnected'].includes(status);
    
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full text-center transform transition-all duration-300 scale-100">
        
        {status === 'qr' && qrCode ? (
          <img src={qrCode} alt="Scan me with WhatsApp" className="mx-auto mb-4" />
        ) : (
          <div className="mx-auto flex items-center justify-center h-16 w-16 mb-4">
            {icon}
          </div>
        )}

        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-2" id="modal-title">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 min-h-[40px]">{message}</p>
        
        {isBroadcasting && progress && progress.total > 0 && (
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-6 relative">
            <div
              className="bg-teal-500 h-2.5 rounded-full transition-all duration-150 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            ></div>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{progress.current} of {progress.total}</p>
          </div>
        )}

        {isBroadcasting ? (
           <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
          >
            Stop Broadcast
          </button>
        ) : isDismissible ? (
           <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm"
          >
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
};
