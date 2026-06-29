import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import type { BookmarkMeta } from './bookmarks';

// A user-curated collection of blog posts. Stored at
// users/{uid}/collections/{collectionId}, with the member posts living in the
// users/{uid}/collections/{collectionId}/posts/{slug} subcollection (each doc
// holding the same BookmarkMeta shape used by bookmarks / reading list).

export interface Collection {
  id: string;
  name: string;
  postCount: number;
  createdAt?: any;
}

export interface CollectionWithMembership extends Collection {
  hasPost: boolean;
}

const MAX_NAME_LEN = 80;

export function normalizeCollectionName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LEN);
}

function _collectionsRef(uid: string) {
  return collection(db, 'users', uid, 'collections');
}

function _collectionDoc(uid: string, cid: string) {
  return doc(db, 'users', uid, 'collections', cid);
}

function _postsRef(uid: string, cid: string) {
  return collection(db, 'users', uid, 'collections', cid, 'posts');
}

function _postDoc(uid: string, cid: string, slug: string) {
  return doc(db, 'users', uid, 'collections', cid, 'posts', slug);
}

function _toCollection(id: string, data: any): Collection {
  return {
    id,
    name: String(data?.name ?? 'Untitled'),
    postCount: typeof data?.postCount === 'number' ? data.postCount : 0,
    createdAt: data?.createdAt ?? null,
  };
}

/** List a user's collections, newest first. */
export async function listCollections(uid: string): Promise<Collection[]> {
  const snap = await getDocs(_collectionsRef(uid));
  const out = snap.docs.map(d => _toCollection(d.id, d.data()));
  out.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return out;
}

/** Create a new (empty) collection. Returns its id. */
export async function createCollection(uid: string, name: string): Promise<string> {
  const ref = await addDoc(_collectionsRef(uid), {
    name: normalizeCollectionName(name) || 'Untitled',
    postCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Rename an existing collection. */
export async function renameCollection(uid: string, cid: string, name: string): Promise<void> {
  await updateDoc(_collectionDoc(uid, cid), {
    name: normalizeCollectionName(name) || 'Untitled',
  });
}

/** Delete a collection along with all of its member-post docs. */
export async function deleteCollection(uid: string, cid: string): Promise<void> {
  const postsSnap = await getDocs(_postsRef(uid, cid));
  await Promise.all(postsSnap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(_collectionDoc(uid, cid));
}

/** Add a post to a collection (idempotent). Bumps postCount only when newly added. */
export async function addPostToCollection(
  uid: string,
  cid: string,
  meta: BookmarkMeta,
): Promise<void> {
  const ref = _postDoc(uid, cid, meta.slug);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  await setDoc(ref, { ...meta, addedAt: serverTimestamp() });
  await updateDoc(_collectionDoc(uid, cid), { postCount: increment(1) });
}

/** Remove a post from a collection (idempotent). Decrements postCount when present. */
export async function removePostFromCollection(
  uid: string,
  cid: string,
  slug: string,
): Promise<void> {
  const ref = _postDoc(uid, cid, slug);
  const existing = await getDoc(ref);
  if (!existing.exists()) return;
  await deleteDoc(ref);
  await updateDoc(_collectionDoc(uid, cid), { postCount: increment(-1) });
}

/** Fetch all post docs for a single collection (for the collection detail view). */
export async function getCollectionPosts(uid: string, cid: string): Promise<BookmarkMeta[]> {
  const snap = await getDocs(_postsRef(uid, cid));
  const docs: (BookmarkMeta & { addedAt?: any })[] = [];
  snap.forEach(d => docs.push(d.data() as BookmarkMeta));
  docs.sort((a, b) => (b.addedAt?.toMillis?.() ?? 0) - (a.addedAt?.toMillis?.() ?? 0));
  return docs;
}

/** Read a single collection's metadata. */
export async function getCollection(uid: string, cid: string): Promise<Collection | null> {
  const snap = await getDoc(_collectionDoc(uid, cid));
  if (!snap.exists()) return null;
  return _toCollection(snap.id, snap.data());
}

/**
 * List collections annotated with whether they already contain the given post.
 * Used by the "Add to collection" picker.
 */
export async function listCollectionsWithMembership(
  uid: string,
  slug: string,
): Promise<CollectionWithMembership[]> {
  const collections = await listCollections(uid);
  const memberships = await Promise.all(
    collections.map(c => getDoc(_postDoc(uid, c.id, slug)).then(s => s.exists()).catch(() => false)),
  );
  return collections.map((c, i) => ({ ...c, hasPost: memberships[i] }));
}
