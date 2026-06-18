import { useState, useRef, ChangeEvent } from 'react';
import { FileJson, Download, Upload, Trash2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { DailyRecord } from '../types';

interface DataManagementProps {
  onImport: (newData: Record<string, DailyRecord>) => void;
  onClear: () => void;
  onResetSample: () => void;
  allRecords: Record<string, DailyRecord>;
}

export default function DataManagement({ onImport, onClear, onResetSample, allRecords }: DataManagementProps) {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(allRecords, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `serene_health_backup_${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      showStatus('success', 'Your health records exported successfully.');
    } catch (e: any) {
      showStatus('error', `Failed to export files: ${e?.message || 'Unknown error'}`);
    }
  };

  const handleImportFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Simple schema validation
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Invalid JSON format. Expected key-value records.');
        }

        const keys = Object.keys(parsed);
        if (keys.length > 0) {
          // Check structure of first key-value pair if elements exist
          const sampleKey = keys[0];
          const sampleRecord = parsed[sampleKey];
          if (!sampleRecord.date || !sampleRecord.sleep || !sampleRecord.water || !sampleRecord.diet) {
            throw new Error('JSON structure does not match daily health records format.');
          }
        }

        onImport(parsed);
        showStatus('success', `Imported ${keys.length} daily health records successfully.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        showStatus('error', `Import failed: ${err.message || 'Check backup file structure'}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    fileReader.readAsText(files[0]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    setTimeout(() => {
      setStatus({ type: null, message: '' });
    }, 5000);
  };

  return (
    <div
      id="data-man-container"
      className="bg-white/75 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-850 rounded-3xl p-6 shadow-subtle dark:shadow-none flex flex-col gap-5"
    >
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold block">
          Settings & Portability
        </span>
        <h3 className="text-lg font-sans font-semibold tracking-tight text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-2">
          <FileJson className="w-5 h-5 text-indigo-500" />
          Backup, Export & Data Management
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Your metric records are saved completely inside your device storage. You are in full possession of your health stats. Secure your logs using manual backup files.
        </p>
      </div>

      {/* Notification banner */}
      {status.type && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs transition duration-300 ${
            status.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-950 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-950 text-rose-800 dark:text-rose-300'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Grid of Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Import/Export container */}
        <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-150/40 dark:border-slate-800">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider">
            Transfer Health Data
          </span>
          <div className="flex flex-col gap-2">
            <button
               id="export-data-btn"
              type="button"
              onClick={handleExport}
              className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Backup (.json)</span>
            </button>

            <button
              id="import-data-btn"
              type="button"
              onClick={triggerFileInput}
              className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Import Backup</span>
            </button>
            <input
              id="hidden-file-input"
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Database state management */}
        <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-150/40 dark:border-slate-800">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider">
            Diagnostics & Sandbox
          </span>
          <div className="flex flex-col gap-2">
            <button
              id="reload-sample-data-btn"
              type="button"
              onClick={onResetSample}
              className="flex-1 py-2 px-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 text-indigo-700/90 dark:text-indigo-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Mock Sample</span>
            </button>

            <button
              id="clear-all-data-btn"
              type="button"
              onClick={onClear}
              className="flex-1 py-2 px-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100/80 dark:hover:bg-rose-900/60 text-rose-700/90 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Clean Slate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
