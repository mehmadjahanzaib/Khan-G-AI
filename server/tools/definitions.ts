export interface FunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export const TOOL_DEFINITIONS: FunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'resize_image',
      description: 'Resize an image by specifying target width and/or height in pixels, or a scale percentage (e.g. 50% or 200%).',
      parameters: {
        type: 'object',
        properties: {
          width: {
            type: 'number',
            description: 'Target width in pixels (e.g. 800, 1920).'
          },
          height: {
            type: 'number',
            description: 'Target height in pixels (e.g. 600, 1080).'
          },
          percentage: {
            type: 'number',
            description: 'Scale percentage (e.g. 50 for half size, 75, 200 for double size).'
          },
          fit: {
            type: 'string',
            enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
            description: 'How the image should fit into target dimensions.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compress_image',
      description: 'Compress an image to reduce file size while maintaining visual quality, optionally targeting a maximum file size in KB.',
      parameters: {
        type: 'object',
        properties: {
          quality: {
            type: 'number',
            description: 'Compression quality from 10 (smallest size) to 95 (highest quality). Default is 70.'
          },
          maxSizeKB: {
            type: 'number',
            description: 'Target maximum file size in kilobytes (e.g. 500 for 500 KB limit).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'convert_image',
      description: 'Convert an image between formats like JPG, PNG, WEBP, AVIF.',
      parameters: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
            description: 'The target output image format.'
          },
          quality: {
            type: 'number',
            description: 'Optional quality level for the converted image (10-100).'
          }
        },
        required: ['format']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'images_to_pdf',
      description: 'Convert one or more uploaded images (JPG, PNG, WEBP) into a single PDF document.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Optional title of the generated PDF document.'
          },
          orientation: {
            type: 'string',
            enum: ['portrait', 'landscape', 'auto'],
            description: 'Orientation of the PDF pages.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'merge_pdfs',
      description: 'Merge two or more PDF documents into a single consolidated PDF document.',
      parameters: {
        type: 'object',
        properties: {
          outputName: {
            type: 'string',
            description: 'Optional output filename without extension.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'split_pdf',
      description: 'Split a PDF document or extract specific pages (e.g. "1", "1-3", "2,4,5").',
      parameters: {
        type: 'object',
        properties: {
          pages: {
            type: 'string',
            description: 'Pages to extract (e.g. "1", "1-3", "2,4", or "all" to export each page).'
          }
        },
        required: ['pages']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'convert_pdf_to_word',
      description: 'Convert a PDF document into an editable Microsoft Word (.docx) file.',
      parameters: {
        type: 'object',
        properties: {
          outputTitle: {
            type: 'string',
            description: 'Title for the document.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'convert_word_to_pdf',
      description: 'Convert an uploaded Word document (.docx) or text content into a PDF file.',
      parameters: {
        type: 'object',
        properties: {
          fontSize: {
            type: 'number',
            description: 'Font size in points (e.g. 11 or 12).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'text_or_csv_to_excel',
      description: 'Create a nicely formatted Excel spreadsheet (.xlsx) from pasted text, tabulated data, or CSV content.',
      parameters: {
        type: 'object',
        properties: {
          sheetName: {
            type: 'string',
            description: 'Name of the worksheet (e.g. "Data", "Sheet1").'
          },
          rawText: {
            type: 'string',
            description: 'Optional raw text or table data if provided directly in the chat message.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'convert_csv_to_excel',
      description: 'Convert a CSV file into a Microsoft Excel (.xlsx) workbook with styled header row and auto-fitted columns.',
      parameters: {
        type: 'object',
        properties: {
          sheetName: {
            type: 'string',
            description: 'Sheet name.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'convert_excel_to_csv',
      description: 'Convert an Excel workbook (.xlsx) into a clean CSV file.',
      parameters: {
        type: 'object',
        properties: {
          sheetIndex: {
            type: 'number',
            description: 'Sheet index to export (1-indexed). Default is 1.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'extract_text_ocr',
      description: 'Extract all readable text from a PDF document or scan text from an image (OCR).',
      parameters: {
        type: 'object',
        properties: {
          includeSummary: {
            type: 'boolean',
            description: 'Whether to also display a quick summary in the chat.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compress_pdf',
      description: 'Compress and optimize a PDF file to reduce its file size.',
      parameters: {
        type: 'object',
        properties: {
          quality: {
            type: 'string',
            enum: ['standard', 'high_compression'],
            description: 'Compression level.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'zip_files',
      description: 'Archive and compress one or multiple uploaded files into a single .zip file.',
      parameters: {
        type: 'object',
        properties: {
          zipName: {
            type: 'string',
            description: 'Custom filename for the zip archive without .zip extension.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'unzip_file',
      description: 'Extract all contents from an uploaded .zip archive into individual files.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'summarize_document',
      description: 'Summarize an uploaded PDF, Word document, or text file into key insights, executive summary, and action items.',
      parameters: {
        type: 'object',
        properties: {
          focus: {
            type: 'string',
            description: 'Optional focus area for the summary (e.g. "financials", "executive", "action items").'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_excel_data',
      description: 'Compute total sums, averages, counts, min and max values for numeric columns in an Excel (.xlsx) or CSV file, and append a styled summary row.',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['total', 'average', 'all_stats'],
            description: 'The primary calculation desired (total sum, average, or all statistics).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'improve_document_text',
      description: 'Proofread and correct spelling, grammar, readability, and phrasing mistakes in an uploaded document or text, and generate an edited Word (.docx) file.',
      parameters: {
        type: 'object',
        properties: {
          tone: {
            type: 'string',
            enum: ['professional', 'academic', 'casual', 'concise'],
            description: 'Desired tone of the corrected document.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_professional_report',
      description: 'Transform raw notes, meeting minutes, or document drafts into a structured corporate report in Microsoft Word (.docx) format.',
      parameters: {
        type: 'object',
        properties: {
          reportTitle: {
            type: 'string',
            description: 'Title for the professional report.'
          },
          author: {
            type: 'string',
            description: 'Author or organization name.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'translate_document',
      description: 'Translate an uploaded document or text into Urdu (اردو), Roman Urdu, or English, and save a translated Word document.',
      parameters: {
        type: 'object',
        properties: {
          targetLanguage: {
            type: 'string',
            enum: ['urdu', 'roman_urdu', 'english'],
            description: 'Target language to translate into.'
          }
        },
        required: ['targetLanguage']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'rename_file',
      description: 'Safely rename an uploaded file to a specified new name while preserving or choosing the right extension.',
      parameters: {
        type: 'object',
        properties: {
          newName: {
            type: 'string',
            description: 'The desired new name for the file.'
          }
        },
        required: ['newName']
      }
    }
  }
];
