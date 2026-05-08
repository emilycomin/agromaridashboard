/**
 * seed-lumina.mjs
 * Creates the "Lumina Beauty Tech" client and adds 7 Week-1 posts to Firestore.
 *
 * Run: node scripts/seed-lumina.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC0nuATe5xK9A2qr7rK4c4zDSiIwQQMNsQ',
  authDomain: 'agromari-dashboard.firebaseapp.com',
  projectId: 'agromari-dashboard',
  storageBucket: 'agromari-dashboard.firebasestorage.app',
  messagingSenderId: '273759646475',
  appId: '1:273759646475:web:5fdca85f7ceee92dbe680e',
};

const OWNER_UID = '5NKcQwJ40eeh0Rdxm7eWasHdTPy2'; // emilycominn@gmail.com

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const WEEK_START = '2026-04-28'; // Monday

function dateOffset(base, days) {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const POSTS = [
  {
    day: 0,
    format: 'Reel',
    title: 'Tour pelo salão: Foco na arquitetura moderna, iluminação e nas estações com suporte para notebook.',
    notes: 'Objetivo: Atrair pelo visual e infraestrutura. Mostrar o ambiente moderno, iluminação cuidada e as estações equipadas com suporte para notebook.',
    tags: ['Institucional'],
  },
  {
    day: 1,
    format: 'Carrossel',
    title: 'Por que o seu tempo vale ouro: Mostrando a facilidade do nosso agendamento 100% digital e rápido.',
    notes: 'Objetivo: Destacar a praticidade tecnológica. Mostrar o passo a passo do agendamento online, reforçando a rapidez e conveniência.',
    tags: ['Educação'],
  },
  {
    day: 2,
    format: 'Stories',
    title: "Enquete: 'Você costuma responder e-mails/mensagens enquanto faz o cabelo/unha?' + Prova do Wi-Fi rápido do salão.",
    notes: 'Objetivo: Interação e reconhecimento de rotina. Usar enquete para engajar e depois apresentar o Wi-Fi de alta velocidade como solução.',
    tags: ['Engajamento'],
  },
  {
    day: 3,
    format: 'Post',
    title: 'Close-up estético: Detalhe minimalista do salão com uma frase sobre como a imagem pessoal reflete nos negócios.',
    notes: 'Objetivo: Inspirar e reforçar autoridade. Foto de detalhe do ambiente com frase de impacto sobre imagem pessoal e sucesso profissional.',
    tags: ['Inspiração'],
  },
  {
    day: 4,
    format: 'Reel',
    title: 'Antes/Depois (Tratamento Express): Transformação rápida de uma cliente que aproveitou o horário de almoço.',
    notes: 'Objetivo: Prova social de agilidade e resultado. Mostrar transformação completa em pouco tempo, ideal para quem tem agenda cheia.',
    tags: ['Prova Social'],
  },
  {
    day: 5,
    format: 'Carrossel',
    title: 'Mitos e Verdades: Quebrando objeções sobre tratamentos capilares acelerados por novas tecnologias.',
    notes: 'Objetivo: Educar a audiência. Desmistificar medos sobre tecnologia nos tratamentos e mostrar resultados comprovados.',
    tags: ['Educação'],
  },
  {
    day: 6,
    format: 'Stories',
    title: "Caixinha de Perguntas: 'Qual a sua maior dificuldade para encaixar o autocuidado na rotina corrida?'",
    notes: 'Objetivo: Pesquisa de dores do público. Coletar respostas para criar conteúdo futuro e mostrar que o salão entende a rotina do cliente.',
    tags: ['Engajamento'],
  },
];

async function main() {
  // 1. Find or create the Lumina client
  const existingSnap = await getDocs(
    query(collection(db, 'clients'), where('name', '==', 'LUMINA BEAUTY TECH'))
  );

  let clientId;
  if (!existingSnap.empty) {
    clientId = existingSnap.docs[0].id;
    console.log(`Found existing client: LUMINA BEAUTY TECH (id: ${clientId})`);
  } else {
    clientId = `client_${Date.now()}`;
    await setDoc(doc(db, 'clients', clientId), {
      id: clientId,
      name: 'LUMINA BEAUTY TECH',
      handle: '@luminabeautytech',
      description: 'Salão de beleza tech-friendly para profissionais modernos',
      emoji: '💄',
      color: '#C2185B',
      phone: '',
      ownerUid: OWNER_UID,
      createdAt: new Date().toISOString(),
      archived: false,
    });
    console.log(`Created new client: LUMINA BEAUTY TECH (id: ${clientId})`);
  }

  // 2. Add the 7 posts
  const postsCol = collection(db, 'clients', clientId, 'posts');

  for (const p of POSTS) {
    const id   = `lumina_w1_d${p.day + 1}`;
    const date = dateOffset(WEEK_START, p.day);
    const post = {
      id,
      date,
      title:       p.title,
      format:      p.format,
      status:      'Planejado',
      tags:        p.tags,
      notes:       p.notes,
      approved:    false,
      attachments: [],
      history:     [],
    };
    await setDoc(doc(postsCol, id), post);
    console.log(`  ✓ Day ${p.day + 1} (${date}) — ${p.format}: ${p.title.slice(0, 55)}…`);
  }

  console.log('\nDone! Lumina Beauty Tech + 7 posts created.');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
