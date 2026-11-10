import { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from './services/supabase';
import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import './App.css';
import {
  solicitarPermissao,
  dispararNotificacaoImediata,
  agendarLembrete,
  consultarPendentes,
  cancelarLembrete,
} from './services/notificacoes';

export default function App() {
  const [cupons, setCupons] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('info');
  const [localizacao, setLocalizacao] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const [statusLocalizacao, setStatusLocalizacao] = useState('');
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false);

  const [statusNotificacao, setStatusNotificacao] = useState('');
  const [pendentes, setPendentes] = useState([]);
  const [carregandoNotificacao, setCarregandoNotificacao] = useState(false);

  async function buscarLocalizacao() {
    setBuscandoLocalizacao(true);
    setStatusLocalizacao('');

    try {
      const permission = await Geolocation.requestPermissions();

      if (permission.location !== 'granted') {
        throw new Error('PermissÃ£o de localizaÃ§Ã£o negada pelo sistema operacional.');
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      setLocalizacao({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });

      setStatusLocalizacao(
        `Coordenadas capturadas com sucesso. PrecisÃ£o: ${Number(
          position.coords.accuracy
        ).toFixed(1)} m.`
      );
    } catch (erro) {
      const mensagemErro =
        erro?.message || 'NÃ£o foi possÃvel obter a localizaÃ§Ã£o do dispositivo.';

      setStatusLocalizacao(mensagemErro);
      setLocalizacao({ latitude: null, longitude: null, accuracy: null });
    } finally {
      setBuscandoLocalizacao(false);
    }
  }

  const googleMapsUrl =
    localizacao.latitude !== null && localizacao.longitude !== null
      ? `https://www.google.com/maps/search/?api=1&query=${localizacao.latitude},${localizacao.longitude}`
      : '';

  async function adicionarCupom(origem) {
    if (carregando) return;

    setCarregando(true);
    setMensagem('');

    try {
      if (!supabase) {
        throw new Error(
          'ConfiguraÃ§Ã£o do Supabase nÃ£o encontrada. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.'
        );
      }

      const imagem = await Camera.getPhoto({
        quality: 70,
        resultType: CameraResultType.Uri,
        source: origem,
        allowEditing: false,
        promptLabelHeader: 'Anexar comprovante',
        promptLabelPhoto: 'Escolher da galeria',
        promptLabelPicture: 'Tirar fotografia',
        saveToGallery: false,
      });

      if (!imagem?.webPath) {
        throw new Error('NÃ£o foi possÃvel carregar a imagem.');
      }

      setMensagem('Enviando foto para a nuvem...');
      setTipoMensagem('info');

      const resposta = await fetch(imagem.webPath);
      if (!resposta.ok) {
        throw new Error('NÃ£o foi possÃvel ler a imagem capturada.');
      }

      const blob = await resposta.blob();

      const nomeArquivo = `cupom-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.jpg`;

      const { data, error } = await supabase.storage
        .from('fotos-camera')
        .upload(nomeArquivo, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('fotos-camera')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      setCupons((anteriores) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          webPath: publicUrl,
          publicUrl,
          caminhoStorage: data.path,
          data: new Date().toLocaleString('pt-BR'),
          origem:
            origem === CameraSource.Camera
              ? 'Capturado pela cÃ¢mera'
              : 'Selecionado da galeria',
        },
        ...anteriores,
      ]);

      setMensagem('Foto enviada e salva na nuvem com sucesso!');
      setTipoMensagem('sucesso');
    } catch (erro) {
      console.error('Erro ao capturar ou enviar foto:', erro);

      setMensagem(
        erro?.message || 'NÃ£o foi possÃvel enviar a foto. Tente novamente.'
      );
      setTipoMensagem('erro');
    } finally {
      setCarregando(false);
    }
  }

  function removerCupom(id) {
    setCupons((anteriores) =>
      anteriores.filter((cupom) => cupom.id !== id)
    );
  }


  async function executarNotificacao(acao) {
    try {
      setCarregandoNotificacao(true);
      setStatusNotificacao('');

      const permitido = await solicitarPermissao();

      if (!permitido) {
        setStatusNotificacao(
          'Permissão de notificações não concedida. Verifique as configurações do celular.'
        );
        return;
      }

      const resultado = await acao();

      setStatusNotificacao(
        resultado || 'Operação realizada com sucesso!'
      );
    } catch (erro) {
      console.error('Erro nas notificações:', erro);
      setStatusNotificacao(
        erro?.message || 'Não foi possível executar a notificação.'
      );
    } finally {
      setCarregandoNotificacao(false);
    }
  }

  async function enviarNotificacao() {
    await executarNotificacao(dispararNotificacaoImediata);
  }

  async function agendarNotificacao() {
    await executarNotificacao(async () => {
      await agendarLembrete(10);
      return 'Lembrete agendado! Você receberá uma notificação em 10 segundos.';
    });
  }

  async function listarNotificacoes() {
    try {
      const resultado = await consultarPendentes();
      setPendentes(resultado);
      setStatusNotificacao(
        `Você possui ${resultado.length} notificação(ões) pendente(s).`
      );
    } catch (erro) {
      console.error('Erro ao consultar notificações:', erro);
      setStatusNotificacao('Não foi possível consultar os lembretes.');
    }
  }

  async function cancelarNotificacao() {
    try {
      await cancelarLembrete();
      const resultado = await consultarPendentes();
      setPendentes(resultado);
      setStatusNotificacao('Lembrete cancelado com sucesso!');
    } catch (erro) {
      console.error('Erro ao cancelar notificação:', erro);
      setStatusNotificacao('Não foi possível cancelar o lembrete.');
    }
  }

  async function pedirPermissaoNotificacao() {
    try {
      const permitido = await solicitarPermissao();
      setStatusNotificacao(
        permitido
          ? 'Permissão concedida! Você pode receber notificações.'
          : 'Permissão não concedida. Verifique as configurações do celular.'
      );
    } catch (erro) {
      console.error('Erro ao solicitar permissão:', erro);
      setStatusNotificacao('Erro ao solicitar permissão de notificações.');
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio">
          <span className="brand-symbol">FT<span>âœ³</span></span>
          <span className="brand-name">
            FOOD TRUCK
            <strong>FISCAL<span>.</span></strong>
          </span>
        </a>

        <div className="topbar-label">
          <span className="live-dot" />
          <span>GESTÃƒO DO NEGÃ“CIO</span>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            SEU NEGÃ“CIO, BEM ORGANIZADO
          </div>

          <h1>
            Cada venda
            <br />
            tem sua <span>histÃ³ria.</span>
          </h1>

          <p className="hero-description">
            Guarde seus comprovantes fiscais, organize os registros
            e deixe a papelada em dia. Tudo em um sÃ³ lugar.
          </p>

          <a href="#registro" className="primary-link">
            Organizar meus cupons <span>â†˜</span>
          </a>

          <div className="hero-proof">
            <span className="proof-icon">âœ“</span>
            <span>PrÃ¡tico, simples e feito para o seu dia a dia.</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-sun" />
          <span className="visual-spark spark-a">âœ³</span>
          <span className="visual-spark spark-b">âœ¦</span>
          <span className="visual-caption">FEITO COM CAPRICHO</span>

          <div className="illustration">
            <div className="truck-awning">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="truck-sign">FRESH FOOD</div>
            <div className="truck-body">
              <div className="truck-window">
                <div className="window-top">
                  <span>GOOD</span>
                  <span>FOOD</span>
                </div>
                <div className="window-counter" />
                <span className="burger-art">ðŸ”</span>
              </div>
              <div className="truck-front">
                <span className="front-number">01</span>
                <span className="front-line" />
                <span className="front-light" />
              </div>
            </div>
            <div className="truck-bumper" />
            <div className="truck-wheel wheel-left">
              <span />
            </div>
            <div className="truck-wheel wheel-right">
              <span />
            </div>
          </div>

          <div className="floating-receipt">
            <div className="floating-receipt-top">
              <span>RECIBO</span>
              <span>âœ“</span>
            </div>
            <div className="receipt-lines">
              <span />
              <span />
              <span />
              <span />
            </div>
            <strong>R$ --,--</strong>
            <small>COMPROVANTE</small>
          </div>

          <div className="visual-sticker">
            <span>âœ¦</span> CONTAS EM DIA!
          </div>
        </div>
      </section>

      <section className="gps-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">GPS Â· LOCALIZAÃ‡ÃƒO</div>
            <h2>Coordenadas em tempo real</h2>
            <p>Capturamos a latitude, longitude e precisÃ£o do GPS do seu celular.</p>
          </div>
          <div className="heading-decoration">âŒ–</div>
        </div>

        <div className="gps-card">
          <div className="gps-grid">
            <div className="gps-item">
              <span>Latitude</span>
              <strong>
                {localizacao.latitude !== null ? localizacao.latitude.toFixed(6) : '--'}
              </strong>
            </div>
            <div className="gps-item">
              <span>Longitude</span>
              <strong>
                {localizacao.longitude !== null ? localizacao.longitude.toFixed(6) : '--'}
              </strong>
            </div>
            <div className="gps-item">
              <span>PrecisÃ£o</span>
              <strong>
                {localizacao.accuracy !== null
                  ? `${localizacao.accuracy.toFixed(1)} m`
                  : '--'}
              </strong>
            </div>
          </div>

          <div className="gps-actions">
            <button
              type="button"
              className="primary-button"
              onClick={buscarLocalizacao}
              disabled={buscandoLocalizacao}
            >
              {buscandoLocalizacao ? 'Buscando GPS...' : 'Buscar localizaÃ§Ã£o'}
            </button>

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                Abrir no Google Maps
              </a>
            )}
          </div>
        </div>

        {statusLocalizacao && (
          <div
            className={`feedback ${
              statusLocalizacao.toLowerCase().includes('erro') ||
              statusLocalizacao.toLowerCase().includes('negada')
                ? 'feedback-erro'
                : 'feedback-sucesso'
            }`}
            role="status"
            aria-live="polite"
          >
            <span className="feedback-icon">
              {statusLocalizacao.toLowerCase().includes('erro') ||
              statusLocalizacao.toLowerCase().includes('negada')
                ? '!'
                : 'âœ“'}
            </span>
            <span>{statusLocalizacao}</span>
          </div>
        )}
      </section>

      <section className="dashboard-strip">
        <div className="dashboard-intro">
          <span className="dashboard-icon">â–¤</span>
          <div>
            <strong>Seu controle de comprovantes</strong>
            <span>Acompanhe os registros desta sessÃ£o.</span>
          </div>
        </div>

        <div className="dashboard-metric">
          <span>REGISTROS NA TELA</span>
          <strong>{String(cupons.length).padStart(2, '0')}</strong>
        </div>

        <div className="dashboard-metric">
          <span>QUALIDADE DA FOTO</span>
          <strong>70<span className="percent">%</span></strong>
        </div>
      </section>

      <section className="register-section" id="registro">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 â€” NOVO REGISTRO</div>
            <h2>Vamos guardar esse cupom?</h2>
            <p>Escolha como deseja anexar seu comprovante fiscal.</p>
          </div>
          <div className="heading-decoration">âœ³</div>
        </div>

        <div className="action-grid">
          <button
            className="action-card camera-action"
            onClick={() => adicionarCupom(CameraSource.Camera)}
            disabled={carregando}
            type="button"
          >
            <span className="action-icon">ðŸ“¸</span>
            <span className="action-content">
              <span className="action-kicker">OPÃ‡ÃƒO 01</span>
              <strong>{carregando ? 'Aguarde...' : 'Fotografar cupom'}</strong>
              <small>Abra a cÃ¢mera e registre a nota impressa.</small>
            </span>
            <span className="action-arrow">â†—</span>
          </button>

          <button
            className="action-card gallery-action"
            onClick={() => adicionarCupom(CameraSource.Photos)}
            disabled={carregando}
            type="button"
          >
            <span className="action-icon">ðŸ§¾</span>
            <span className="action-content">
              <span className="action-kicker">OPÃ‡ÃƒO 02</span>
              <strong>Escolher da galeria</strong>
              <small>Adicione uma imagem que jÃ¡ estÃ¡ no celular.</small>
            </span>
            <span className="action-arrow">â†—</span>
          </button>
        </div>

        {mensagem && (
          <div
            className={`feedback feedback-${tipoMensagem}`}
            role="status"
            aria-live="polite"
          >
            <span className="feedback-icon">
              {tipoMensagem === 'sucesso'
                ? 'âœ“'
                : tipoMensagem === 'erro'
                  ? '!'
                  : 'i'}
            </span>
            <span>{mensagem}</span>
            <button
              type="button"
              aria-label="Fechar mensagem"
              onClick={() => setMensagem('')}
            >
              Ã—
            </button>
          </div>
        )}
      </section>

      <section className="receipts-section">
        <div className="receipts-heading">
          <div>
            <div className="eyebrow">02 â€” SEU ARQUIVO</div>
            <h2>Comprovantes <span>registrados.</span></h2>
          </div>
          <div className="receipt-counter">
            <strong>{cupons.length}</strong>
            <span>{cupons.length === 1 ? 'CUPOM' : 'CUPONS'}</span>
          </div>
        </div>

        {cupons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illustration">
              <div className="empty-paper">
                <span />
                <span />
                <span />
                <span />
                <strong>R$ --,--</strong>
              </div>
              <span className="empty-plus">+</span>
            </div>
            <h3>Seu arquivo comeÃ§a aqui.</h3>
            <p>
              Ainda nÃ£o hÃ¡ comprovantes nesta sessÃ£o. Fotografe
              seu primeiro cupom e ele aparecerÃ¡ aqui.
            </p>
            <a href="#registro">Adicionar meu primeiro cupom â†‘</a>
          </div>
        ) : (
          <div className="receipts-grid">
            {cupons.map((cupom, index) => (
              <article className="receipt-card" key={cupom.id}>
                <div className="receipt-card-top">
                  <span className="receipt-number">
                    COMPROVANTE NÂº {String(cupons.length - index).padStart(3, '0')}
                  </span>
                  <span className="receipt-verified">âœ“ REGISTRADO</span>
                </div>

                <div className="receipt-image-wrap">
                  <img
                    src={cupom.webPath}
                    alt={`Cupom fiscal ${cupons.length - index}`}
                    className="receipt-image"
                  />
                </div>

                <div className="receipt-card-info">
                  <span className="receipt-category">DOCUMENTO FISCAL</span>
                  <h3>Cupom de compra</h3>
                  <p>{cupom.data}</p>
                  <span className="receipt-origin">{cupom.origem}</span>
                </div>

                <button
                  className="remove-button"
                  type="button"
                  onClick={() => removerCupom(cupom.id)}
                >
                  Remover da tela <span>Ã—</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>


      <section className="notifications-section" id="notificacoes">
        <div className="section-heading">
          <div>
            <div className="eyebrow">03 — CENTRAL DE ALERTAS</div>
            <h2>Seus lembretes fiscais. 🔔</h2>
            <p>
              Receba avisos e mantenha seus comprovantes sempre organizados.
            </p>
          </div>
          <div className="heading-decoration">♧</div>
        </div>

        <div className="notifications-card">
          <div className="notifications-intro">
            <span className="notifications-icon">🔔</span>
            <div>
              <strong>Central de notificações</strong>
              <p>Gerencie seus alertas diretamente pelo celular.</p>
            </div>
          </div>

          <div className="notifications-actions">
            <button
              type="button"
              className="notification-button"
              onClick={pedirPermissaoNotificacao}
              disabled={carregandoNotificacao}
            >
              🔐 Solicitar permissão
            </button>

            <button
              type="button"
              className="notification-button"
              onClick={enviarNotificacao}
              disabled={carregandoNotificacao}
            >
              📢 Enviar notificação imediata
            </button>

            <button
              type="button"
              className="notification-button"
              onClick={agendarNotificacao}
              disabled={carregandoNotificacao}
            >
              ⏰ Agendar lembrete (10 segundos)
            </button>

            <button
              type="button"
              className="notification-button"
              onClick={listarNotificacoes}
              disabled={carregandoNotificacao}
            >
              📋 Consultar notificações pendentes
            </button>

            <button
              type="button"
              className="notification-button notification-cancel"
              onClick={cancelarNotificacao}
              disabled={carregandoNotificacao}
            >
              ❌ Cancelar lembrete
            </button>
          </div>

          {statusNotificacao && (
            <div className="notification-feedback" role="status" aria-live="polite">
              {statusNotificacao}
            </div>
          )}

          <div className="pending-list">
            <strong>Notificações agendadas: {pendentes.length}</strong>

            {pendentes.map((item) => (
              <p key={item.id}>
                ID: {item.id} — {item.title}
              </p>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="#inicio">
          <span className="brand-symbol">FT<span>âœ³</span></span>
          <span className="brand-name">
            FOOD TRUCK
            <strong>FISCAL<span>.</span></strong>
          </span>
        </a>
        <p>Organização nos registros. Mais tranquilidade no negocio.</p>
        <span className="footer-course">PROJETO ACADÊMICO PPDM2</span>
      </footer>
    </main>
  );
}
