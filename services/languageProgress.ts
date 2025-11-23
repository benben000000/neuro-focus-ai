import {
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    updateDoc,
    arrayUnion,
    Timestamp,
    query,
    where,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from './firebase';

// --- TYPES ---

export interface DailyPhraseSet {
    date: string; // ISO date YYYY-MM-DD
    phrases: {
        text: string;
        translation: string;
        status: 'new' | 'learning' | 'learned';
    }[];
}

export interface WritingSample {
    id: string;
    date: number; // timestamp
    text: string;
    feedback?: string;
    language: string;
}

export interface SpeakingSession {
    id: string;
    timestamp: number;
    phrase: string;
    pronunciationScore: number; // 0-100
    confidence: number; // 0-1
}

export interface CharacterProgression {
    character: string;
    mastery: number; // 0-100
    lastPracticed: number;
}

export interface LanguageProgress {
    dailyPhrases: DailyPhraseSet[];
    learnedWords: string[];
    writingSamples: WritingSample[];
    characterProgression: CharacterProgression[];
    speakingSessions: SpeakingSession[];
}

export interface LanguageSettings {
    currentLanguage: string;
}

// --- FUNCTIONS ---

export const subscribeToLanguageSettings = (userId: string, callback: (settings: LanguageSettings | null) => void) => {
    const docRef = doc(db, 'users', userId, 'languageProgress', 'settings');
    return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data() as LanguageSettings);
        } else {
            callback(null);
        }
    });
};

export const setLanguage = async (userId: string, language: string) => {
    const docRef = doc(db, 'users', userId, 'languageProgress', 'settings');
    await setDoc(docRef, { currentLanguage: language }, { merge: true });
};

export const subscribeToLanguageProgress = (userId: string, language: string, callback: (progress: LanguageProgress | null) => void) => {
    const docRef = doc(db, 'users', userId, 'languageProgress', language);
    return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data() as LanguageProgress);
        } else {
            // Initialize if not exists or return null
            callback(null);
        }
    });
};

export const initializeLanguageProgress = async (userId: string, language: string) => {
    const docRef = doc(db, 'users', userId, 'languageProgress', language);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        const initialData: LanguageProgress = {
            dailyPhrases: [],
            learnedWords: [],
            writingSamples: [],
            characterProgression: [],
            speakingSessions: []
        };
        await setDoc(docRef, initialData);
        return initialData;
    }
    return snap.data() as LanguageProgress;
};

export const updateDailyPhrases = async (userId: string, language: string, phraseSet: DailyPhraseSet) => {
    const docRef = doc(db, 'users', userId, 'languageProgress', language);
    // We want to replace or add the phrase set for the specific date.
    // Since it's an array, it's tricky to update one item without reading.
    // However, if we assume we just append new days, arrayUnion works for unique objects.
    // But if we update status, we need to read-modify-write.
    
    // For simplicity, let's read the doc, update the array, and write back.
    // Or we could use arrayUnion if we guarantee uniqueness by date and handle updates differently.
    
    // Better approach: just update the whole dailyPhrases array in the UI and save it, 
    // or provide a helper to add a new set.
    
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data() as LanguageProgress;
        const existingIndex = data.dailyPhrases.findIndex(p => p.date === phraseSet.date);
        let newPhrases = [...(data.dailyPhrases || [])];
        
        if (existingIndex >= 0) {
            newPhrases[existingIndex] = phraseSet;
        } else {
            newPhrases.push(phraseSet);
        }
        
        await updateDoc(docRef, { dailyPhrases: newPhrases });
    } else {
        await initializeLanguageProgress(userId, language);
        await updateDailyPhrases(userId, language, phraseSet);
    }
};

export const markPhraseLearned = async (userId: string, language: string, phraseText: string) => {
    const docRef = doc(db, 'users', userId, 'languageProgress', language);
    await updateDoc(docRef, {
        learnedWords: arrayUnion(phraseText)
    });
};

export const saveWritingSample = async (userId: string, language: string, text: string, feedback?: string) => {
    const docRef = doc(db, 'users', userId, 'languageProgress', language);
    const sample: WritingSample = {
        id: Date.now().toString(),
        date: Date.now(),
        text,
        feedback,
        language
    };
    await updateDoc(docRef, {
        writingSamples: arrayUnion(sample)
    });
};

export const saveSpeakingSession = async (userId: string, language: string, phrase: string, score: number, confidence: number) => {
    const docRef = doc(db, 'users', userId, 'languageProgress', language);
    const session: SpeakingSession = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        phrase,
        pronunciationScore: score,
        confidence
    };
    await updateDoc(docRef, {
        speakingSessions: arrayUnion(session)
    });
};
