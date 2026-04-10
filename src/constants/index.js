export const PILLAR_COLORS = {
  'Educação':       { bg: '#E3F2FD', color: '#1565C0', cls: 'pill-educacao' },
  'Antes/Depois':   { bg: '#E8F5E9', color: '#1B5E20', cls: 'pill-antes-depois' },
  'Humanização':    { bg: '#FFF8E1', color: '#E65100', cls: 'pill-humanizacao' },
  'Prova Social':   { bg: '#F3E5F5', color: '#6A1B9A', cls: 'pill-prova-social' },
  'Produtos':       { bg: '#FCE4EC', color: '#C2185B', cls: 'pill-produtos' },
  'Entretenimento': { bg: '#E0F7FA', color: '#006064', cls: 'pill-entretenimento' },
  'Especial':       { bg: '#FFF3E0', color: '#BF360C', cls: 'pill-especial' },
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const _today = new Date();
export const TODAY_STR   = `${_today.getFullYear()}-${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`;
export const CURRENT_YEAR = 2026;

const P = (id, date, title, format, pillar, status, notes) => ({
  id, date, title, format,
  tags: [pillar],
  status,
  notes,
  attachments: [],
  coverId: null,
  approved: false,
  history: [],
});

export const INITIAL_POSTS = [
  // ── ABRIL ──────────────────────────────────────────────────────────────────
  P(1,  '2026-04-09', '[HOJE] Planejamento e kick-off do calendário',   'Stories',  'Humanização',    'Publicado', 'Anunciar novidades e conteúdos que vêm por aí. Gera expectativa.'),
  P(2,  '2026-04-11', 'Antes e Depois: Banho do Bolinha',               'Reel',     'Antes/Depois',   'Planejado', 'Nomear o pet, mostrar processo + resultado. Música trending.'),
  P(3,  '2026-04-14', 'Como escolher a ração certa para seu cão',       'Carrossel','Educação',       'Planejado', '6-8 slides. Dica sobre porte, raça e faixa etária. CTA: venha na loja.'),
  P(4,  '2026-04-16', 'Um dia na Agromari com o Ivonir',                'Reel',     'Humanização',    'Planejado', 'Bastidores: chegada, atendimento, tele entrega. Humaniza a marca.'),
  P(5,  '2026-04-18', 'Com Agromari! ❤️ — Pets da semana',             'Carrossel','Prova Social',   'Planejado', 'Fotos de clientes. Marcar tutores. Gera repostagem.'),
  P(6,  '2026-04-21', '15 anos de tosa: o que aprendi (Pt.1)',          'Reel',     'Educação',       'Planejado', 'Mari fala diretamente para câmera. Autoridade + conexão.'),
  P(7,  '2026-04-23', 'Antes e Depois: Transformação da Luna',          'Reel',     'Antes/Depois',   'Planejado', 'Schnauzer ou similar. Efeito dramático de reveal.'),
  P(8,  '2026-04-25', 'Rações a granel: tudo que você precisa saber',   'Carrossel','Produtos',       'Planejado', 'Benefícios, como funciona, preço acessível. CTA para a loja.'),
  P(9,  '2026-04-28', 'Frases que todo dono de pet já ouviu',           'Reel',     'Entretenimento', 'Planejado', 'Humor + identificação. Alto potencial de compartilhamento.'),
  P(10, '2026-04-30', 'Mitos e verdades: banho em gatos',               'Carrossel','Educação',       'Planejado', 'Quebra de crenças. Foco em tutores de gatos (segmento crescente).'),
  // ── MAIO ───────────────────────────────────────────────────────────────────
  P(11, '2026-05-02', 'Antes e Depois: Transformação do Max',            'Reel',     'Antes/Depois',   'Planejado', 'Golden ou raça popular. Música em alta no Instagram.'),
  P(12, '2026-05-05', 'Erros que tutores cometem na higiene do pet',     'Carrossel','Educação',       'Planejado', 'Formato "você sabia que...". Quebra de crença + dica prática.'),
  P(13, '2026-05-07', 'Conheça a Mari — Especialista em Tosa',           'Reel',     'Humanização',    'Planejado', 'Apresentação pessoal. 15 anos de experiência. Cria conexão e confiança.'),
  P(14, '2026-05-09', 'Com Agromari! ❤️ — Pets da semana',              'Carrossel','Prova Social',   'Planejado', 'Série recorrente quinzenal. Manter padrão visual.'),
  P(15, '2026-05-12', '🌸 Dia das Mães Pet — Para toda mãe de pet!',    'Post',     'Especial',       'Planejado', 'Data comemorativa! Post emocional. Foto + frase. CTA agendamento.'),
  P(16, '2026-05-14', 'Antes e Depois: Transformação da Mel',            'Reel',     'Antes/Depois',   'Planejado', 'Yorkshire ou Shih Tzu. Detalhes do acabamento da tosa.'),
  P(17, '2026-05-16', 'Tele Busca e Entrega: como funciona?',            'Carrossel','Produtos',       'Planejado', 'Mostrar o passo a passo. Ivonir nas fotos. Diferencial da loja.'),
  P(18, '2026-05-19', 'Sinais que seu pet precisa de dermatologista',    'Reel',     'Educação',       'Planejado', 'Divulga o serviço de vet especialista. Problema → solução = Agromari.'),
  P(19, '2026-05-21', 'Reações dos pets no primeiro banho',              'Reel',     'Entretenimento', 'Planejado', 'Compilado de reações engraçadas. Alto engajamento garantido.'),
  P(20, '2026-05-23', 'Bastidores da Agromari — O dia a dia',            'Carrossel','Humanização',    'Planejado', 'Tour pela loja: cada setor em um slide. Mostra variedade.'),
  P(21, '2026-05-26', 'Antes e Depois: Transformação da semana',         'Reel',     'Antes/Depois',   'Planejado', 'Slot recorrente. Manter frequência semanal deste formato.'),
  P(22, '2026-05-28', 'Quantidade certa de ração por peso do pet',       'Carrossel','Educação',       'Planejado', 'Tabela visual. Muito útil = salvo + compartilhado.'),
  P(23, '2026-05-30', 'Depoimento em vídeo: por que escolhem a Agromari','Reel',     'Prova Social',   'Planejado', 'Gravar depoimento de cliente fiel. Autêntico e persuasivo.'),
];

export const FORMATS = ['Reel', 'Carrossel', 'Post', 'Stories'];
export const STATUSES = ['Planejado', 'Em Produção', 'Pronto', 'Publicado'];
export const PILLARS = Object.keys(PILLAR_COLORS);

const FORMAT_ICONS = {
  'Reel':     '📹',
  'Carrossel':'📖',
  'Stories':  '📲',
};

export const formatIcon = (format) => FORMAT_ICONS[format] ?? '🖼';
