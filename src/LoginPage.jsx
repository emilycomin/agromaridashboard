import './LoginPage.css';

export default function LoginPage({ onSelectRole }) {
  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">🐾</div>
        <h1 className="login-title">AGROMARI PETSHOP</h1>
        <p className="login-sub">Dashboard de Conteúdo Instagram · @agro.mari</p>
        <p className="login-prompt">Selecione seu perfil para continuar</p>

        <div className="login-cards">
          <button className="login-card login-card-social" onClick={() => onSelectRole('social-media')}>
            <div className="login-card-icon">✏️</div>
            <div className="login-card-title">Social Media</div>
            <div className="login-card-desc">
              Acesso completo ao painel — crie, edite e gerencie todos os conteúdos
            </div>
          </button>

          <button className="login-card login-card-cliente" onClick={() => onSelectRole('cliente')}>
            <div className="login-card-icon">👁</div>
            <div className="login-card-title">Cliente</div>
            <div className="login-card-desc">
              Visualize o calendário editorial e os conteúdos planejados
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
