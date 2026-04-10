import { PILLAR_COLORS, formatIcon } from '../constants';

const TABLE_FILTERS = ['all', 'Reel', 'Carrossel', 'Post', 'Educação', 'Antes/Depois', 'Humanização'];

export default function PostsTable({ posts, tableFilter, onFilterChange, onSort, onPostClick, onDeletePost, onAddPost }) {
  return (
    <div className="card grid-full">
      <div className="card-header">
        <h2>📋 Lista de Posts Planejados</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="badge">{posts.length} posts</span>
          <button className="btn-add-post" onClick={onAddPost}>+ Novo Post</button>
        </div>
      </div>
      <div className="card-body">
        <div className="filter-tabs">
          {TABLE_FILTERS.map((filter) => (
            <button
              key={filter}
              className={`tab-btn ${tableFilter === filter ? 'active' : ''}`}
              onClick={() => onFilterChange(filter)}
            >
              {filter === 'all' ? 'Todos' : filter}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="posts-table">
            <thead>
              <tr>
                <th onClick={() => onSort('date')}>Data ↕</th>
                <th onClick={() => onSort('title')}>Título / Ideia ↕</th>
                <th onClick={() => onSort('format')}>Formato ↕</th>
                <th onClick={() => onSort('tags')}>Etiquetas ↕</th>
                <th onClick={() => onSort('status')}>Status ↕</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const d = new Date(post.date + 'T12:00:00');
                return (
                  <tr key={post.id}>
                    <td>
                      <strong>
                        {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </strong>
                    </td>
                    <td className="post-title-cell" onClick={() => onPostClick(post)}>
                      {formatIcon(post.format)} {post.title}
                    </td>
                    <td><span className="format-tag">{post.format}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(post.tags ?? []).map((tag) => {
                          const pc = PILLAR_COLORS[tag] || PILLAR_COLORS['Especial'];
                          return (
                            <span key={tag} className={`post-pill ${pc.cls}`}>{tag}</span>
                          );
                        })}
                        {(post.tags ?? []).length === 0 && (
                          <span style={{ color: '#9E9E9E', fontSize: '12px', fontStyle: 'italic' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td><span className="status-tag">{post.status}</span></td>
                    <td className="notes-cell">{post.notes}</td>
                    <td>
                      <button
                        className="icon-btn"
                        title="Excluir post"
                        onClick={() => onDeletePost(post)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#9E9E9E', fontStyle: 'italic' }}>
                    Nenhum post encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
