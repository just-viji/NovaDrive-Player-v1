
import React, { useState, useEffect } from 'react';
import { X, Save, ShieldCheck, HelpCircle, AlertTriangle, Copy, Check, Globe, ExternalLink, Users, AlertCircle } from 'lucide-react';
import { driveService } from '../services/googleDriveService';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [clientId, setClientId] = useState(driveService.getClientId());
  const [saved, setSaved] = useState(false);
  const [origin, setOrigin] = useState('');
  const [hostname, setHostname] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setHostname(window.location.hostname);
    }
  }, []);

  const handleSave = () => {
    if (clientId.trim()) {
      driveService.setClientId(clientId.trim());
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 800);
    }
  };

  const copyOrigin = () => {
    navigator.clipboard.writeText(origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Google blocks private IPs (192.168.x.x, 10.x.x.x, 172.16.x.x) as origins
  const isPrivateIP = (host: string) => {
    return (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      (host.startsWith('172.') && parseInt(host.split('.')[1], 10) >= 16 && parseInt(host.split('.')[1], 10) <= 31)
    );
  };

  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isPrivateNetworkIP = isPrivateIP(hostname) && !isLocalhost;
  const isSecure = origin.startsWith('https') || isLocalhost;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-200">
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-blue-400" size={24} />
              App Settings
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            
            {/* Troubleshooting 400 Errors (Origin Mismatch) - PRIORITY */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-rose-100">Getting "Error 400: invalid_request"?</h3>
                  <p className="text-xs text-rose-200/70 mt-1 mb-2">
                    This error means your current browser URL is NOT listed in Google Cloud.
                  </p>
                  
                  <div className="bg-slate-900/80 p-3 rounded border border-rose-500/30 mb-2 relative group">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Add this EXACT URL to Authorized Origins:</p>
                    <div className="flex items-center gap-2">
                        <code className="text-xs text-emerald-400 font-mono flex-1 break-all select-all">{origin}</code>
                        <button 
                          onClick={copyOrigin} 
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-rose-200/60 leading-tight">
                    <strong>Vercel Users:</strong> Deployment previews (e.g., <code>app-git-main.vercel.app</code>) are different from production. You must add the <strong>specific URL</strong> you are visiting right now.
                  </p>
                </div>
              </div>
            </div>

            {/* Troubleshooting 403 Errors (Test Users) */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Users size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-100">Getting "Error 403: access_denied"?</h3>
                  <p className="text-xs text-amber-200/70 mt-1 mb-2">
                    If your app is in <strong>Testing</strong> mode, you must explicitly add your email.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 marker:text-amber-500/50">
                    <li>Go to <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" className="text-blue-400 hover:underline">OAuth consent screen</a>.</li>
                    <li>Scroll down to <strong>Test users</strong>.</li>
                    <li>Click <strong>+ ADD USERS</strong> and enter your email.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* General Instructions */}
            <div className={`rounded-xl p-5 border ${isSecure && !isPrivateNetworkIP ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-800/30 border-slate-700'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe size={16} className="text-blue-400" />
                  Quick Links
                </h3>
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2 py-1 rounded-full"
                >
                  Open Google Cloud Console <ExternalLink size={10} />
                </a>
              </div>
              
              {!isSecure && !isPrivateNetworkIP && (
                 <p className="text-xs text-amber-500 font-medium flex items-center gap-1 bg-amber-500/10 p-2 rounded">
                   <AlertTriangle size={12} /> Google requires HTTPS. This won't work on http:// unless it's localhost.
                 </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Google Client ID</label>
              <input 
                type="text" 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="123456789-abcdef.apps.googleusercontent.com"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
              <p className="mt-2 text-xs text-slate-500 flex gap-1">
                <HelpCircle size={14} className="mt-0.5" />
                Required to access your Google Drive files.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 pt-0 mt-auto flex justify-end bg-gradient-to-t from-slate-900 to-transparent">
            <button 
              onClick={handleSave}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                saved 
                ? 'bg-emerald-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {saved ? (
                <>
                  <ShieldCheck size={18} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
