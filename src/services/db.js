/**
 * Camada de acesso ao Firestore.
 * Todas as funções são assíncronas e disparam erros que o chamador deve capturar.
 *
 * Estrutura do banco:
 *   posts/{id}   → dados do post (sem anexos — imagens requerem Firebase Storage)
 *   settings/options → { availableTags, availableFormats, availableStatuses }
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

const POSTS_COL = 'posts';
const SETTINGS_DOC = doc(db, 'settings', 'options');

// ─── POSTS ────────────────────────────────────────────────────────────────────

/**
 * Carrega todos os posts do Firestore ordenados por data.
 * @returns {Promise<Array>}
 */
export async function loadPosts() {
  const q = query(collection(db, POSTS_COL), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Salva (cria ou atualiza) um post no Firestore.
 * Anexos com URLs temporárias (blob:) são ignorados — não persistem.
 * @param {Object} post
 */
export async function persistPost(post) {
  const { attachments, ...data } = post;

  // Persiste apenas anexos com URL permanente do Firebase Storage
  // (blob: são temporárias; uploading: true significa que o upload ainda está em andamento)
  const safeAttachments = (attachments ?? [])
    .filter((a) => a.url && !a.url.startsWith('blob:') && !a.uploading)
    .map(({ id, name, url, storagePath }) => ({ id, name, url, storagePath }));

  await setDoc(doc(db, POSTS_COL, String(post.id)), {
    ...data,
    id: post.id,
    attachments: safeAttachments,
  });
}

/**
 * Remove um post do Firestore pelo id.
 * @param {number|string} postId
 */
export async function removePost(postId) {
  await deleteDoc(doc(db, POSTS_COL, String(postId)));
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────

/**
 * Carrega as configurações salvas (listas de etiquetas, formatos, status).
 * Retorna null se o documento não existir ainda.
 * @returns {Promise<Object|null>}
 */
export async function loadSettings() {
  const snap = await getDoc(SETTINGS_DOC);
  return snap.exists() ? snap.data() : null;
}

/**
 * Salva as configurações no Firestore (merge: true preserva campos não enviados).
 * @param {{ availableTags: string[], availableFormats: string[], availableStatuses: string[] }} settings
 */
export async function persistSettings(settings) {
  await setDoc(SETTINGS_DOC, settings, { merge: true });
}
