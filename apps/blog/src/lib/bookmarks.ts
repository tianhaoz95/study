import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface BookmarkMeta {
  slug: string;
  title: string;
  date: string;
  href: string;
  tags: { text: string; cls: string }[];
}

/**
 * Load all bookmarks for a user. Returns a Set of post slugs.
 */
export async function loadBookmarks(uid: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, 'users', uid, 'bookmarks'));
  const slugs = new Set<string>();
  snap.forEach(d => slugs.add(d.id));
  return slugs;
}

/**
 * Toggle a bookmark for a user. Returns true if the post is now bookmarked,
 * false if it was removed.
 */
export async function toggleBookmark(
  uid: string,
  slug: string,
  meta: BookmarkMeta,
  currentlyBookmarked: boolean,
): Promise<boolean> {
  const ref = doc(db, 'users', uid, 'bookmarks', slug);
  if (currentlyBookmarked) {
    await deleteDoc(ref);
    return false;
  } else {
    await setDoc(ref, {
      ...meta,
      addedAt: serverTimestamp(),
    });
    return true;
  }
}

/**
 * Fetch all bookmark documents (with full metadata) for the bookmarks page.
 */
export async function getBookmarkDocs(uid: string): Promise<BookmarkMeta[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'bookmarks'));
  const docs: (BookmarkMeta & { addedAt?: any })[] = [];
  snap.forEach(d => docs.push(d.data() as BookmarkMeta));
  // Sort by most-recently-added (addedAt descending)
  docs.sort((a, b) => {
    const ta = a.addedAt?.toMillis?.() ?? 0;
    const tb = b.addedAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return docs;
}
