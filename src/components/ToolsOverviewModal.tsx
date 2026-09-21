import React from 'react';
import { X, Wrench, Sparkles, Terminal } from 'lucide-react';

interface ToolsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export const ToolsOverviewModal: React.FC<ToolsOverviewModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  if (!isOpen) return null;

  const toolsList = [
    {
      name: 'resize_image',
      title: 'Resize Image',
      prompt: 'Resize this image to 800x600',
      params: 'width, height, percentage, fit'
    },
    {
      name: 'compress_image',
      title: 'Compress Image',
      prompt: 'Compress this image to quality 70',
      params: 'quality (10-95)'
    },
    {
      name: 'convert_image',
      title: 'Convert Image Format',
      prompt: 'Convert this photo to webp format',
      params: 'format (jpg, png, webp, avif)'
    },
    {
      name: 'images_to_pdf',
      title: 'Images to PDF',
      prompt: 'Convert these images into a PDF document',
      params: 'title, orientation'
    },
    {
      name: 'merge_pdfs',
      title: 'Merge Multiple PDFs',
      prompt: 'Merge these two PDF documents into one',
      params: 'outputName'
    },
    {
      name: 'split_pdf',
      title: 'Split PDF Pages',
      prompt: 'Split this PDF and extract page 1-3',
      params: 'pages (e.g. "1-3", "2", "all")'
    },
    {
      name: 'convert_pdf_to_word',
      title: 'PDF to Word (.docx)',
      prompt: 'Convert this PDF into an editable Word document',
      params: 'outputTitle'
    },
    {
      name: 'convert_word_to_pdf',
      title: 'Word / Text to PDF',
      prompt: 'Convert this document into a PDF file',
      params: 'fontSize'
    },
    {
      name: 'text_or_csv_to_excel',
      title: 'Text / Table to Excel',
      prompt: 'Make this table into a formatted Excel sheet',
      params: 'sheetName, rawText'
    },
    {
      name: 'convert_csv_to_excel',
      title: 'CSV to Excel (.xlsx)',
      prompt: 'Convert this CSV file to Excel',
      params: 'sheetName'
    },
    {
      name: 'convert_excel_to_csv',
      title: 'Excel to CSV',
      prompt: 'Convert this Excel sheet to CSV format',
      params: 'sheetIndex'
    },
    {
      name: 'extract_text_ocr',
      title: 'Extract Text / OCR',
      prompt: 'Extract all readable text from this file',
      params: 'includeSummary'
    },
    {
      name: 'compress_pdf',
      title: 'Compress PDF',
      prompt: 'Compress and optimize this PDF document',
      params: 'quality'
    },
    {
      name: 'zip_files',
      title: 'Zip Archive Files',
      prompt: 'Zip these files into an archive',
      params: 'zipName'
    },
    {
      name: 'unzip_file',
      title: 'Unpack .zip Archive',
      prompt: 'Unzip this archive and extract its files',
      params: 'none'
    },
    {
      name: 'summarize_document',
      title: 'Summarize Document (PDF / Word / TXT)',
      prompt: 'Is PDF ko summarize karo',
      params: 'focus (executive, takeaways)'
    },
    {
      name: 'calculate_excel_data',
      title: 'Calculate Excel Data & Totals',
      prompt: 'Is Excel file mein total calculate karo',
      params: 'operation (total, average, all_stats)'
    },
    {
      name: 'improve_document_text',
      title: 'Proofread & Correct Mistakes',
      prompt: 'Is document ki spelling mistakes correct karo',
      params: 'tone (professional, academic)'
    },
    {
      name: 'generate_professional_report',
      title: 'Generate Professional Report',
      prompt: 'Is meeting notes ko professional report mein badal do',
      params: 'reportTitle, author'
    },
    {
      name: 'translate_document',
      title: 'Translate Document (Urdu / English)',
      prompt: 'Is document ko Urdu mein translate karo',
      params: 'targetLanguage (urdu, roman_urdu, english)'
    },
    {
      name: 'rename_file',
      title: 'Rename File',
      prompt: 'Is file ka naam change karo',
      params: 'newName'
    },
    {
      name: 'remove_background',
      title: 'Background Removal (Coming Soon)',
      prompt: 'Is image ka background remove karo',
      params: 'AI Segmentation (In Development)',
      comingSoon: true
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl border border-stone-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-stone-100 text-stone-800">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Supported Tools Directory</h3>
              <p className="text-xs text-stone-500">
                21 automated file processing tools available in chat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-5 overflow-y-auto divide-y divide-stone-100 space-y-3">
          {toolsList.map((t, idx) => (
            <div key={idx} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-stone-900">{t.title}</h4>
                  {t.comingSoon ? (
                    <span className="font-medium text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Coming Soon
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50">
                      {t.name}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                  Parameters: {t.params}
                </div>
              </div>

              {t.comingSoon ? (
                <span className="text-[11px] text-stone-400 italic px-2.5 py-1">In Development</span>
              ) : (
                <button
                  onClick={() => {
                    onSelectPrompt(t.prompt);
                    onClose();
                  }}
                  className="shrink-0 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Use Example
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 rounded-b-2xl flex items-center justify-between text-xs text-stone-500">
          <span>You can use any natural wording — the AI will understand your goal.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
