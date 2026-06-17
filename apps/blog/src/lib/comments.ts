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

export interface Comment {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: Timestamp | Date | null;
  isAnonymous: boolean;
}

/**
 * Fetch all comments for a given blog post slug ordered by creation time.
 */
export async function getComments(slug: string): Promise<Comment[]> {
  try {
    const q = query(
      collection(db, 'posts', slug, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    const comments: Comment[] = [];
    snap.forEach(d => {
      const data = d.data();
      comments.push({
        id: d.id,
        authorUid: data.authorUid || '',
        authorName: data.authorName || 'Anonymous',
        authorAvatar: data.authorAvatar || '',
        content: data.content || '',
        createdAt: data.createdAt,
        isAnonymous: data.isAnonymous ?? false,
      });
    });
    return comments;
  } catch (e) {
    console.error(`[comments] Failed to fetch comments for ${slug}:`, e);
    return [];
  }
}

/**
 * Add a new comment to a blog post slug.
 */
export async function addComment(
  slug: string,
  authorUid: string,
  authorName: string,
  authorAvatar: string,
  content: string,
  isAnonymous: boolean
): Promise<Comment> {
  try {
    const colRef = collection(db, 'posts', slug, 'comments');
    const docData = {
      authorUid: isAnonymous ? 'anonymous' : authorUid,
      authorName: isAnonymous ? 'Anonymous' : authorName,
      authorAvatar: isAnonymous ? '' : authorAvatar,
      content: content,
      createdAt: serverTimestamp(),
      isAnonymous: isAnonymous
    };
    const docRef = await addDoc(colRef, docData);
    return {
      id: docRef.id,
      ...docData,
      createdAt: new Date()
    };
  } catch (e) {
    console.error(`[comments] Failed to add comment for ${slug}:`, e);
    throw e;
  }
}

/**
 * Delete a comment by its document ID and post slug.
 */
export async function deleteComment(slug: string, commentId: string): Promise<void> {
  try {
    const docRef = doc(db, 'posts', slug, 'comments', commentId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error(`[comments] Failed to delete comment ${commentId} for ${slug}:`, e);
    throw e;
  }
}
