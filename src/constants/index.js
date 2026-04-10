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

export const TODAY_STR = '2026-04-09';
export const CURRENT_YEAR = 2026;

export const INITIAL_POSTS = [
  { id: 1, date: '2026-04-11', title: 'Antes e Depois: Banho do Bolinha', format: 'Reel', tags: ['Antes/Depois'], status: 'Planejado', notes: 'Nomear o pet, mostrar processo + resultado.', attachments: [], coverId: null, approved: false },
  { id: 2, date: '2026-04-14', title: 'Como escolher a ração certa para seu cão', format: 'Carrossel', tags: ['Educação'], status: 'Planejado', notes: '6-8 slides. Dica sobre porte, raça.', attachments: [], coverId: null, approved: false },
  { id: 3, date: '2026-04-16', title: 'Um dia na Agromari com o Ivonir', format: 'Reel', tags: ['Humanização'], status: 'Planejado', notes: 'Bastidores: chegada, atendimento.', attachments: [], coverId: null, approved: false },
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
