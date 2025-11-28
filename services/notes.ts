import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { NoteSummary } from '../types';

const COLLECTION_NAME = 'noteSummaries';

export interface SavedNoteSummary extends NoteSummary {
    id: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    isFavorite: boolean;
    sourceFiles: { name: string; type: string; size: number }[];
}

export const saveNoteSummary = async (
    userId: string,
    summary: NoteSummary,
    sourceFiles: { name: string; type: string; size: number }[]
): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...summary,
            userId,
            sourceFiles,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isFavorite: false
        });
        return docRef.id;
    } catch (error) {
        console.error("Error saving note summary:", error);
        throw error;
    }
};

export const updateNoteSummary = async (
    summaryId: string,
    updates: Partial<SavedNoteSummary>
): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, summaryId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating note summary:", error);
        throw error;
    }
};

export const deleteNoteSummary = async (summaryId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, summaryId));
    } catch (error) {
        console.error("Error deleting note summary:", error);
        throw error;
    }
};

export const subscribeToUserSummaries = (
    userId: string,
    callback: (summaries: SavedNoteSummary[]) => void
) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const summaries: SavedNoteSummary[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            summaries.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
            } as SavedNoteSummary);
        });
        callback(summaries);
    }, (error) => {
        console.error("Error subscribing to summaries:", error);
        callback([]);
    });
};
