/**
 * Camada de acesso ao Firestore.
 *
 * Estrutura do banco:
 *   clients/{clientId}            → metadados (campo ownerUid identifica o dono)
 *   clients/{clientId}/posts/{id} → posts do cliente
 *   clients/{clientId}/settings/options → configurações
 *   posts/{id}                    → posts legados do Agromari (emilycominn@gmail.com)
 *   settings/options              → configurações legadas do Agromari
 *   tokens/{token}                → tokens de acesso de clientes
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
  where,
} from 'firebase/firestore';

const AGROMARI_ID  = 'agromari';
const CLIENTS_COL  = 'clients';
const TOKENS_COL   = 'tokens';

// E-mail da proprietária dos dados legados (sem ownerUid nos documentos)
const LEGACY_OWNER_EMAIL = 'emilycominn@gmail.com';

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

function sortClients(clients) {
  return [...clients].sort((a, b) => {
    if (a.id === AGROMARI_ID) return -1;
    if (b.id === AGROMARI_ID) return 1;
    return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
  });
}

/**
 * Carrega os clientes do usuário atual.
 * - Filtra por ownerUid === uid.
 * - Se o usuário for o dono legado (sem ownerUid nos docs), migra automaticamente.
 *
 * @param {string} uid    - Firebase Auth uid do usuário
 * @param {string} email  - E-mail do usuário (para detectar dono legado)
 * @returns {Promise<Array>}
 */
export async function loadClients(uid, email) {
  // 1. Busca clientes já marcados com ownerUid do usuário
  const ownedSnap = await getDocs(
    query(collection(db, CLIENTS_COL), where('ownerUid', '==', uid))
  );
  const owned = ownedSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => c.name);

  if (owned.length > 0) return sortClients(owned);

  // 2. Migração: se for o dono legado, marca todos os docs sem ownerUid
  if (email === LEGACY_OWNER_EMAIL) {
    const allSnap = await getDocs(collection(db, CLIENTS_COL));
    const legacy = allSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.name && !c.ownerUid);

    if (legacy.length > 0) {
      await Promise.all(
        legacy.map((c) =>
          setDoc(doc(db, CLIENTS_COL, c.id), { ownerUid: uid }, { merge: true })
        )
      );
      return sortClients(legacy.map((c) => ({ ...c, ownerUid: uid })));
    }
  }

  return [];
}

/**
 * Carrega um único cliente pelo id (sem verificação de dono — usado por tokens).
 * @param {string} clientId
 * @returns {Promise<Object|null>}
 */
export async function getClientById(clientId) {
  const snap = await getDoc(doc(db, CLIENTS_COL, clientId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Salva (cria ou atualiza) metadados de um cliente, sempre marcando o dono.
 * @param {Object} client
 * @param {string} uid - ownerUid do usuário logado
 */
export async function persistClient(client, uid) {
  const data = uid ? { ...client, ownerUid: uid } : client;
  await setDoc(doc(db, CLIENTS_COL, String(client.id)), data);
}

/**
 * Remove o documento de metadados de um cliente.
 * @param {string} clientId
 */
export async function removeClient(clientId) {
  await deleteDoc(doc(db, CLIENTS_COL, String(clientId)));
}

/**
 * Arquiva ou desarquiva um cliente (archived: true/false).
 * @param {string} clientId
 * @param {boolean} archived
 */
export async function setClientArchived(clientId, archived) {
  await setDoc(doc(db, CLIENTS_COL, String(clientId)), { archived }, { merge: true });
}

// ── POSTS ────────────────────────────────────────────────────────────────────

export function subscribePosts(clientId, onUpdate, onError) {
  const q = query(postsCol(clientId), orderBy('date', 'asc'));
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map((d) => d.data())),
    (err)  => onError?.(err),
  );
}

export async function getClientPostsOnce(clientId) {
  const snap = await getDocs(postsCol(clientId));
  return snap.docs.map((d) => d.data());
}

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

export async function removePost(clientId, postId) {
  await deleteDoc(doc(postsCol(clientId), String(postId)));
}

// ── CONFIGURAÇÕES ────────────────────────────────────────────────────────────

export async function loadSettings(clientId) {
  const snap = await getDoc(settingsDoc(clientId));
  return snap.exists() ? snap.data() : null;
}

export async function persistSettings(clientId, settings) {
  await setDoc(settingsDoc(clientId), settings, { merge: true });
}

// ── TOKENS DE ACESSO ─────────────────────────────────────────────────────────

/**
 * Salva um token de acesso rápido para um cliente, registrando o dono.
 * @param {string} clientId
 * @param {string} token
 * @param {string} ownerUid - uid do usuário social-media que gerou o token
 */
export async function createAccessToken(clientId, token, ownerUid) {
  await setDoc(doc(db, TOKENS_COL, token), {
    clientId,
    ownerUid: ownerUid ?? null,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Busca os dados associados a um token.
 * @param {string} token
 * @returns {Promise<{ clientId: string, ownerUid: string|null, createdAt: string } | null>}
 */
export async function lookupToken(token) {
  const snap = await getDoc(doc(db, TOKENS_COL, token));
  return snap.exists() ? snap.data() : null;
}

/**
 * Retorna o token de acesso existente do cliente ou gera um novo, armazenando-o
 * no documento do cliente para reutilização futura.
 * @param {boolean} forceNew - Se true, sempre gera um token novo (ex: "Gerar novo link")
 */
// ── TAREFAS ──────────────────────────────────────────────────────────────────

function tasksCol(uid) {
  return collection(db, 'users', uid, 'tasks');
}

export function subscribeTasks(uid, onData, onError) {
  const q = query(tasksCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}

export async function persistTask(uid, task) {
  const id = task.id ?? `task_${Date.now()}`;
  await setDoc(doc(tasksCol(uid), id), { ...task, id }, { merge: true });
  return id;
}

export async function removeTask(uid, taskId) {
  await deleteDoc(doc(tasksCol(uid), taskId));
}

// ── TOKENS ───────────────────────────────────────────────────────────────────

export async function getOrCreateClientToken(clientId, ownerUid, forceNew = false) {
  if (!forceNew) {
    const clientSnap = await getDoc(doc(db, CLIENTS_COL, String(clientId)));
    if (clientSnap.exists() && clientSnap.data().latestToken) {
      return clientSnap.data().latestToken;
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  const token = Array.from(arr, (b) => chars[b % chars.length]).join('');
  await setDoc(doc(db, TOKENS_COL, token), {
    clientId,
    ownerUid: ownerUid ?? null,
    createdAt: new Date().toISOString(),
  });
  await setDoc(doc(db, CLIENTS_COL, String(clientId)), { latestToken: token }, { merge: true });
  return token;
}
