import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { GOOGLE_SHEET_CSV_URL, SYSTEM_INSTRUCTION_TEMPLATE } from '../constants';

// --- HƯỚNG DẪN THÊM API KEY ---
// 1. Lấy API Key của bạn từ Google AI Studio (https://aistudio.google.com/app/apikey).
// 2. Dán API Key của bạn vào đây, thay thế cho 'YOUR_API_KEY_HERE'.
// QUAN TRỌNG: KHÔNG chia sẻ mã nguồn này công khai khi đã có API Key của bạn.
const API_KEY = 'AIzaSyCrxm30ZfRfPDDVUmGao8bcN0cQtK2xi6I';


let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client.
 * Throws an error if the API key is not configured.
 * @returns The initialized GoogleGenAI client.
 */
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }

    // Check if the API key is provided in the constant above.
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        const errorMessage = "API Key chưa được cấu hình. Vui lòng thêm API Key vào file services/geminiService.ts.";
        const developerNote = "Để ứng dụng hoạt động, bạn cần cung cấp một Google AI API Key hợp lệ. Mở file `services/geminiService.ts` và thay thế giá trị của hằng số `API_KEY` bằng khóa của bạn.";

        console.error(`[AI Service Error] ${errorMessage}\n\n[Developer Note] ${developerNote}`);

        // This error is caught by the UI to show a user-friendly message.
        throw new Error(errorMessage);
    }
    
    ai = new GoogleGenAI({ apiKey: API_KEY });
    return ai;
};

/**
 * Parses a CSV text from Google Sheets into a Q&A formatted string.
 * Assumes a two-column CSV. It splits each line at the first comma.
 * @param csvText The raw CSV text.
 * @returns A formatted string for the knowledge base.
 */
const parseCsvToKnowledgeBase = (csvText: string): string => {
    const lines = csvText.trim().split(/\r?\n/);
    // Remove header line
    const dataLines = lines.slice(1);
    
    return dataLines
        .map(line => {
            // Splits the line into two parts at the first comma.
            // This is a simple parser assuming questions don't contain commas.
            const parts = line.split(/,(.+)/);
            if (parts.length < 2) return '';

            // Trim quotes "..." that Google Sheets adds around fields
            const question = parts[0].trim().replace(/^"|"$/g, '');
            const answer = parts[1].trim().replace(/^"|"$/g, '');

            if (question && answer) {
                return `Hỏi: ${question}\nĐáp: ${answer}`;
            }
            return '';
        })
        .filter(qa => qa)
        .join('\n\n');
};

/**
 * Fetches the knowledge base from the configured Google Sheet CSV URL.
 * @returns The formatted knowledge base string.
 */
const fetchKnowledgeBase = async (): Promise<string> => {
    if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL === 'URL_GOOGLE_SHEET_CSV_CUA_BAN_O_DAY') {
        console.warn("Google Sheet URL is not configured.");
        return "Kiến thức chưa được cung cấp. Vui lòng liên hệ quản trị viên để cập nhật thông tin.";
    }

    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch Google Sheet CSV: ${response.statusText}`);
        }
        const csvText = await response.text();
        if (!csvText) {
             return "Không có dữ liệu trong file kiến thức.";
        }
        return parseCsvToKnowledgeBase(csvText);
    } catch (error) {
        console.error("Error fetching or parsing Google Sheet:", error);
        return "Lỗi khi tải dữ liệu kiến thức từ Google Sheet.";
    }
};


/**
 * Creates and returns a new chat instance configured with a dynamic system prompt
 * based on the knowledge fetched from the Google Sheet.
 */
export const createChat = async (): Promise<Chat> => {
    const client = getAiClient(); // Get client, will throw if API_KEY is missing
    const knowledgeBase = await fetchKnowledgeBase();
    const systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE.replace('{knowledge_base}', knowledgeBase);

    return client.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
    });
};

/**
 * Sends a message to the AI using an existing chat session.
 * @param chat The chat instance.
 * @param message The user's message.
 * @returns The AI's text response.
 */
export const sendMessageInChat = async (chat: Chat, message: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        return "Xin lỗi, đã có lỗi xảy ra trong quá trình xử lý yêu cầu của bạn. Vui lòng thử lại sau.";
    }
};