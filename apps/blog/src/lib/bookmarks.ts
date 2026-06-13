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
  readProgress?: number; // 0–100, synced at scroll milestones (bookmarks only)
}

// ── Helpers ──────────────────────────────────────────────────

function _syncProgressToLocalStorage(id: string, data: { readProgress?: number }) {
  if (typeof window === 'undefined') return;
  const remote = data.readProgress ?? 0;
  if (remote > 0) {
    const key = `heji-read-${id}`;
    try {
      const local = parseInt(localStorage.getItem(key) ?? '0', 10);
      if (remote > local) localStorage.setItem(key, String(remote));
    } catch (e) {}
  }
}

// ── Bookmarks ─────────────────────────────────────────────────

/**
 * Load all bookmarks for a user. Returns a Set of post slugs.
 * Side-effect: syncs Firestore readProgress → localStorage (cross-device).
 */
export async function loadBookmarks(uid: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, 'users', uid, 'bookmarks'));
  const slugs = new Set<string>();
  snap.forEach(d => {
    slugs.add(d.id);
    _syncProgressToLocalStorage(d.id, d.data() as { readProgress?: number });
  });
  return slugs;
}

/**
 * Toggle a bookmark. Returns true if now bookmarked, false if removed.
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
    await setDoc(ref, { ...meta, addedAt: serverTimestamp() });
    return true;
  }
}

/**
 * Update the readProgress field on a bookmark document (merge, never overwrites other fields).
 */
export async function updateReadProgress(
  uid: string,
  slug: string,
  pct: number,
): Promise<void> {
  const ref = doc(db, 'users', uid, 'bookmarks', slug);
  await setDoc(ref, { readProgress: pct }, { merge: true });
}

/**
 * Fetch all bookmark docs (with full metadata) for the /bookmarks page.
 */
export async function getBookmarkDocs(uid: string): Promise<BookmarkMeta[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'bookmarks'));
  const docs: (BookmarkMeta & { addedAt?: any })[] = [];
  snap.forEach(d => docs.push(d.data() as BookmarkMeta));
  docs.sort((a, b) => (b.addedAt?.toMillis?.() ?? 0) - (a.addedAt?.toMillis?.() ?? 0));
  return docs;
}

// ── Reading List ──────────────────────────────────────────────

/**
 * Load all reading-list entries. Returns a Set of post slugs.
 * Side-effect: syncs Firestore readProgress → localStorage (cross-device).
 */
export async function loadReadingList(uid: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, 'users', uid, 'readingList'));
  const slugs = new Set<string>();
  snap.forEach(d => {
    slugs.add(d.id);
    _syncProgressToLocalStorage(d.id, d.data() as { readProgress?: number });
  });
  return slugs;
}

/**
 * Toggle a reading-list entry. Returns true if now in list, false if removed.
 */
export async function toggleReadingList(
  uid: string,
  slug: string,
  meta: BookmarkMeta,
  currentlyInList: boolean,
): Promise<boolean> {
  const ref = doc(db, 'users', uid, 'readingList', slug);
  if (currentlyInList) {
    await deleteDoc(ref);
    return false;
  } else {
    await setDoc(ref, { ...meta, addedAt: serverTimestamp() });
    return true;
  }
}

/**
 * Remove a post from the reading list (used for auto-remove at 100% read progress).
 */
export async function removeFromReadingList(uid: string, slug: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'readingList', slug));
}

/**
 * Fetch all reading-list docs for the /reading-list page.
 */
export async function getReadingListDocs(uid: string): Promise<BookmarkMeta[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'readingList'));
  const docs: (BookmarkMeta & { addedAt?: any })[] = [];
  snap.forEach(d => docs.push(d.data() as BookmarkMeta));
  docs.sort((a, b) => (b.addedAt?.toMillis?.() ?? 0) - (a.addedAt?.toMillis?.() ?? 0));
  return docs;
}
