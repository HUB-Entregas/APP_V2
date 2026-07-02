// Senha fica só em memória (nunca salva no navegador) — ao atualizar
// a página, o administrador precisa entrar de novo. É intencional.
let senhaAtual = null;
let registrosCache = [];

function el(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatarData(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function buscarComprovantes(senha) {
  const url = `${CONFIG.API_URL}?acao=listar&senha=${encodeURIComponent(senha)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.json();
}

async function fazerLogin() {
  const senha = el('senhaInput').value;
  if (!senha) return;
  const botao = el('btnEntrar');
  botao.disabled = true;
  botao.textContent = 'Entrando…';
  el('loginErro').classList.add('hidden');

  try {
    const data = await buscarComprovantes(senha);
    if (data.status !== 'ok') {
      mostrarErroLogin(data.message || 'Senha incorreta.');
      return;
    }
    senhaAtual = senha;
    registrosCache = data.registros;
    mostrarPainel();
  } catch (err) {
    mostrarErroLogin('Não foi possível conectar. Verifique sua internet e a URL configurada em config.js.');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
}

function mostrarErroLogin(msg) {
  const erro = el('loginErro');
  erro.textContent = msg;
  erro.classList.remove('hidden');
}

function mostrarPainel() {
  el('telaLogin').classList.add('hidden');
  el('telaPainel').classList.remove('hidden');
  el('btnSair').classList.remove('hidden');
  renderTabela(registrosCache);
}

function sair() {
  senhaAtual = null;
  registrosCache = [];
  el('senhaInput').value = '';
  el('busca').value = '';
  el('telaPainel').classList.add('hidden');
  el('btnSair').classList.add('hidden');
  el('loginErro').classList.add('hidden');
  el('telaLogin').classList.remove('hidden');
}

async function atualizar() {
  if (!senhaAtual) return;
  const botao = el('btnAtualizar');
  botao.disabled = true;
  botao.textContent = 'Atualizando…';
  try {
    const data = await buscarComprovantes(senhaAtual);
    if (data.status === 'ok') {
      registrosCache = data.registros;
      renderTabela(filtrarPorBusca(registrosCache));
    }
  } catch (err) {
    // sem internet no momento — mantém a última lista carregada na tela
  } finally {
    botao.disabled = false;
    botao.textContent = '🔄 Atualizar';
  }
}

function filtrarPorBusca(lista) {
  const termo = el('busca').value.trim().toLowerCase();
  if (!termo) return lista;
  return lista.filter((r) =>
    (r.recebedor || '').toLowerCase().includes(termo) ||
    (r.motorista || '').toLowerCase().includes(termo)
  );
}

function renderTabela(lista) {
  const corpo = el('tabelaCorpo');
  const vazio = el('vazioAviso');
  el('contagem').textContent = `${lista.length} comprovante(s)`;
  corpo.innerHTML = '';

  if (lista.length === 0) {
    vazio.classList.remove('hidden');
    return;
  }
  vazio.classList.add('hidden');

  const linhas = lista.map((r) => `
    <tr>
      <td>${formatarData(r.dataHora)}</td>
      <td>${escapeHtml(r.motorista)}</td>
      <td>${escapeHtml(r.recebedor)}</td>
      <td>${escapeHtml(r.observacao)}</td>
      <td>${r.foto ? `<a href="${escapeHtml(r.foto)}" target="_blank" rel="noopener">Ver foto</a>` : '—'}</td>
      <td>${r.assinatura ? `<a href="${escapeHtml(r.assinatura)}" target="_blank" rel="noopener">Ver assinatura</a>` : '—'}</td>
    </tr>`).join('');
  corpo.innerHTML = linhas;
}

window.addEventListener('DOMContentLoaded', () => {
  el('btnEntrar').addEventListener('click', fazerLogin);
  el('senhaInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') fazerLogin(); });
  el('btnSair').addEventListener('click', sair);
  el('btnAtualizar').addEventListener('click', atualizar);
  el('busca').addEventListener('input', () => renderTabela(filtrarPorBusca(registrosCache)));
  el('senhaInput').focus();
});
