import './LandingPage.css';

export default function LandingPage({ onLogin }) {
  return (
    <div className="lp-root">
      {/* NAVBAR */}
      <nav className="lp-nav">
        <div className="lp-nav-logo">Flow<span>ly</span></div>
        <ul className="lp-nav-links">
          <li><a href="#funcionalidades">Funcionalidades</a></li>
          <li><a href="#analytics">Analytics</a></li>
          <li><a href="#clientes">Clientes</a></li>
          <li><a href="#planos">Planos</a></li>
        </ul>
        <div className="lp-nav-cta">
          <button className="lp-btn-outline" onClick={onLogin}>Entrar</button>
          <button className="lp-btn-primary" onClick={onLogin}>Comece grátis</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="lp-hero-wrap">
        <div className="lp-hero">
          <div>
            <div className="lp-hero-badge">Plataforma para agências de marketing</div>
            <h1>Sua agência no controle.<br/><span>Seus clientes</span> impressionados.</h1>
            <p className="lp-hero-sub">Crie, agende, analise e gerencie tudo em um só lugar — do post do Instagram ao relatório mensal do cliente.</p>
            <form className="lp-hero-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Seu melhor e-mail"/>
              <button className="lp-btn-primary" onClick={onLogin}>Começar de graça →</button>
            </form>
            <p className="lp-hero-disclaimer">Grátis por 14 dias. Sem cartão de crédito. Ao se inscrever, você concorda com os <a href="#">Termos de Uso</a>.</p>
          </div>

          <div className="lp-hero-visual">
            <div className="lp-float-badge one">
              <span style={{fontSize:'1.1rem'}}>📈</span>
              <div>
                <div style={{fontSize:'0.7rem',color:'#6B6B80',fontWeight:500}}>Alcance esta semana</div>
                <div style={{fontSize:'0.9rem',color:'#1A1A2E'}}>+38% de crescimento</div>
              </div>
            </div>
            <div className="lp-float-badge two">
              <span style={{fontSize:'1.1rem'}}>✅</span>
              <div>
                <div style={{fontSize:'0.7rem',color:'#6B6B80',fontWeight:500}}>Aprovado pelo cliente</div>
                <div style={{fontSize:'0.9rem',color:'#1A1A2E'}}>Campanha Junho</div>
              </div>
            </div>

            <div className="lp-mockup-card">
              <div className="lp-mockup-header">
                <div className="lp-dot red"></div>
                <div className="lp-dot yellow"></div>
                <div className="lp-dot green"></div>
                <span className="lp-mockup-title">📅 Calendário de Conteúdo — Maio</span>
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-row">
                  <div>
                    <div className="lp-mockup-col-label">📝 Planejado</div>
                    <div className="lp-post-card">
                      <span className="lp-post-card-tag lp-tag-instagram">Instagram</span>
                      <div className="lp-post-card-title">Lançamento coleção verão — carrossel</div>
                      <div className="lp-post-card-meta">
                        <span className="lp-post-card-date">16 mai</span>
                        <div className="lp-avatar-stack">
                          <div className="lp-avatar" style={{background:'#6C63FF'}}>A</div>
                          <div className="lp-avatar" style={{background:'#43C59E'}}>M</div>
                        </div>
                      </div>
                    </div>
                    <div className="lp-post-card">
                      <span className="lp-post-card-tag lp-tag-linkedin">LinkedIn</span>
                      <div className="lp-post-card-title">Case de sucesso — cliente B</div>
                      <div className="lp-post-card-meta">
                        <span className="lp-post-card-date">18 mai</span>
                        <div className="lp-avatar-stack">
                          <div className="lp-avatar" style={{background:'#FF6B6B'}}>C</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="lp-mockup-col-label">⚡ Em produção</div>
                    <div className="lp-post-card">
                      <span className="lp-post-card-tag lp-tag-tiktok">TikTok</span>
                      <div className="lp-post-card-title">Bastidores da marca — vídeo curto</div>
                      <div className="lp-post-card-meta">
                        <span className="lp-post-card-date">14 mai</span>
                        <div className="lp-avatar-stack">
                          <div className="lp-avatar" style={{background:'#FFB347'}}>R</div>
                          <div className="lp-avatar" style={{background:'#6C63FF'}}>A</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="lp-mockup-col-label">✅ Publicado</div>
                    <div className="lp-post-card">
                      <span className="lp-post-card-tag lp-tag-facebook">Facebook</span>
                      <div className="lp-post-card-title">Promoção dia das mães</div>
                      <div className="lp-post-card-meta">
                        <span className="lp-post-card-date">12 mai</span>
                        <div className="lp-avatar-stack">
                          <div className="lp-avatar" style={{background:'#43C59E'}}>M</div>
                        </div>
                      </div>
                    </div>
                    <div className="lp-post-card">
                      <span className="lp-post-card-tag lp-tag-instagram">Instagram</span>
                      <div className="lp-post-card-title">Stories de produto — reels</div>
                      <div className="lp-post-card-meta">
                        <span className="lp-post-card-date">10 mai</span>
                        <div className="lp-avatar-stack">
                          <div className="lp-avatar" style={{background:'#FF6B6B'}}>C</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BRAND STRIP */}
      <div className="lp-brand-strip">
        <p>Confiado por agências que crescem de verdade</p>
        <div className="lp-brand-logos">
          <span className="lp-brand-logo">Agência Nova</span>
          <span className="lp-brand-logo">Studio Digital</span>
          <span className="lp-brand-logo">MidiaLab</span>
          <span className="lp-brand-logo">CreativeCo</span>
          <span className="lp-brand-logo">BrandHouse</span>
        </div>
      </div>

      {/* PILARES */}
      <div className="lp-section-wrap" id="funcionalidades">
        <div className="lp-section-inner">
          <div className="lp-pillars-header">
            <div className="lp-section-tag">Sua superplataforma de marketing</div>
            <h2 className="lp-section-title">Tudo que sua agência precisa,<br/>em um só lugar</h2>
            <p className="lp-section-desc">Esqueça os 10 apps abertos ao mesmo tempo. Com a Flowly, sua equipe tem o que precisa — do planejamento à entrega.</p>
          </div>
          <div className="lp-pillars-grid">
            <div className="lp-pillar-card">
              <div className="lp-pillar-icon purple">📅</div>
              <h3>Conteúdo sem caos</h3>
              <p>Planeje, crie e agende posts para todos os seus clientes. Calendário visual, aprovação integrada e publicação automática.</p>
              <ul className="lp-pillar-list">
                <li>Calendário visual por cliente</li>
                <li>Agendamento em múltiplas redes</li>
                <li>Fluxo de aprovação com o cliente</li>
                <li>Biblioteca de assets compartilhada</li>
              </ul>
            </div>
            <div className="lp-pillar-card">
              <div className="lp-pillar-icon green">📊</div>
              <h3>Métricas que fazem sentido</h3>
              <p>Relatórios visuais prontos pra apresentar. Entenda o que está funcionando e mostre resultado pro cliente — sem planilha nenhuma.</p>
              <ul className="lp-pillar-list">
                <li>Dashboard em tempo real</li>
                <li>Relatórios com a sua marca</li>
                <li>Comparativos entre períodos</li>
                <li>Insights automáticos de performance</li>
              </ul>
            </div>
            <div className="lp-pillar-card">
              <div className="lp-pillar-icon orange">👥</div>
              <h3>Equipe organizada</h3>
              <p>Perfis por função, tarefas atribuídas e tudo centralizado. Cada pessoa da equipe sabe exatamente o que precisa fazer e quando.</p>
              <ul className="lp-pillar-list">
                <li>Perfis por função (designer, copywriter…)</li>
                <li>Gerenciador de tarefas integrado</li>
                <li>Atribuição de tarefas por usuário</li>
                <li>Visão geral do time em tempo real</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ANALYTICS FEATURE */}
      <div className="lp-section-wrap light" id="analytics">
        <div className="lp-section-inner">
          <div className="lp-feature-split">
            <div>
              <div className="lp-section-tag">Analytics & Relatórios</div>
              <h2 className="lp-section-title">Dados que convencem.<br/>Relatórios que impressionam.</h2>
              <p className="lp-section-desc">Chega de montar relatório manual toda semana. Com a Flowly você exporta um PDF da sua marca em segundos.</p>
              <div className="lp-feature-items">
                <div className="lp-feature-item">
                  <div className="lp-feature-item-icon">🔮</div>
                  <div>
                    <h4>Insights automáticos</h4>
                    <p>A plataforma identifica o que está performando melhor e sugere os próximos passos pra você.</p>
                  </div>
                </div>
                <div className="lp-feature-item">
                  <div className="lp-feature-item-icon">📄</div>
                  <div>
                    <h4>Relatório em PDF com sua marca</h4>
                    <p>Gere relatórios personalizados com o logo da agência pra enviar direto pro cliente.</p>
                  </div>
                </div>
                <div className="lp-feature-item">
                  <div className="lp-feature-item-icon">🌐</div>
                  <div>
                    <h4>Todas as redes em um dashboard</h4>
                    <p>Instagram, TikTok, Facebook, LinkedIn — tudo consolidado numa visão só.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lp-analytics-card">
              <div className="lp-analytics-header-row">
                <span className="lp-analytics-title">📊 Performance — Maio 2025</span>
                <span className="lp-analytics-badge">↑ +24% vs abril</span>
              </div>
              <div className="lp-stats-row">
                <div className="lp-stat-box">
                  <div className="lp-stat-val">127K</div>
                  <div className="lp-stat-change">↑ +18%</div>
                  <div className="lp-stat-label">Alcance</div>
                </div>
                <div className="lp-stat-box">
                  <div className="lp-stat-val">8.4%</div>
                  <div className="lp-stat-change">↑ +3.1pp</div>
                  <div className="lp-stat-label">Engajamento</div>
                </div>
                <div className="lp-stat-box">
                  <div className="lp-stat-val">342</div>
                  <div className="lp-stat-change">↑ +61</div>
                  <div className="lp-stat-label">Seguidores</div>
                </div>
              </div>
              <div className="lp-chart-area">
                <div className="lp-chart-label">Engajamento por dia</div>
                <div className="lp-bar-chart">
                  <div className="lp-bar" style={{height:'40%',background:'#EEF0FF'}}></div>
                  <div className="lp-bar" style={{height:'55%',background:'#EEF0FF'}}></div>
                  <div className="lp-bar" style={{height:'50%',background:'#EEF0FF'}}></div>
                  <div className="lp-bar" style={{height:'70%',background:'#6C63FF'}}></div>
                  <div className="lp-bar" style={{height:'60%',background:'#EEF0FF'}}></div>
                  <div className="lp-bar" style={{height:'80%',background:'#9B6EFF'}}></div>
                  <div className="lp-bar" style={{height:'100%',background:'#6C63FF'}}></div>
                  <div className="lp-bar" style={{height:'75%',background:'#EEF0FF'}}></div>
                  <div className="lp-bar" style={{height:'65%',background:'#EEF0FF'}}></div>
                  <div className="lp-bar" style={{height:'90%',background:'#9B6EFF'}}></div>
                  <div className="lp-bar" style={{height:'85%',background:'#EEF0FF'}}></div>
                  <div className="lp-bar" style={{height:'95%',background:'#6C63FF'}}></div>
                </div>
              </div>
              <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.72rem',color:'#6B6B80'}}>
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#E91E8C'}}></div>Instagram
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.72rem',color:'#6B6B80'}}>
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#0077B5'}}></div>LinkedIn
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.72rem',color:'#6B6B80'}}>
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#6E2EBD'}}></div>TikTok
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EQUIPE FEATURE */}
      <div className="lp-section-wrap" id="clientes">
        <div className="lp-section-inner">
          <div className="lp-feature-split reverse">
            <div className="lp-client-mockup">
              <div className="lp-client-mockup-header">
                <span>👥 Equipe — Campanha Verão</span>
                <span style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.5)'}}>6 tarefas abertas</span>
              </div>
              <div className="lp-client-mockup-body">
                <div className="lp-client-row">
                  <div className="lp-client-avatar" style={{background:'#6C63FF'}}>AM</div>
                  <div className="lp-client-info">
                    <div className="lp-client-name">Ana Martins <span style={{fontSize:'0.65rem',color:'#6C63FF',fontWeight:700,background:'#EEF0FF',padding:'1px 6px',borderRadius:'4px',marginLeft:'4px'}}>Designer</span></div>
                    <div className="lp-client-sub">Criar arte stories · Prazo: hoje</div>
                  </div>
                  <span className="lp-client-status lp-status-review">Em andamento</span>
                </div>
                <div className="lp-client-row">
                  <div className="lp-client-avatar" style={{background:'#43C59E'}}>RC</div>
                  <div className="lp-client-info">
                    <div className="lp-client-name">Rafael Costa <span style={{fontSize:'0.65rem',color:'#43C59E',fontWeight:700,background:'#E6FAF5',padding:'1px 6px',borderRadius:'4px',marginLeft:'4px'}}>Copywriter</span></div>
                    <div className="lp-client-sub">Redigir legenda carrossel · Prazo: amanhã</div>
                  </div>
                  <span className="lp-client-status lp-status-active">Concluído</span>
                </div>
                <div className="lp-client-row">
                  <div className="lp-client-avatar" style={{background:'#FFB347'}}>JS</div>
                  <div className="lp-client-info">
                    <div className="lp-client-name">Julia Souza <span style={{fontSize:'0.65rem',color:'#FFB347',fontWeight:700,background:'#FFF4E6',padding:'1px 6px',borderRadius:'4px',marginLeft:'4px'}}>Gestora</span></div>
                    <div className="lp-client-sub">Revisar calendário de maio · Prazo: sex</div>
                  </div>
                  <span className="lp-client-status lp-status-pending">Pendente</span>
                </div>
                <div className="lp-client-row">
                  <div className="lp-client-avatar" style={{background:'#FF6B6B'}}>PL</div>
                  <div className="lp-client-info">
                    <div className="lp-client-name">Pedro Lima <span style={{fontSize:'0.65rem',color:'#E91E8C',fontWeight:700,background:'#FFE0EC',padding:'1px 6px',borderRadius:'4px',marginLeft:'4px'}}>Designer</span></div>
                    <div className="lp-client-sub">Editar vídeo reels · Prazo: qui</div>
                  </div>
                  <span className="lp-client-status lp-status-review">Em andamento</span>
                </div>
                <div style={{textAlign:'center',padding:'12px',fontSize:'0.8rem',color:'#6C63FF',fontWeight:600,cursor:'pointer'}}>Ver todas as tarefas →</div>
              </div>
            </div>
            <div>
              <div className="lp-section-tag">Gestão de Equipe</div>
              <h2 className="lp-section-title">Cada um sabe o que<br/>fazer. E quando.</h2>
              <p className="lp-section-desc">Defina perfis por função, atribua tarefas e acompanhe tudo em tempo real. Chega de cobrar por mensagem.</p>
              <div className="lp-feature-items">
                <div className="lp-feature-item">
                  <div className="lp-feature-item-icon">🎨</div>
                  <div>
                    <h4>Perfis por função</h4>
                    <p>Crie perfis de Designer, Copywriter, Gestor ou qualquer função que sua agência precisar.</p>
                  </div>
                </div>
                <div className="lp-feature-item">
                  <div className="lp-feature-item-icon">✅</div>
                  <div>
                    <h4>Gerenciador de tarefas integrado</h4>
                    <p>Crie, priorize e acompanhe tarefas sem sair da plataforma — tudo ligado ao conteúdo e ao cliente.</p>
                  </div>
                </div>
                <div className="lp-feature-item">
                  <div className="lp-feature-item-icon">🎯</div>
                  <div>
                    <h4>Atribuição por usuário</h4>
                    <p>Cada tarefa vai direto pra quem precisa fazer. Com prazo, contexto e notificação automática.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS DARK */}
      <div className="lp-stats-dark">
        <div className="lp-stats-grid">
          <div className="lp-stats-left">
            <h2>Agências com plataforma integrada crescem mais rápido.</h2>
            <p>Sem uma plataforma integrada, sua equipe perde tempo demais em tarefas operacionais. Com a Flowly, você foca no que importa: resultado pro cliente.</p>
          </div>
          <div className="lp-stats-numbers">
            <div className="lp-stat-number-box">
              <div className="lp-big-num">3<span>x</span></div>
              <p>mais rápido na criação de relatórios mensais</p>
            </div>
            <div className="lp-stat-number-box">
              <div className="lp-big-num">68<span>%</span></div>
              <p>das agências reportam mais satisfação dos clientes</p>
            </div>
            <div className="lp-stat-number-box">
              <div className="lp-big-num">12<span>h</span></div>
              <p>economizadas por semana em tarefas operacionais</p>
            </div>
            <div className="lp-stat-number-box">
              <div className="lp-big-num">2<span>x</span></div>
              <p>mais clientes gerenciados pela mesma equipe</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="lp-cta-wrap" id="planos">
        <div style={{maxWidth:'600px',margin:'0 auto'}}>
          <h2>Comece a usar a Flowly hoje mesmo</h2>
          <p>14 dias grátis. Sem cartão de crédito. Configure em menos de 5 minutos.</p>
          <form className="lp-cta-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Seu e-mail profissional"/>
            <button className="lp-btn-white" onClick={onLogin}>Criar conta grátis →</button>
          </form>
          <p className="lp-cta-sub">Ao se inscrever, você concorda com os Termos de Uso e Política de Privacidade.</p>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <span className="lp-footer-brand-name">Flow<span>ly</span></span>
              <p>A plataforma completa para agências de marketing que querem crescer com organização.</p>
            </div>
            <div className="lp-footer-col">
              <h5>Produto</h5>
              <ul>
                <li><a href="#">Funcionalidades</a></li>
                <li><a href="#">Planos e Preços</a></li>
                <li><a href="#">Integrações</a></li>
                <li><a href="#">Novidades</a></li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h5>Empresa</h5>
              <ul>
                <li><a href="#">Sobre nós</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Cases</a></li>
                <li><a href="#">Contato</a></li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h5>Legal</h5>
              <ul>
                <li><a href="#">Termos de Uso</a></li>
                <li><a href="#">Privacidade</a></li>
                <li><a href="#">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© 2025 Flowly. Todos os direitos reservados.</span>
            <span>Feito com ♥ para agências brasileiras</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
