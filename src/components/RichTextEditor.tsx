import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
}

export default function RichTextEditor({ value, onChange, isDark }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);

  // Sync value to editor DOM only if it changed externally
  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      editorRef.current.innerHTML = value || '';
      lastValueRef.current = value;
    }
  }, [value]);

  // Initial load
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      lastValueRef.current = value;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  };

  const executeCommand = (command: string, arg: string = '') => {
    document.execCommand(command, false, arg);
    handleInput();
    editorRef.current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className={`border rounded-lg overflow-hidden flex flex-col transition-all ${
      isDark ? 'border-slate-700 bg-slate-800/30 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500' : 'border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500'
    }`}>
      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-1 p-2 border-b select-none ${
        isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
      }`}>
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="Bôi đậm"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="In nghiêng"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="Gạch chân"
        >
          <Underline size={16} />
        </button>

        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

        {/* Font Sizes using standard execCommand size values 1-7 */}
        <select
          onChange={(e) => executeCommand('fontSize', e.target.value)}
          className={`px-1.5 py-1 text-xs border rounded bg-transparent text-slate-600 dark:text-slate-300 outline-none ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
          }`}
          defaultValue="3"
        >
          <option value="2">Cỡ nhỏ</option>
          <option value="3">Cỡ thường</option>
          <option value="5">Cỡ lớn</option>
          <option value="6">Cỡ rất lớn</option>
        </select>

        {/* Text Colors */}
        <select
          onChange={(e) => executeCommand('foreColor', e.target.value)}
          className={`px-1.5 py-1 text-xs border rounded bg-transparent text-slate-600 dark:text-slate-300 outline-none ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
          }`}
          defaultValue=""
        >
          <option value="">Màu mặc định</option>
          <option value="#f87171" style={{ color: '#f87171' }}>Màu Đỏ</option>
          <option value="#60a5fa" style={{ color: '#60a5fa' }}>Màu Xanh</option>
          <option value="#34d399" style={{ color: '#34d399' }}>Màu Lục</option>
          <option value="#fbbf24" style={{ color: '#fbbf24' }}>Màu Vàng</option>
          <option value="#a78bfa" style={{ color: '#a78bfa' }}>Màu Tím</option>
        </select>
        
        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

        <button
          type="button"
          onClick={() => executeCommand('justifyLeft')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="Căn trái"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyCenter')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="Căn giữa"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyRight')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="Căn phải"
        >
          <AlignRight size={16} />
        </button>
      </div>

      {/* Editable Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className={`w-full min-h-[160px] max-h-[300px] overflow-y-auto px-4 py-3 outline-none prose max-w-none text-sm leading-relaxed ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
        style={{ fontFamily: 'sans-serif' }}
      />
    </div>
  );
}
