/**
 * Camada de acesso ao Firestore.
 * Todas as funções recebem `clientId` como primeiro argumento.
 *
 * Estrutura do banco:
 *   Agromari (legado)  → posts/{id}  |  settings/options
 *   Novos clientes     → clients/{clientId}/posts/{id}
 *                        clients/{clientId}/settings/options
 *   Metadados          → clients/{clientId}  (documento raiz)
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

const AGROMARI_ID  = 'agromari';
const CLIENTS_COL  = 'clients';

// ── Helpers de path ──────────────────────────────────────────────────────────

function postsCol(clientId) {
  return clientId === AGROMARI_ID
    ? collection(db, 'posts')
    : collection(db, CLIENTS_COL, clientId, 'posts');
}

function settingsDoc(clientId) {
  return clientId === AGROMARI_ID
    ? doc(db, 'settings', 'options')
    : doc(db, CLIENTS_COL, clientId, 'settings', 'options');
}

// ── CLIENTES ─────────────────────────────────────────────────────────────────

/**
 * Carrega todos os clientes cadastrados.
 * @returns {Promise<Array>}
 */
export async function loadClients() {
  const snap = await getDocs(collection(db, CLIENTS_COL));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => c.name); // apenas documentos com metadados completos
}

/**
 * Salva (cria ou atualiza) metadados de um cliente.
 * @param {Object} client
 */
export async function persistClient(client) {
  await setDoc(doc(db, CLIENTS_COL, String(client.id)), client);
}

/**
 * Remove o documento de metadados de um cliente.
 * (posts/settings em sub-coleções são separados)
 * @param {string} clientId
 */
export async function removeClient(clientId) {
  await deleteDoc(doc(db, CLIENTS_COL, String(clientId)));
}

// ── POSTS ────────────────────────────────────────────────────────────────────

/**
 * Assina atualizações em tempo real da coleção de posts do cliente.
 * @param {string}                   clientId
 * @param {(posts: Array) => void}   onUpdate
 * @param {(err: Error) => void}     onError
 * @returns {() => void} unsubscribe
 */
export function subscribePosts(clientId, onUpdate, onError) {
  const q = query(postsCol(clientId), orderBy('date', 'asc'));
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map((d) => d.data())),
    (err)  => onError?.(err),
  );
}

/**
 * Salva (cria ou atualiza) um post no Firestore.
 * @param {string} clientId
 * @param {Object} post
 */
export async function persistPost(clientId, post) {
  const { attachments, ...data } = post;

  const safeAttachments = (attachments ?? [])
    .filter((a) => a.url && !a.url.startsWith('blob:') && !a.uploading)
    .map(({ id, name, url, storagePath }) => ({ id, name, url, storagePath }));

  await setDoc(doc(postsCol(clientId), String(post.id)), {
    ...data,
    id: post.id,
    attachments: safeAttachments,
  });
}

/**
 * Remove um post do Firestore.
 * @param {string}        clientId
 * @param {number|string} postId
 */
export async function removePost(clientId, postId) {
  await deleteDoc(doc(postsCol(clientId), String(postId)));
}

// ── CONFIGURAÇÕES ────────────────────────────────────────────────────────────

/**
 * Carrega as configurações do cliente.
 * @param {string} clientId
 * @returns {Promise<Object|null>}
 */
export async function loadSettings(clientId) {
  const snap = await getDoc(settingsDoc(clientId));
  return snap.exists() ? snap.data() : null;
}

/**
 * Salva as configurações do cliente.
 * @param {string} clientId
 * @param {{ availableTags, availableFormats, availableStatuses }} settings
 */
export async function persistSettings(clientId, settings) {
  await setDoc(settingsDoc(clientId), settings, { merge: true });
}
