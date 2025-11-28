import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedFile {
    text: string;
    metadata: {
        charCount: number;
        pageCount?: number;
    };
}

export const parseFile = async (file: File): Promise<ParsedFile> => {
    const fileType = file.type;

    if (fileType === 'application/pdf') {
        return parsePDF(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return parseDOCX(file);
    } else if (fileType.startsWith('image/')) {
        return parseImage(file);
    } else if (fileType === 'text/plain' || fileType === 'text/markdown') {
        return parseText(file);
    } else {
        throw new Error(`Unsupported file type: ${fileType}`);
    }
};

const parsePDF = async (file: File): Promise<ParsedFile> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return {
        text: fullText.trim(),
        metadata: {
            charCount: fullText.length,
            pageCount: pdf.numPages
        }
    };
};

const parseDOCX = async (file: File): Promise<ParsedFile> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    return {
        text: result.value.trim(),
        metadata: {
            charCount: result.value.length
        }
    };
};

const parseText = async (file: File): Promise<ParsedFile> => {
    const text = await file.text();
    return {
        text: text.trim(),
        metadata: {
            charCount: text.length
        }
    };
};

const parseImage = async (file: File): Promise<ParsedFile> => {
    const result = await Tesseract.recognize(file, 'eng');

    return {
        text: result.data.text.trim(),
        metadata: {
            charCount: result.data.text.length
        }
    };
};
