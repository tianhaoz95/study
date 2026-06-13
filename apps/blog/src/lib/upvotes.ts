import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment,
  collection,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetch the upvote count for a given post slug.
 */
export async function getUpvotes(slug: string): Promise<number> {
  try {
    const docRef = doc(db, 'upvotes', slug);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().count ?? 0;
    }
  } catch (e) {
    console.warn(`[upvotes] Failed to fetch upvotes for ${slug}:`, e);
  }
  return 0;
}

/**
 * Fetch all upvote counts. Returns a record of slug -> count.
 */
export async function getAllUpvotes(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  try {
    const snap = await getDocs(collection(db, 'upvotes'));
    snap.forEach(d => {
      result[d.id] = d.data().count ?? 0;
    });
  } catch (e) {
    console.warn('[upvotes] Failed to fetch all upvotes:', e);
  }
  return result;
}

/**
 * Increment the upvote count for a given post slug.
 */
export async function incrementUpvotes(slug: string, amount: number = 1): Promise<number> {
  const docRef = doc(db, 'upvotes', slug);
  try {
    // Try to update first
    await updateDoc(docRef, {
      count: increment(amount),
    });
    // Return the updated value if we can fetch it, or just return locally calculated value
    return amount;
  } catch (e) {
    // If the doc doesn't exist, create it
    try {
      await setDoc(docRef, { count: amount });
      return amount;
    } catch (err) {
      console.error(`[upvotes] Failed to increment upvotes for ${slug}:`, err);
      throw err;
    }
  }
}
