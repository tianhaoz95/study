import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * A Medium-style inline highlight: a span of selected text in a post body
 * with an attached comment/note. Anchored back to the rendered DOM via the
 * exact quote plus a short prefix/suffix context window.
 */
export interface Highlight {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar: string;
  quote: string;
  prefix: string;
  suffix: string;
  comment: string;
  createdAt: Timestamp | Date | null;
  isAnonymous: boolean;
}

/**
 * Fetch all highlights for a given blog post slug, oldest first.
 */
export async function getHighlights(slug: string): Promise<Highlight[]> {
  try {
    const q = query(
      collection(db, 'posts', slug, 'highlights'),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    const highlights: Highlight[] = [];
    snap.forEach(d => {
      const data = d.data();
      highlights.push({
        id: d.id,
        authorUid: data.authorUid || '',
        authorName: data.authorName || 'Anonymous',
        authorAvatar: data.authorAvatar || '',
        quote: data.quote || '',
        prefix: data.prefix || '',
        suffix: data.suffix || '',
        comment: data.comment || '',
        createdAt: data.createdAt,
        isAnonymous: data.isAnonymous ?? false,
      });
    });
    return highlights;
  } catch (e) {
    console.error(`[highlights] Failed to fetch highlights for ${slug}:`, e);
    return [];
  }
}

/**
 * Add a new highlight + comment to a blog post slug.
 */
export async function addHighlight(
  slug: string,
  authorUid: string,
  authorName: string,
  authorAvatar: string,
  quote: string,
  prefix: string,
  suffix: string,
  comment: string,
  isAnonymous: boolean
): Promise<Highlight> {
  try {
    const colRef = collection(db, 'posts', slug, 'highlights');
    const docData = {
      authorUid: isAnonymous ? 'anonymous' : authorUid,
      authorName: isAnonymous ? 'Anonymous' : authorName,
      authorAvatar: isAnonymous ? '' : authorAvatar,
      quote,
      prefix,
      suffix,
      comment,
      createdAt: serverTimestamp(),
      isAnonymous,
    };
    const docRef = await addDoc(colRef, docData);
    return {
      id: docRef.id,
      ...docData,
      createdAt: new Date(),
    };
  } catch (e) {
    console.error(`[highlights] Failed to add highlight for ${slug}:`, e);
    throw e;
  }
}

/**
 * Delete a highlight by its document ID and post slug.
 */
export async function deleteHighlight(slug: string, highlightId: string): Promise<void> {
  try {
    const docRef = doc(db, 'posts', slug, 'highlights', highlightId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error(`[highlights] Failed to delete highlight ${highlightId} for ${slug}:`, e);
    throw e;
  }
}
