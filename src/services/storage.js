/**
 * Camada de acesso ao Firebase Storage.
 * Todas as imagens ficam em: attachments/{attachmentId}
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../firebase';

const storage = getStorage(app);

/**
 * Faz upload de um arquivo para o Firebase Storage.
 * @param {string} storagePath  Ex: "attachments/1717000000123"
 * @param {File}   file         Arquivo selecionado pelo usuário
 * @returns {Promise<string>}   URL permanente de download
 */
export async function uploadAttachment(storagePath, file) {
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

/**
 * Remove um arquivo do Firebase Storage.
 * Não lança erro se o arquivo já não existir.
 * @param {string} storagePath
 */
export async function deleteAttachment(storagePath) {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    if (err.code !== 'storage/object-not-found') {
      console.error('Erro ao excluir anexo do Storage:', err);
    }
  }
}
