var firebaseConfig = {
  apiKey: "AIzaSyAjcs-WFT-goacyXrakgsTcVk79RCMlXmY",
  authDomain: "gestaoobras-adc.firebaseapp.com",
  projectId: "gestaoobras-adc",
  storageBucket: "gestaoobras-adc.firebasestorage.app",
  messagingSenderId: "542190420475",
  appId: "1:542190420475:web:2f23b87ed81b8bacb40b5e"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

var usuariosApp     = [];
var usuarioAtual    = null;
var custos          = [];
var clientes        = [];
var tabelaMateriais = [];
var funcionarios    = [];
var lancamentos     = [];
var obras           = [];
var materiais       = [];
var maoDeObra       = [];
var diario          = [];
var registros       = [];
var reunioes        = [];
var orcamentos      = [];
var paginaAnterior  = null;

function salvar(chave, dados) {
  window[chave] = dados;
  db.collection("dados").doc(chave)
    .set({ lista: JSON.parse(JSON.stringify(dados)) })
    .catch(function(e){ console.error("Erro ao salvar "+chave+":", e); });
}

function carregarTodosDados(callback) {
  var chaves = ["custos","clientes","tabelaMateriais","funcionarios","obras","usuariosApp","lancamentos","diario","registros","reunioes","orcamentos"];
  var total = chaves.length, concluidos = 0;
  chaves.forEach(function(chave){
    db.collection("dados").doc(chave).get()
      .then(function(doc){
        if(doc.exists && doc.data().lista) window[chave] = doc.data().lista;
        concluidos++;
        if(concluidos === total) callback();
      })
      .catch(function(){
        concluidos++;
        if(concluidos === total) callback();
      });
  });
}

function criarUsuarioMasterSeNaoExistir() {
  db.collection("dados").doc("usuariosApp").get().then(function(doc) {
    var lista = (doc.exists && doc.data().lista) ? doc.data().lista : [];
    var masterExiste = lista.find(function(u){ return u.perfil === "master"; });
    if (!masterExiste) {
      lista.push({ usuario:"adc", senha:"242723", perfil:"master", nome:"A.D.C" });
      db.collection("dados").doc("usuariosApp").set({ lista: lista });
    }
  });
}

function fazerLogin() {
  var u = document.getElementById("inputUsuario").value.trim();
  var s = document.getElementById("inputSenha").value.trim();
  document.getElementById("erroLogin").style.display = "none";
  db.collection("dados").doc("usuariosApp").get().then(function(doc) {
    var lista = (doc.exists && doc.data().lista) ? doc.data().lista : [];
    if (!lista.length) {
      lista.push({ usuario:"adc", senha:"242723", perfil:"master", nome:"A.D.C" });
      db.collection("dados").doc("usuariosApp").set({ lista: lista });
    }
    var encontrado = lista.find(function(x){ return x.usuario===u && x.senha===s; });
    if (!encontrado) {
      document.getElementById("erroLogin").style.display = "block";
      return;
    }
    usuarioAtual = encontrado;
    usuariosApp  = lista;
    carregarTodosDados(function() {
      // ====== PERFIL FUNCIONÁRIO ======
      // Normaliza o perfil: aceita variações antigas ("rh", "operador") e
      // qualquer perfil desconhecido cai aqui como funcionário (segurança).
      var p = (usuarioAtual.perfil||"").toString().trim().toLowerCase();
      if (["master","dono","financeiro"].indexOf(p) === -1) {
        usuarioAtual.perfil = "funcionario";
        p = "funcionario";
      } else {
        usuarioAtual.perfil = p;
      }
      if (p === "funcionario") {
        document.getElementById("telaLogin").style.display = "none";
        var bu = document.getElementById("barraUsuario"); if(bu) bu.style.display = "none";
        var mp = document.getElementById("menuPrincipal"); if(mp) mp.style.display = "none";
        var mg = document.getElementById("menuGestao"); if(mg) mg.style.display = "none";
        var mf = document.getElementById("menuFinanceiro"); if(mf) mf.style.display = "none";
        var ad = document.getElementById("aba-dashboard"); if(ad) ad.style.display = "none";
        var ah = document.getElementById("appHeader"); if(ah) ah.style.display = "none";
        var bn = document.getElementById("bottomNav"); if(bn) bn.style.display = "none";
        document.querySelectorAll('.pagina').forEach(function(pg){ pg.classList.remove('ativa'); });

        renderHomeFuncionario();
        return; // Para aqui — não executa o login normal
      }
      // ====== FIM FUNCIONÁRIO ======

      // Login normal para outros perfis
      document.getElementById("telaLogin").style.display = "none";
      document.getElementById("appHeader").style.display = "block";
      document.getElementById("bottomNav").style.display = "flex";
      document.getElementById("nomeUsuarioLogado").textContent = usuarioAtual.nome+" ("+usuarioAtual.perfil+")";
      
      // Atualizar avatar (foto se existir, senão iniciais)
      aplicarAvatar("avatarInicial", usuarioAtual);
      aplicarAvatar("avatarPerfil", usuarioAtual);
      document.getElementById("nomePerfil").textContent = usuarioAtual.nome;
      
      var btnGerenciar = document.getElementById("btnGerenciarUsuariosWrapper");
      var btnGerenciarHeader = document.getElementById("btnGerenciarUsuarios");
      if (btnGerenciar && usuarioAtual.perfil === "master") {
        btnGerenciar.style.display = "block";
      }
      if (btnGerenciarHeader && usuarioAtual.perfil === "master") {
        btnGerenciarHeader.style.display = "block";
      }
      
      // Mostrar página inicial e renderizar o dashboard com os dados carregados
      document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
      document.getElementById('pag-inicio').classList.add('ativa');
      document.getElementById('nav-inicio').classList.add('ativo');
      document.getElementById('conteudo').style.display = 'none';
      try { atualizarDashboard(); } catch(e) { console.error("Erro dashboard:", e); }
    });
  }).catch(function(e) {
    console.error("Erro login:", e);
    document.getElementById("erroLogin").style.display = "block";
  });
}

function renderHomeFuncionario() {
  var conteudo = document.getElementById("conteudo");
  if (!conteudo) return;
  conteudo.style.display = "block";
  conteudo.innerHTML =
    '<div style="background:linear-gradient(135deg,#1a73e8,#1557b0);padding:20px 16px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px">'
    +'<div style="display:flex;align-items:center;gap:12px;min-width:0">'
    +avatarHTML(usuarioAtual, 48)
    +'<div style="min-width:0">'
    +'<p style="color:rgba(255,255,255,0.75);font-size:0.8rem;margin:0">Bem-vindo</p>'
    +'<h2 style="color:white;margin:4px 0 0;font-size:1.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(usuarioAtual.nome||"")+'</h2>'
    +'</div></div>'
    +'<button onclick="fazerLogout()" style="background:rgba(255,255,255,0.2);color:white;border:none;border-radius:10px;padding:8px 12px;font-size:0.8rem;cursor:pointer;flex-shrink:0">Sair</button>'
    +'</div>'
    +'<div style="padding:20px 16px;display:grid;grid-template-columns:1fr 1fr;gap:14px">'
    +'<div onclick="abrirDiarioFuncionario()" style="background:white;border-radius:16px;padding:22px 12px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.08);cursor:pointer">'
    +'<div style="font-size:2rem">📓</div>'
    +'<div style="font-weight:700;margin-top:8px;color:#1F2937;font-size:0.95rem">Diário</div>'
    +'<div style="font-size:0.72rem;color:#9CA3AF;margin-top:4px">Registre atividades</div>'
    +'</div>'
    +'<div onclick="abrirPontoFuncionario()" style="background:white;border-radius:16px;padding:22px 12px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.08);cursor:pointer">'
    +'<div style="font-size:2rem">⏱️</div>'
    +'<div style="font-weight:700;margin-top:8px;color:#1F2937;font-size:0.95rem">Ponto</div>'
    +'<div style="font-size:0.72rem;color:#9CA3AF;margin-top:4px">Bater ponto</div>'
    +'</div>'
    +'</div>'
    +'<div id="painelFuncionario" style="padding:0 16px 24px"></div>';
}

function abrirDiarioFuncionario() {
  var painel = document.getElementById("painelFuncionario");
  if (!painel) return;
  painel.innerHTML =
    '<div style="margin:6px 0 12px"><button onclick="renderHomeFuncionario()" style="background:#F3F4F6;color:#374151;border:none;border-radius:10px;padding:8px 14px;font-size:0.8rem;font-weight:700;cursor:pointer">← Voltar</button></div>'
    +'<div id="conteudo-interno-func"></div>';
  // Reusa telaDiario, mas dentro do painel do funcionário
  document.getElementById("conteudo-interno-func").innerHTML = telaDiario();
  window.scrollTo(0,0);
}

function abrirPontoFuncionario() {
  var painel = document.getElementById("painelFuncionario");
  if (!painel) return;
  painel.innerHTML =
    '<div style="margin:6px 0 12px"><button onclick="renderHomeFuncionario()" style="background:#F3F4F6;color:#374151;border:none;border-radius:10px;padding:8px 14px;font-size:0.8rem;font-weight:700;cursor:pointer">← Voltar</button></div>'
    +'<div id="area-ponto"></div>';
  abrirPonto();
  window.scrollTo(0,0);
}

function fazerLogout() {
  usuarioAtual = null;
  document.getElementById("telaLogin").style.display = "flex";
  document.getElementById("appHeader").style.display = "none";
  document.getElementById("bottomNav").style.display = "none";
  document.getElementById("inputUsuario").value = "";
  document.getElementById("inputSenha").value = "";
  document.getElementById("erroLogin").style.display = "none";
  document.getElementById("conteudo").innerHTML = "";
  document.getElementById("conteudo").style.display = "none";
  document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
  document.getElementById('pag-inicio').classList.add('ativa');
}

function verificarPermissao(modulo) {
  if(!usuarioAtual) return false;
  if(usuarioAtual.perfil==="master") return true;
  if(usuarioAtual.perfil==="financeiro") {
    if(modulo==="gerenciarUsuarios") return false;
    return true;
  }
  if(usuarioAtual.perfil==="dono") {
    if(modulo==="gerenciarUsuarios") return false;
    if(modulo==="financeiro" || modulo==="prolabore") return "somente-leitura";
    return true;
  }
  if(usuarioAtual.perfil==="funcionario") {
    return (modulo==="diario" || modulo==="ponto" || modulo==="folhaPonto");
  }
  return false;
}

function podeEditar(modulo) {
  var p = verificarPermissao(modulo);
  return p === true;
}

function telaGerenciarUsuarios() {
  if(usuarioAtual.perfil !== "master"){ return '<p style="color:red;padding:16px">Acesso negado.</p>'; }
  var donos        = usuariosApp.filter(function(u){ return u.perfil==="dono"; }).length;
  var financeiros  = usuariosApp.filter(function(u){ return u.perfil==="financeiro"; }).length;
  var funcionariosU= usuariosApp.filter(function(u){ return u.perfil==="funcionario"; }).length;
  return '<h2>Gerenciar Usuarios</h2>'
  +'<div class="card" style="background:#e8f0fe;margin-bottom:12px">'
  +'<p style="font-size:0.85rem">👑 <strong>Master:</strong> 1 | 👷 <strong>Donos:</strong> '+donos+' | 💰 <strong>Financeiro:</strong> '+financeiros+' | 🛠️ <strong>Funcionários:</strong> '+funcionariosU+'</p>'
  +'</div>'
  +'<div class="card">'
  +'<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">'
  +'<div id="previewFotoNovoUser" style="width:64px;height:64px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#9ca3af;overflow:hidden;flex-shrink:0;background-size:cover;background-position:center">📷</div>'
  +'<div style="flex:1">'
  +'<button type="button" onclick="document.getElementById(\'fotoNovoUser\').click()" style="background:#1a73e8;color:white;border:none;border-radius:8px;padding:8px 14px;font-size:0.85rem;cursor:pointer;width:100%">📷 Adicionar Foto</button>'
  +'<input type="file" id="fotoNovoUser" accept="image/*" style="display:none" onchange="carregarFotoNovoUser(this)"/>'
  +'</div></div>'
  +'<label>Nome completo</label><input type="text" id="nomeNovoUser" placeholder="Ex: Maria Silva"/>'
  +'<label>Usuario (login)</label><input type="text" id="loginNovoUser" placeholder="Ex: maria.silva"/>'
  +'<label>Senha</label><input type="password" id="senhaNovoUser" placeholder="Minimo 6 caracteres"/>'
  +'<label>Perfil</label>'
  +'<select id="perfilNovoUser">'
  +'<option value="dono">👷 Dono</option>'
  +'<option value="financeiro">💰 Financeiro</option>'
  +'<option value="funcionario">🛠️ Funcionário</option>'
  +'</select>'
  +'<button onclick="criarUsuario()">+ Criar Usuario</button>'
  +'</div>'
  +'<div id="listaUsuarios"></div>';
}

var _fotoNovoUserBase64 = "";

function carregarFotoNovoUser(input) {
  var f = input.files && input.files[0];
  if (!f) return;
  redimensionarImagem(f, 256, function(b64){
    _fotoNovoUserBase64 = b64;
    var prev = document.getElementById("previewFotoNovoUser");
    if (prev) {
      prev.style.backgroundImage = 'url('+b64+')';
      prev.innerHTML = '';
    }
  });
}

// Redimensiona uma imagem para no máximo `max` pixels (lado maior) e retorna base64 JPEG.
function redimensionarImagem(file, max, cb) {
  var reader = new FileReader();
  reader.onload = function(e){
    var img = new Image();
    img.onload = function(){
      var w = img.width, h = img.height;
      if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
      else if (h > max) { w = Math.round(w * max / h); h = max; }
      var canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function criarUsuario() {
  var nome   = document.getElementById("nomeNovoUser").value.trim();
  var login  = document.getElementById("loginNovoUser").value.trim();
  var senha  = document.getElementById("senhaNovoUser").value.trim();
  var perfil = document.getElementById("perfilNovoUser").value;
  if(!nome||!login||senha.length<6){ alert("Preencha todos os campos! Senha minimo 6 caracteres."); return; }
  if(usuariosApp.find(function(u){ return u.usuario===login; })){ alert("Usuario ja existe!"); return; }
  usuariosApp.push({ usuario:login, senha:senha, perfil:perfil, nome:nome, foto:_fotoNovoUserBase64 || "" });
  salvar("usuariosApp", usuariosApp);
  _fotoNovoUserBase64 = "";
  renderListaUsuarios();
  document.getElementById("nomeNovoUser").value="";
  document.getElementById("loginNovoUser").value="";
  document.getElementById("senhaNovoUser").value="";
  var prev = document.getElementById("previewFotoNovoUser");
  if (prev) { prev.style.backgroundImage = ""; prev.innerHTML = "📷"; }
  var inp = document.getElementById("fotoNovoUser"); if (inp) inp.value = "";
}

function rotuloPerfil(p) {
  if(p==="master")      return {cor:"#1a73e8", label:"👑 Master"};
  if(p==="dono")        return {cor:"#fb8c00", label:"👷 Dono"};
  if(p==="financeiro")  return {cor:"#43a047", label:"💰 Financeiro"};
  if(p==="funcionario") return {cor:"#7c3aed", label:"🛠️ Funcionário"};
  return {cor:"#888", label:p||"—"};
}

function iniciaisDe(nome) {
  return (nome||"?").split(' ').filter(Boolean).map(function(n){ return n[0]; }).join('').toUpperCase().slice(0,2);
}

function avatarHTML(u, size) {
  size = size || 40;
  var ini = iniciaisDe(u && u.nome);
  if (u && u.foto) {
    return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background-image:url('+u.foto+');background-size:cover;background-position:center;flex-shrink:0;border:2px solid #e5e7eb"></div>';
  }
  var fs = Math.max(0.7, size/40);
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:linear-gradient(135deg,#1a73e8,#1557b0);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:'+fs+'rem;flex-shrink:0">'+ini+'</div>';
}

// Aplica avatar (foto ou iniciais) num elemento existente.
function aplicarAvatar(elId, u) {
  var el = document.getElementById(elId);
  if (!el || !u) return;
  if (u.foto) {
    el.style.backgroundImage = 'url('+u.foto+')';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.textContent = '';
  } else {
    el.style.backgroundImage = '';
    el.textContent = iniciaisDe(u.nome);
  }
}

function renderListaUsuarios() {
  var el = document.getElementById("listaUsuarios");
  if(!el) return;
  var html="";
  usuariosApp.forEach(function(u, idx){
    var r = rotuloPerfil(u.perfil);
    html += '<div style="background:white;border-radius:12px;padding:14px;margin-bottom:8px;box-shadow:0 2px 6px rgba(0,0,0,0.07);display:flex;justify-content:space-between;align-items:center;gap:10px">'
      +'<div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">'
      +avatarHTML(u, 44)
      +'<div style="min-width:0"><div style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+u.nome+'</div>'
      +'<div style="font-size:0.8rem;color:#888">@'+u.usuario+'</div></div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'
      +'<span style="background:'+r.cor+';color:white;border-radius:12px;padding:3px 10px;font-size:0.78rem;white-space:nowrap">'+r.label+'</span>'
      +(u.perfil!=="master"?'<span onclick="editarUsuario('+idx+')" style="color:#1a73e8;cursor:pointer" title="Editar">✏️</span>':'<span onclick="editarUsuario('+idx+')" style="color:#1a73e8;cursor:pointer" title="Editar foto">📷</span>')
      +(u.perfil!=="master"?'<span onclick="removerUsuario('+idx+')" style="color:red;cursor:pointer">🗑️</span>':'')
      +'</div></div>';
  });
  el.innerHTML = '<div class="card">'+html+'</div>';
}

var _fotoEditUserBase64 = null; // null = não alterada, "" = remover, string = nova
var _editandoUserIdx = -1;

function editarUsuario(idx) {
  var u = usuariosApp[idx];
  if(!u) return;
  _editandoUserIdx = idx;
  _fotoEditUserBase64 = null;
  var ehMaster = u.perfil === "master";

  var overlay = document.createElement("div");
  overlay.id = "modalEditUser";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;overflow-y:auto";

  var fotoStyle = u.foto
    ? 'background-image:url('+u.foto+');background-size:cover;background-position:center'
    : 'background:linear-gradient(135deg,#1a73e8,#1557b0);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.6rem';
  var fotoTexto = u.foto ? '' : iniciaisDe(u.nome);

  overlay.innerHTML =
    '<div style="background:white;border-radius:14px;padding:18px;max-width:420px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.25)">'
    +'<h3 style="margin:0 0 14px;font-size:1.05rem">Editar Usuário</h3>'
    +'<div style="display:flex;flex-direction:column;align-items:center;margin-bottom:14px">'
    +'<div id="previewFotoEditUser" style="width:90px;height:90px;border-radius:50%;'+fotoStyle+';margin-bottom:10px;border:3px solid #e5e7eb">'+fotoTexto+'</div>'
    +'<div style="display:flex;gap:8px">'
    +'<button type="button" onclick="document.getElementById(\'fotoEditUser\').click()" style="background:#1a73e8;color:white;border:none;border-radius:8px;padding:8px 14px;font-size:0.82rem;cursor:pointer">📷 Trocar Foto</button>'
    +(u.foto?'<button type="button" onclick="removerFotoEditUser()" style="background:#fce8e6;color:#dc2626;border:none;border-radius:8px;padding:8px 14px;font-size:0.82rem;cursor:pointer">Remover</button>':'')
    +'</div>'
    +'<input type="file" id="fotoEditUser" accept="image/*" style="display:none" onchange="trocarFotoEditUser(this)"/>'
    +'</div>'
    +'<label style="font-size:0.85rem;color:#555">Nome completo</label>'
    +'<input type="text" id="editNome" value="'+(u.nome||"").replace(/"/g,"&quot;")+'" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 10px;font-size:0.95rem"/>'
    +(ehMaster ? '' :
      '<label style="font-size:0.85rem;color:#555">Usuário (login)</label>'
      +'<input type="text" id="editLogin" value="'+(u.usuario||"").replace(/"/g,"&quot;")+'" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 10px;font-size:0.95rem"/>'
      +'<label style="font-size:0.85rem;color:#555">Nova senha <span style="color:#999;font-weight:normal">(deixe em branco para manter)</span></label>'
      +'<input type="password" id="editSenha" placeholder="Mínimo 6 caracteres" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 10px;font-size:0.95rem"/>'
      +'<label style="font-size:0.85rem;color:#555">Perfil</label>'
      +'<select id="editPerfil" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 14px;font-size:0.95rem">'
      +'<option value="dono"'+(u.perfil==="dono"?" selected":"")+'>👷 Dono</option>'
      +'<option value="financeiro"'+(u.perfil==="financeiro"?" selected":"")+'>💰 Financeiro</option>'
      +'<option value="funcionario"'+(u.perfil==="funcionario"?" selected":"")+'>🛠️ Funcionário</option>'
      +'</select>')
    +'<div style="display:flex;gap:8px;margin-top:6px">'
    +'<button onclick="document.getElementById(\'modalEditUser\').remove()" style="flex:1;background:#e5e7eb;color:#374151">Cancelar</button>'
    +'<button onclick="salvarEdicaoUsuario()" style="flex:1;background:#1a73e8">Salvar</button>'
    +'</div>'
    +'</div>';
  document.body.appendChild(overlay);
}

function trocarFotoEditUser(input) {
  var f = input.files && input.files[0];
  if (!f) return;
  redimensionarImagem(f, 256, function(b64){
    _fotoEditUserBase64 = b64;
    var prev = document.getElementById("previewFotoEditUser");
    if (prev) {
      prev.style.backgroundImage = 'url('+b64+')';
      prev.style.backgroundSize = 'cover';
      prev.style.backgroundPosition = 'center';
      prev.style.background = '';
      prev.style.backgroundImage = 'url('+b64+')';
      prev.style.backgroundSize = 'cover';
      prev.style.backgroundPosition = 'center';
      prev.textContent = '';
    }
  });
}

function removerFotoEditUser() {
  _fotoEditUserBase64 = "";
  var u = usuariosApp[_editandoUserIdx];
  var prev = document.getElementById("previewFotoEditUser");
  if (prev) {
    prev.style.backgroundImage = '';
    prev.style.background = 'linear-gradient(135deg,#1a73e8,#1557b0)';
    prev.style.color = 'white';
    prev.style.display = 'flex';
    prev.style.alignItems = 'center';
    prev.style.justifyContent = 'center';
    prev.style.fontWeight = '800';
    prev.style.fontSize = '1.6rem';
    prev.textContent = iniciaisDe(u && u.nome);
  }
}

function salvarEdicaoUsuario() {
  var idx = _editandoUserIdx;
  var u = usuariosApp[idx];
  if (!u) return;
  var nome = (document.getElementById("editNome").value || "").trim();
  if (!nome) { alert("Nome é obrigatório."); return; }
  u.nome = nome;

  if (u.perfil !== "master") {
    var login = (document.getElementById("editLogin").value || "").trim();
    var senha = document.getElementById("editSenha").value || "";
    var perfil = document.getElementById("editPerfil").value;
    if (!login) { alert("Login é obrigatório."); return; }
    if (senha && senha.length < 6) { alert("Senha mínimo 6 caracteres."); return; }
    if (usuariosApp.find(function(x,i){ return i!==idx && x.usuario===login; })) { alert("Usuário já existe!"); return; }
    u.usuario = login;
    if (senha) u.senha = senha;
    u.perfil = perfil;
  }

  if (_fotoEditUserBase64 !== null) {
    u.foto = _fotoEditUserBase64; // pode ser nova string ou "" (remover)
  }

  salvar("usuariosApp", usuariosApp);
  // Se está editando o próprio usuário logado, atualiza referência e avatares.
  if (usuarioAtual && usuarioAtual.usuario === u.usuario) {
    usuarioAtual.nome = u.nome;
    usuarioAtual.foto = u.foto;
    aplicarAvatar("avatarInicial", usuarioAtual);
    aplicarAvatar("avatarPerfil", usuarioAtual);
    var np = document.getElementById("nomePerfil"); if (np) np.textContent = usuarioAtual.nome;
  }
  document.getElementById("modalEditUser").remove();
  renderListaUsuarios();
}

function removerUsuario(idx) {
  if(!confirm("Remover usuario "+usuariosApp[idx].nome+"?")) return;
  usuariosApp.splice(idx,1);
  salvar("usuariosApp", usuariosApp);
  renderListaUsuarios();
}

function abrirModulo(modulo) {
  var conteudo = document.getElementById("conteudo");
  var conteudoInterno = document.getElementById("conteudo-interno");
  if (!conteudo || !conteudoInterno) {
    alert("Area de conteudo nao encontrada. Recarregue a pagina.");
    return;
  }

  try {
    var perm = verificarPermissao(modulo);
    if (perm === false) {
      conteudo.style.display = "block";
      conteudoInterno.innerHTML = '<div class="card"><h2>Acesso negado</h2><p>Seu perfil não tem permissão para acessar esta seção.</p></div>';
      window.scrollTo(0,0);
      return;
    }

    document.querySelectorAll(".pagina").forEach(function(p){ p.classList.remove("ativa"); });
    document.querySelectorAll(".nav-item").forEach(function(n){ n.classList.remove("ativo"); });
    conteudo.style.display = "block";
    conteudoInterno.innerHTML = '<div class="card"><p>Carregando...</p></div>';

    if(modulo === "dashboard") {
      var pagInicio = document.getElementById("pag-inicio");
      var navInicio = document.getElementById("nav-inicio");
      if (pagInicio) pagInicio.classList.add("ativa");
      if (navInicio) navInicio.classList.add("ativo");
      conteudo.style.display = "none";
      atualizarDashboard();
      window.scrollTo(0,0);
      return;
    }

    var telas = {
      diario: telaDiario,
      registros: telaRegistros,
      relatorio: telaRelatorio,
      gerenciarUsuarios: telaGerenciarUsuarios,
      materiais: telaTabelaMateriais,
      clientes: telaClientes,
      orcamentos: telaOrcamentos,
      custos: telaCustos,
      funcionarios: telaFuncionarios,
      financeiro: telaFinanceiro,
      prolabore: telaProlabore,
      obras: telaObras,
      agenda: telaAgenda
    };

    if (!telas[modulo]) {
      conteudoInterno.innerHTML = '<div class="card"><h2>Secao nao encontrada</h2><p>Volte ao inicio e tente novamente.</p></div>';
      window.scrollTo(0,0);
      return;
    }

    var html = telas[modulo]();
    conteudoInterno.innerHTML = html || '<div class="card"><h2>Secao vazia</h2><p>Nenhum conteudo disponivel para esta secao.</p></div>';

    if(modulo === "orcamentos") {
      materiais = [{desc:"",unid:"m",qtd:0,unit:0}];
      maoDeObra = [{desc:"",unid:"h",qtd:0,unit:0}];
      renderMateriais();
      renderMaoDeObra();
      renderOrcamentosSalvos();
    }
    if(modulo === "custos")            renderCustos();
    if(modulo === "funcionarios")      renderFuncionarios();
    if(modulo === "financeiro")        renderFinanceiro();
    if(modulo === "clientes")          renderClientes();
    if(modulo === "materiais")         renderTabelaMateriais();
    if(modulo === "gerenciarUsuarios") renderListaUsuarios();
    if(modulo === "relatorio")         renderRelatorio();
    if(modulo === "diario")            renderDiarioHoje();
    if(modulo === "registros")         renderRegistros();
    if(modulo === "obras")             renderObras();
    if(modulo === "agenda")            renderAgenda();
    window.scrollTo(0,0);
  } catch (e) {
    console.error("Erro ao abrir modulo "+modulo+":", e);
    conteudo.style.display = "block";
    conteudoInterno.innerHTML = '<div class="card"><h2>Erro ao abrir esta secao</h2><p>Recarregue a pagina e tente novamente.</p><p style="font-size:0.78rem;color:#9CA3AF">'+(e && e.message ? e.message : e)+'</p></div>';
    window.scrollTo(0,0);
  }
}

function telaOrcamentos() {
  return '<h2>Orcamentos</h2>'
  +'<div id="listaOrcamentosSalvos"></div>'
  +'<div class="card">'
  +'<label>No do Orcamento</label><input type="text" id="numOrc" placeholder="Ex: ORC-001"/>'
  +'<label>Cliente</label><input type="text" id="cliente" placeholder="Nome do cliente"/>'
  +'<label>Endereco da Obra</label><input type="text" id="enderecoObra" placeholder="Endereco"/>'
  +'<label>Descricao</label><input type="text" id="descServico" placeholder="Escopo"/>'
  +'</div>'
  +'<div class="card"><h3>Materiais</h3><div id="listaMateriais"></div>'
  +'<button onclick="adicionarMaterial()" style="background:#28a745;">+ Adicionar Material</button></div>'
  +'<div class="card"><h3>Mao de Obra</h3><div id="listaMaoDeObra"></div>'
  +'<button onclick="adicionarMaoDeObra()" style="background:#28a745;">+ Adicionar Servico</button></div>'
  +'<div class="card"><h3>Custos Extras</h3>'
  +'<label>Frete (R$)</label><input type="number" id="frete" placeholder="0.00" oninput="calcularOrcamento()"/>'
  +'<label>EPI e Ferramentas (R$)</label><input type="number" id="epi" placeholder="0.00" oninput="calcularOrcamento()"/>'
  +'<label>Outros (R$)</label><input type="number" id="outros" placeholder="0.00" oninput="calcularOrcamento()"/>'
  +'<p style="color:#888;font-size:0.8rem;margin-top:8px">Taxa adm. materiais 10% automatica</p></div>'
  +'<div class="card"><h3>Resumo</h3>'
  +'<label>Margem de Lucro (%)</label><input type="number" id="margem" value="25" oninput="calcularOrcamento()"/>'
  +'<label>Entrada (%)</label><input type="number" id="percEntrada" value="50" oninput="calcularOrcamento()"/>'
  +'<label>Prazo</label><input type="text" id="prazo" placeholder="Ex: 10 dias uteis"/>'
  +'<label>Garantia</label><input type="text" id="garantia" placeholder="Ex: 6 meses"/></div>'
  +'<button onclick="calcularOrcamento()">Gerar Orcamento</button>'
  +'<div id="resultadoOrcamento"></div>';
}

function adicionarMaterial()  { materiais.push({desc:"",unid:"un",qtd:0,unit:0}); renderMateriais(); }
function adicionarMaoDeObra() { maoDeObra.push({desc:"",unid:"h",qtd:0,unit:0});  renderMaoDeObra(); }

function renderMateriais() {
  var el = document.getElementById("listaMateriais");
  if(!el) return;
  var html = "";
  for(var i=0;i<materiais.length;i++){
    var m = materiais[i];
    html += '<div style="border:1px solid #eee;border-radius:8px;padding:10px;margin-top:8px;">'
    +'<input type="text" placeholder="Descricao" value="'+m.desc+'" oninput="materiais['+i+'].desc=this.value" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px;font-size:0.9rem"/>'
    +'<div style="display:flex;gap:6px;">'
    +'<input type="text" placeholder="Unid" value="'+m.unid+'" oninput="materiais['+i+'].unid=this.value" style="width:55px;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem"/>'
    +'<input type="number" placeholder="Qtd" value="'+(m.qtd||"")+'" oninput="materiais['+i+'].qtd=parseFloat(this.value)||0;calcularOrcamento()" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem"/>'
    +'<input type="number" placeholder="R$ Unit" value="'+(m.unit||"")+'" oninput="materiais['+i+'].unit=parseFloat(this.value)||0;calcularOrcamento()" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem"/>'
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;margin-top:6px;">'
    +'<span style="color:#1a73e8;font-weight:bold;font-size:0.9rem">Total: R$ '+((m.qtd||0)*(m.unit||0)).toFixed(2)+'</span>'
    +'<span onclick="materiais.splice('+i+',1);renderMateriais();calcularOrcamento()" style="color:red;font-size:0.8rem;cursor:pointer">remover</span>'
    +'</div></div>';
  }
  el.innerHTML = html;
}

function renderMaoDeObra() {
  var el = document.getElementById("listaMaoDeObra");
  if(!el) return;
  var html = "";
  for(var i=0;i<maoDeObra.length;i++){
    var s = maoDeObra[i];
    html += '<div style="border:1px solid #eee;border-radius:8px;padding:10px;margin-top:8px;">'
    +'<input type="text" placeholder="Servico" value="'+s.desc+'" oninput="maoDeObra['+i+'].desc=this.value" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px;font-size:0.9rem"/>'
    +'<div style="display:flex;gap:6px;">'
    +'<input type="text" placeholder="Unid" value="'+s.unid+'" oninput="maoDeObra['+i+'].unid=this.value" style="width:55px;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem"/>'
    +'<input type="number" placeholder="Qtd" value="'+(s.qtd||"")+'" oninput="maoDeObra['+i+'].qtd=parseFloat(this.value)||0;calcularOrcamento()" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem"/>'
    +'<input type="number" placeholder="R$ Unit" value="'+(s.unit||"")+'" oninput="maoDeObra['+i+'].unit=parseFloat(this.value)||0;calcularOrcamento()" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem"/>'
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;margin-top:6px;">'
    +'<span style="color:#1a73e8;font-weight:bold;font-size:0.9rem">Total: R$ '+((s.qtd||0)*(s.unit||0)).toFixed(2)+'</span>'
    +'<span onclick="maoDeObra.splice('+i+',1);renderMaoDeObra();calcularOrcamento()" style="color:red;font-size:0.8rem;cursor:pointer">remover</span>'
    +'</div></div>';
  }
  el.innerHTML = html;
}

function calcularOrcamento() {
  if(!document.getElementById("listaMateriais")) return;
  renderMateriais(); renderMaoDeObra();
  var subMat=0; for(var i=0;i<materiais.length;i++) subMat+=materiais[i].qtd*materiais[i].unit;
  var subMao=0; for(var i=0;i<maoDeObra.length;i++) subMao+=maoDeObra[i].qtd*maoDeObra[i].unit;
  var taxaAdm=subMat*0.10;
  var frete=parseFloat(document.getElementById("frete").value)||0;
  var epi=parseFloat(document.getElementById("epi").value)||0;
  var outros=parseFloat(document.getElementById("outros").value)||0;
  var extras=frete+epi+outros;
  var base=subMat+subMao+taxaAdm+extras;
  var margem=parseFloat(document.getElementById("margem").value)||25;
  var total=base*(1+margem/100);
  var percEnt=parseFloat(document.getElementById("percEntrada").value)||50;
  var entrada=total*(percEnt/100);
  var numOrc=document.getElementById("numOrc").value||"ORC-001";
  var cliente=document.getElementById("cliente").value||"";
  var prazo=document.getElementById("prazo").value||"__ dias uteis";
  var garantia=document.getElementById("garantia").value||"__ meses";
  window._orcAtual={numOrc:numOrc,subMat:subMat,subMao:subMao,taxaAdm:taxaAdm,extras:extras};
  document.getElementById("resultadoOrcamento").innerHTML=
    '<div class="card resultado" style="margin-top:12px;">'
    +'<h3>'+numOrc+' - '+cliente+'</h3><hr/>'
    +'<p><strong>Materiais:</strong> R$ '+subMat.toFixed(2)+'</p>'
    +'<p><strong>Mao de Obra:</strong> R$ '+subMao.toFixed(2)+'</p>'
    +'<p><strong>Taxa Adm. (10%):</strong> R$ '+taxaAdm.toFixed(2)+'</p>'
    +'<p><strong>Extras:</strong> R$ '+extras.toFixed(2)+'</p>'
    +'<p><strong>Base:</strong> R$ '+base.toFixed(2)+'</p>'
    +'<p><strong>Lucro ('+margem+'%):</strong> R$ '+(total-base).toFixed(2)+'</p><hr/>'
    +'<p style="font-size:1.1rem;color:#1a73e8"><strong>OPCAO 1 - Com Materiais: R$ '+total.toFixed(2)+'</strong></p>'
    +'<p><strong>OPCAO 2 - So Mao de Obra: R$ '+subMao.toFixed(2)+'</strong></p><hr/>'
    +'<p><strong>Entrada ('+percEnt+'%):</strong> R$ '+entrada.toFixed(2)+'</p>'
    +'<p><strong>Restante:</strong> R$ '+(total-entrada).toFixed(2)+'</p>'
    +'<p><strong>Prazo:</strong> '+prazo+' | <strong>Garantia:</strong> '+garantia+'</p><hr/>'
    +'<button onclick="salvarOrcamento()" style="background:#1a73e8;">💾 Salvar Orçamento</button>'
    +'<button onclick="enviarParaCustos()" style="background:#ff6d00;margin-top:8px;">Enviar para Custos de Obra</button>'
    +'<button onclick="gerarPDF()" style="background:#28a745;margin-top:8px;">Gerar PDF / WhatsApp</button>'
    +'</div>';
}

function salvarOrcamento() {
  var o = window._orcAtual;
  if(!o){ alert("Gere um orcamento primeiro!"); return; }
  var numOrc   = document.getElementById("numOrc").value || o.numOrc || "ORC-001";
  var cliente  = document.getElementById("cliente").value || "";
  var endereco = document.getElementById("enderecoObra").value || "";
  var descServ = document.getElementById("descServico").value || "";
  var prazo    = document.getElementById("prazo").value || "";
  var garantia = document.getElementById("garantia").value || "";
  var margem   = parseFloat(document.getElementById("margem").value)||25;
  var percEnt  = parseFloat(document.getElementById("percEntrada").value)||50;
  var frete    = parseFloat(document.getElementById("frete").value)||0;
  var epi      = parseFloat(document.getElementById("epi").value)||0;
  var outros   = parseFloat(document.getElementById("outros").value)||0;
  var base     = o.subMat + o.subMao + o.taxaAdm + o.extras;
  var total    = base * (1 + margem/100);

  var registro = {
    numOrc: numOrc, cliente: cliente, endereco: endereco, descServ: descServ,
    prazo: prazo, garantia: garantia, margem: margem, percEntrada: percEnt,
    frete: frete, epi: epi, outros: outros,
    materiais: JSON.parse(JSON.stringify(materiais)),
    maoDeObra: JSON.parse(JSON.stringify(maoDeObra)),
    subMat: o.subMat, subMao: o.subMao, taxaAdm: o.taxaAdm, extras: o.extras,
    base: base, total: total,
    custoObra: base, custoTotal: base, valorTotal: total,
    data: new Date().toISOString().split("T")[0],
    criadoPor: usuarioAtual ? usuarioAtual.nome : ""
  };

  var idx = orcamentos.findIndex(function(x){ return x.numOrc === numOrc; });
  if(idx >= 0){
    if(!confirm("Já existe um orçamento "+numOrc+". Deseja sobrescrever?")) return;
    orcamentos[idx] = registro;
  } else {
    orcamentos.push(registro);
  }
  salvar("orcamentos", orcamentos);
  renderOrcamentosSalvos();
  alert("Orçamento "+numOrc+" salvo com sucesso!");
}

function renderOrcamentosSalvos() {
  var el = document.getElementById("listaOrcamentosSalvos");
  if(!el) return;
  if(!orcamentos || !orcamentos.length){
    el.innerHTML = '<div class="card" style="background:#f8fafc"><p style="color:#888;font-size:0.85rem;margin:0">📋 Nenhum orçamento salvo ainda.</p></div>';
    return;
  }
  var html = '<div class="card"><h3 style="margin-top:0">📋 Orçamentos Salvos ('+orcamentos.length+')</h3>';
  orcamentos.slice().reverse().forEach(function(o){
    var idx = orcamentos.indexOf(o);
    var dataFmt = o.data ? o.data.split("-").reverse().join("/") : "";
    html += '<div style="border:1px solid #eee;border-radius:8px;padding:10px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px">'
      +'<div style="flex:1">'
      +'<div style="font-weight:bold;color:#1a73e8">'+o.numOrc+' — '+(o.cliente||"Sem cliente")+'</div>'
      +'<div style="font-size:0.78rem;color:#888">📅 '+dataFmt+(o.descServ?' • '+o.descServ:'')+'</div>'
      +'<div style="font-size:0.9rem;font-weight:bold;color:#43a047;margin-top:2px">R$ '+(o.total||0).toFixed(2)+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:6px">'
      +'<button onclick="carregarOrcamento('+idx+')" style="background:#1a73e8;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:0.78rem;cursor:pointer">Abrir</button>'
      +'<button onclick="removerOrcamento('+idx+')" style="background:#e53935;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:0.78rem;cursor:pointer">✕</button>'
      +'</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

function carregarOrcamento(idx) {
  var o = orcamentos[idx];
  if(!o) return;
  document.getElementById("numOrc").value = o.numOrc || "";
  document.getElementById("cliente").value = o.cliente || "";
  document.getElementById("enderecoObra").value = o.endereco || "";
  document.getElementById("descServico").value = o.descServ || "";
  document.getElementById("frete").value = o.frete || "";
  document.getElementById("epi").value = o.epi || "";
  document.getElementById("outros").value = o.outros || "";
  document.getElementById("margem").value = o.margem || 25;
  document.getElementById("percEntrada").value = o.percEntrada || 50;
  document.getElementById("prazo").value = o.prazo || "";
  document.getElementById("garantia").value = o.garantia || "";
  materiais = (o.materiais && o.materiais.length) ? JSON.parse(JSON.stringify(o.materiais)) : [{desc:"",unid:"m",qtd:0,unit:0}];
  maoDeObra = (o.maoDeObra && o.maoDeObra.length) ? JSON.parse(JSON.stringify(o.maoDeObra)) : [{desc:"",unid:"h",qtd:0,unit:0}];
  renderMateriais();
  renderMaoDeObra();
  calcularOrcamento();
  window.scrollTo(0, document.body.scrollHeight);
}

function removerOrcamento(idx) {
  if(!confirm("Remover este orçamento salvo?")) return;
  orcamentos.splice(idx, 1);
  salvar("orcamentos", orcamentos);
  renderOrcamentosSalvos();
}

function enviarParaCustos() {
  var o=window._orcAtual;
  if(!o){alert("Gere um orcamento primeiro!");return;}
  var itens=[
    {obra:o.numOrc,tipo:"Material",   desc:"Materiais do orcamento",  valor:o.subMat,  data:new Date().toISOString().split("T")[0]},
    {obra:o.numOrc,tipo:"Mao de Obra",desc:"Mao de obra do orcamento",valor:o.subMao,  data:new Date().toISOString().split("T")[0]},
    {obra:o.numOrc,tipo:"Outro",      desc:"Taxa adm. 10%",           valor:o.taxaAdm, data:new Date().toISOString().split("T")[0]},
    {obra:o.numOrc,tipo:"Outro",      desc:"Extras",                  valor:o.extras,  data:new Date().toISOString().split("T")[0]}
  ];
  for(var i=0;i<itens.length;i++) if(itens[i].valor>0) custos.push(itens[i]);
  salvar("custos",custos);
  alert("Itens enviados para Custos de Obra!");
}

function telaCustos() {
  return '<h2>Custos de Obra</h2>'
  +'<div class="card">'
  +'<label>Nome da Obra</label><input type="text" id="nomeObra" placeholder="Ex: Casa Joao"/>'
  +'<label>Tipo</label>'
  +'<select id="tipoDespesa"><option>Material</option><option>Mao de Obra</option><option>Transporte</option><option>Equipamento</option><option>Outro</option></select>'
  +'<label>Descricao</label><input type="text" id="descDespesa" placeholder="Ex: Fio 2.5mm"/>'
  +'<label>Valor (R$)</label><input type="number" id="valorDespesa" placeholder="0.00"/>'
  +'<label>Data da Despesa</label><input type="date" id="dataDespesa"/>'
  +'<button onclick="adicionarCusto()">Adicionar Despesa</button>'
  +'</div><div id="listaCustos"></div><div id="totalCustos"></div>';
}

function adicionarCusto() {
  var obra  = document.getElementById("nomeObra").value;
  var tipo  = document.getElementById("tipoDespesa").value;
  var desc  = document.getElementById("descDespesa").value;
  var valor = parseFloat(document.getElementById("valorDespesa").value)||0;
  var data  = document.getElementById("dataDespesa").value||new Date().toISOString().split("T")[0];
  if(!obra||!desc||valor<=0){alert("Preencha todos os campos!");return;}
  custos.push({obra:obra,tipo:tipo,desc:desc,valor:valor,data:data});
  salvar("custos",custos); renderCustos();
  document.getElementById("descDespesa").value="";
  document.getElementById("valorDespesa").value="";
}

function renderCustos() {
  var total=0;
  for(var i=0;i<custos.length;i++) total+=custos[i].valor;
  var html="";
  for(var i=0;i<custos.length;i++){
    var c=custos[i];
    var dataFormatada=c.data?c.data.split("-").reverse().join("/"):"—";
    html+='<div style="padding:8px 0;border-bottom:1px solid #eee;">'
      +'<strong>'+c.tipo+'</strong> - '+c.desc+' ('+c.obra+')<br/>'
      +'<span style="font-size:0.78rem;color:#888">📅 '+dataFormatada+'</span><br/>'
      +'<span style="color:#1a73e8;font-weight:bold">R$ '+c.valor.toFixed(2)+'</span> '
      +'<span onclick="custos.splice('+i+',1);salvar(\'custos\',custos);renderCustos()" style="color:red;cursor:pointer;font-size:0.8rem">remover</span>'
      +'</div>';
  }
  document.getElementById("listaCustos").innerHTML='<div class="card">'+(html||"<p>Nenhuma despesa.</p>")+'</div>';
  document.getElementById("totalCustos").innerHTML='<div class="card" style="background:#1a73e8;color:white;text-align:center;"><strong>Total: R$ '+total.toFixed(2)+'</strong></div>';
}

function telaFuncionarios() {
  return '<h2>Funcionarios</h2>'
  +'<div class="card">'
  +'<label>Nome</label><input type="text" id="nomeFuncionario" placeholder="Ex: Carlos"/>'
  +'<label>Funcao</label><input type="text" id="funcaoFuncionario" placeholder="Ex: Eletricista"/>'
  +'<label>Salario (R$)</label><input type="number" id="salarioFuncionario" placeholder="0.00"/>'
  +'<label>Encargos (%)</label><input type="number" id="encargosFuncionario" placeholder="Ex: 70"/>'
  +'<button onclick="adicionarFuncionario()">Adicionar Funcionario</button>'
  +'</div><div id="listaFuncionarios"></div><div id="totalFolha"></div>';
}

function adicionarFuncionario() {
  var nome  =document.getElementById("nomeFuncionario").value;
  var funcao=document.getElementById("funcaoFuncionario").value;
  var sal   =parseFloat(document.getElementById("salarioFuncionario").value)||0;
  var enc   =parseFloat(document.getElementById("encargosFuncionario").value)||0;
  if(!nome||!funcao||sal<=0){alert("Preencha todos os campos!");return;}
  funcionarios.push({nome:nome,funcao:funcao,salario:sal,encargos:enc,custoTotal:sal*(1+enc/100)});
  salvar("funcionarios",funcionarios); renderFuncionarios();
  document.getElementById("nomeFuncionario").value="";
  document.getElementById("funcaoFuncionario").value="";
  document.getElementById("salarioFuncionario").value="";
  document.getElementById("encargosFuncionario").value="";
}

function renderFuncionarios() {
  var total=0; for(var i=0;i<funcionarios.length;i++) total+=funcionarios[i].custoTotal;
  var html="";
  for(var i=0;i<funcionarios.length;i++){
    var f=funcionarios[i];
    html+='<div style="padding:8px 0;border-bottom:1px solid #eee;">'
    +'<strong>'+f.nome+'</strong> - '+f.funcao+'<br/>'
    +'<span style="color:#1a73e8;font-weight:bold">R$ '+f.salario.toFixed(2)+' +'+f.encargos+'% = R$ '+f.custoTotal.toFixed(2)+'</span> '
    +'<span onclick="funcionarios.splice('+i+',1);salvar(\'funcionarios\',funcionarios);renderFuncionarios()" style="color:red;cursor:pointer;font-size:0.8rem">remover</span>'
    +'</div>';
  }
  document.getElementById("listaFuncionarios").innerHTML='<div class="card">'+(html||"<p>Nenhum funcionario.</p>")+'</div>';
  document.getElementById("totalFolha").innerHTML='<div class="card" style="background:#1a73e8;color:white;text-align:center;"><strong>Folha: R$ '+total.toFixed(2)+'</strong></div>';
}

function telaFinanceiro() {
  var somenteLeitura = !podeEditar("financeiro");
  var html = '<h2>Financeiro</h2>';
  if(somenteLeitura){
    html += '<div class="card" style="background:#fff8e1;border-left:4px solid #fb8c00"><p style="margin:0;font-size:0.85rem">🔒 <strong>Modo somente-leitura.</strong> Seu perfil pode visualizar o financeiro, mas não pode adicionar ou editar lançamentos.</p></div>';
  } else {
    html += '<div class="card">'
      +'<label>Tipo</label>'
      +'<select id="tipoLanc"><option value="entrada">Entrada</option><option value="saida">Saida</option></select>'
      +'<label>Descricao</label><input type="text" id="descLanc" placeholder="Ex: Pagamento obra"/>'
      +'<label>Valor (R$)</label><input type="number" id="valorLanc" placeholder="0.00"/>'
      +'<button onclick="adicionarLancamento()">Adicionar Lancamento</button>'
      +'</div>';
  }
  html += '<div id="listaLancamentos"></div><div id="resumoFinanceiro"></div>';
  return html;
}

function adicionarLancamento() {
  if(!podeEditar("financeiro")){ alert("Seu perfil não pode adicionar lançamentos no financeiro."); return; }
  var tipo =document.getElementById("tipoLanc").value;
  var desc =document.getElementById("descLanc").value;
  var valor=parseFloat(document.getElementById("valorLanc").value)||0;
  if(!desc||valor<=0){alert("Preencha todos os campos!");return;}
  lancamentos.push({tipo:tipo,desc:desc,valor:valor});
  salvar("lancamentos",lancamentos); renderFinanceiro();
  document.getElementById("descLanc").value="";
  document.getElementById("valorLanc").value="";
}

function renderFinanceiro() {
  var entradas=0,saidas=0;
  for(var i=0;i<lancamentos.length;i++){
    if(lancamentos[i].tipo==="entrada") entradas+=lancamentos[i].valor;
    else saidas+=lancamentos[i].valor;
  }
  var saldo=entradas-saidas;
  var html="";
  for(var i=0;i<lancamentos.length;i++){
    var l=lancamentos[i];
    html+='<div style="padding:8px 0;border-bottom:1px solid #eee;">'
    +'<strong>'+(l.tipo==="entrada"?"(+)":"(-)")+' '+l.desc+'</strong><br/>'
    +'<span style="color:'+(l.tipo==="entrada"?"green":"red")+';font-weight:bold">R$ '+l.valor.toFixed(2)+'</span> '
    +(podeEditar("financeiro")?'<span onclick="lancamentos.splice('+i+',1);salvar(\'lancamentos\',lancamentos);renderFinanceiro()" style="color:red;cursor:pointer;font-size:0.8rem">remover</span>':'')
    +'</div>';
  }
  document.getElementById("listaLancamentos").innerHTML='<div class="card">'+(html||"<p>Nenhum lancamento.</p>")+'</div>';
  document.getElementById("resumoFinanceiro").innerHTML='<div class="card">'
    +'<p style="color:green"><strong>Entradas: R$ '+entradas.toFixed(2)+'</strong></p>'
    +'<p style="color:red;margin-top:8px"><strong>Saidas: R$ '+saidas.toFixed(2)+'</strong></p>'
    +'<hr/><p style="font-size:1.3rem;color:'+(saldo>=0?"#1a73e8":"red")+'"><strong>Saldo: R$ '+saldo.toFixed(2)+'</strong></p>'
    +'</div>';
}

function telaProlabore() {
  var entradas=0,saidas=0,totalCustosP=0,totalFolha=0;
  for(var i=0;i<lancamentos.length;i++){
    if(lancamentos[i].tipo==="entrada") entradas+=lancamentos[i].valor;
    else saidas+=lancamentos[i].valor;
  }
  for(var i=0;i<custos.length;i++) totalCustosP+=custos[i].valor;
  for(var i=0;i<funcionarios.length;i++) totalFolha+=funcionarios[i].custoTotal;
  var outras=saidas-totalCustosP-totalFolha; if(outras<0) outras=0;
  var somenteLeitura = !podeEditar("prolabore");
  var html = '<h2>Lucro e Pro-labore</h2>';
  if(somenteLeitura){
    html += '<div class="card" style="background:#fff8e1;border-left:4px solid #fb8c00"><p style="margin:0;font-size:0.85rem">🔒 <strong>Modo somente-leitura.</strong> Seu perfil pode visualizar, mas não pode editar ou fazer lançamentos no lucro e pró-labore.</p></div>';
  }
  html += '<div class="card" style="background:#f0f7ff;">'
  +'<h3>Dados Automaticos</h3><hr/>'
  +'<p>Faturamento: <strong style="color:green">R$ '+entradas.toFixed(2)+'</strong></p>'
  +'<p>Custos de Obra: <strong style="color:red">R$ '+totalCustosP.toFixed(2)+'</strong></p>'
  +'<p>Folha: <strong style="color:red">R$ '+totalFolha.toFixed(2)+'</strong></p>'
  +'<p>Outras Saidas: <strong style="color:red">R$ '+outras.toFixed(2)+'</strong></p>'
  +'</div>';
  if(!somenteLeitura){
    html += '<div class="card">'
    +'<h3>Socios</h3>'
    +'<label>Nome do Socio 1</label><input type="text" id="socio1" placeholder="Ex: Joao"/>'
    +'<label>Nome do Socio 2</label><input type="text" id="socio2" placeholder="Ex: Pedro"/>'
    +'<label>Participacao do Socio 1 (%)</label><input type="number" id="percSocio1" placeholder="Ex: 60"/>'
    +'<button onclick="calcularProlabore()">Calcular Lucro e Pro-labore</button>'
    +'</div>';
  }
  html += '<div id="resultadoProlabore"></div>';
  return html;
}

function calcularProlabore() {
  if(!podeEditar("prolabore")){ alert("Seu perfil não pode editar lucro e pró-labore."); return; }
  var entradas=0,saidas=0,totalCustosP=0,totalFolha=0;
  for(var i=0;i<lancamentos.length;i++){
    if(lancamentos[i].tipo==="entrada") entradas+=lancamentos[i].valor;
    else saidas+=lancamentos[i].valor;
  }
  for(var i=0;i<custos.length;i++) totalCustosP+=custos[i].valor;
  for(var i=0;i<funcionarios.length;i++) totalFolha+=funcionarios[i].custoTotal;
  var outras=saidas-totalCustosP-totalFolha; if(outras<0) outras=0;
  var lucro=entradas-(totalCustosP+totalFolha+outras);
  var s1=document.getElementById("socio1").value||"Socio 1";
  var s2=document.getElementById("socio2").value||"Socio 2";
  var p1=parseFloat(document.getElementById("percSocio1").value)||50;
  var p2=100-p1;
  var cor=lucro>=0?"#1a73e8":"red";
  document.getElementById("resultadoProlabore").innerHTML=
    '<div class="card resultado">'
    +'<h3>Resultado</h3>'
    +'<p><strong>Faturamento:</strong> R$ '+entradas.toFixed(2)+'</p><hr/>'
    +'<p style="color:red"><strong>(-) Custos:</strong> R$ '+totalCustosP.toFixed(2)+'</p>'
    +'<p style="color:red"><strong>(-) Folha:</strong> R$ '+totalFolha.toFixed(2)+'</p>'
    +'<p style="color:red"><strong>(-) Outras Saidas:</strong> R$ '+outras.toFixed(2)+'</p><hr/>'
    +'<p style="fron-size:1.2rem;color:'+cor+'"><strong>Lucro Liquido: R$ '+lucro.toFixed(2)+'</strong> </p>'
    +'<hr/><h3>Pro-labore</h3>'
    +'<div style="background:#f0f7ff;border-radius:8px;padding:12px;margin-top:10px">'
    +'<p><strong>'+s1+' ('+p1+'%): </strong> <span style="color:#1a73e8;font- weight:bold;font-size:1.1rem">R$ '+(lucro*p1/100).toFixed(2)+'</span></p>'
    +'<p style="margin-top:10px"><strong>'+s2+' ('+p2+'%):</strong> <span style="color:#1a73e8;font-weight:bold;font-size:1.1rem">R$ '+(lucro*p2/100).toFixed(2)+'</span></p>'
    +'</div></div>';

}

function gerarPDF() {
  var o = window._orcAtual;
  if(!o){alert("Gere um orcamento primeiro!");return;}
  var numOrc   = document.getElementById("numOrc").value||"PC-001";
  var cliente  = document.getElementById("cliente").value||"";
  var endereco = document.getElementById("enderecoObra").value||"";
  var descServ = document.getElementById("descServico").value||"";
  var prazo    = document.getElementById("prazo").value||"__ dias uteis";
  var garantia = document.getElementById("garantia").value||"__ meses";
  var margem   = parseFloat(document.getElementById("margem").value)||25;
  var percEnt  = parseFloat(document.getElementById("percEntrada").value)||50;
  var base     = o.subMat+o.subMao+o.taxaAdm+o.extras;
  var total    = base*(1+margem/100);
  var entrada  = total*(percEnt/100);
  var hoje     = new Date().toLocaleDateString("pt-BR");
  var linhasMat="";
  for(var i=0;i<materiais.length;i++){
    var m=materiais[i];
    if(m.desc) linhasMat+='<tr><td>'+m.desc+'</td><td style="text-align:center">'+m.unid+'</td><td style="text-align:center">'+m.qtd+'</td><td style="text-align:right">R$ '+m.unit.toFixed(2)+'</td><td style="text-align:right">R$ '+(m.qtd*m.unit).toFixed(2)+'</td></tr>';
  }
  var linhasMao="";
  for(var i=0;i<maoDeObra.length;i++){
    var s=maoDeObra[i];
    if(s.desc) linhasMao+='<tr><td>'+s.desc+'</td><td style="text-align:center">'+s.unid+'</td><td style="text-align:center">'+s.qtd+'</td><td style="text-align:right">R$ '+s.unit.toFixed(2)+'</td><td style="text-align:right">R$ '+(s.qtd*s.unit).toFixed(2)+'</td></tr>';
  }
  var html='<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Proposta '+numOrc+'</title>'
  +'<style>*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}body{padding:24px;color:#222;font-size:0.85rem}.topo{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1a73e8;padding-bottom:12px;margin-bottom:16px}.empresa{font-size:1.3rem;font-weight:bold;color:#1a73e8}.subtitulo{font-size:0.8rem;color:#555}.titulo-proposta{text-align:center;font-size:1.1rem;font-weight:bold;background:#1a73e8;color:white;padding:8px;margin-bottom:16px}.secao{background:#1a73e8;color:white;padding:6px 10px;font-weight:bold;margin:14px 0 6px 0;font-size:0.85rem}.bloco{border:1px solid #ddd;padding:10px;margin-bottom:4px}.linha{display:flex;gap:20px;margin-bottom:4px}.campo label{font-size:0.75rem;color:#888}.campo p{font-weight:bold;border-bottom:1px solid #ddd;min-width:150px;padding-bottom:2px}table{width:100%;border-collapse:collapse;margin-bottom:4px}th{background:#1a73e8;color:white;padding:7px;text-align:left;font-size:0.8rem}td{padding:6px 7px;border-bottom:1px solid #eee;font-size:0.8rem}.subtotal td{background:#e8f0fe;font-weight:bold}.opcao1 td{background:#1a73e8;color:white;font-weight:bold;padding:8px}.opcao2 td{background:#e8f0fe;font-weight:bold;padding:8px}.cond{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}.cond div{border:1px solid #ddd;padding:8px}.cond label{font-size:0.75rem;color:#888;display:block}.cond p{font-weight:bold}.obs{border:1px solid #ddd;padding:10px;font-size:0.8rem;color:#555;margin-bottom:12px}.assinatura{display:flex;justify-content:space-between;margin-top:20px}.assinatura div{text-align:center;width:45%}.assinatura .linha-ass{border-top:1px solid #333;margin-bottom:6px}.rodape{text-align:center;font-size:0.75rem;color:#888;margin-top:16px;border-top:1px solid #eee;padding-top:8px}@media print{.btn-print{display:none}}</style></head><body>'
  +'<div class="topo"><div><div class="empresa">A.D.C. INSTALACOES</div><div class="subtitulo">Servicos Eletricos e Construcao Civil</div></div><div style="text-align:right"><div style="font-size:0.8rem;color:#555">Nr da Proposta: <strong>'+numOrc+'</strong></div><div style="font-size:0.8rem;color:#555">Data: <strong>'+hoje+'</strong></div></div></div>'
  +'<div class="titulo-proposta">PROPOSTA COMERCIAL — SERVICOS ELETRICOS</div>'
  +'<div class="secao">DADOS DO CLIENTE</div><div class="bloco"><div class="linha"><div class="campo"><label>Cliente/Empresa</label><p>'+cliente+'</p></div><div class="campo"><label>Endereco da Obra</label><p>'+endereco+'</p></div></div></div>'
  +'<div class="secao">DESCRICAO DO SERVICO</div><div class="bloco"><p style="font-size:0.85rem">'+(descServ||"—")+'</p></div>'
  +'<div class="secao">MATERIAIS</div><table><tr><th>Descricao</th><th style="text-align:center">Unid.</th><th style="text-align:center">Qtd.</th><th style="text-align:right">Unit. (R$)</th><th style="text-align:right">Total (R$)</th></tr>'+linhasMat+'<tr class="subtotal"><td colspan="4">SUBTOTAL — MATERIAIS</td><td style="text-align:right">R$ '+o.subMat.toFixed(2)+'</td></tr><tr class="subtotal"><td colspan="4">Taxa Adm. (10%)</td><td style="text-align:right">R$ '+o.taxaAdm.toFixed(2)+'</td></tr></table>'
  +'<div class="secao">MAO DE OBRA</div><table><tr><th>Descricao</th><th style="text-align:center">Unid.</th><th style="text-align:center">Qtd.</th><th style="text-align:right">Unit. (R$)</th><th style="text-align:right">Total (R$)</th></tr>'+linhasMao+'<tr class="subtotal"><td colspan="4">SUBTOTAL — MAO DE OBRA</td><td style="text-align:right">R$ '+o.subMao.toFixed(2)+'</td></tr></table>'
  +'<div class="secao">OPCOES DE CONTRATACAO</div><table><tr><th>Opcao</th><th>Incluso</th><th style="text-align:right">Valor (R$)</th></tr><tr class="opcao1"><td>OPCAO 1 — COM MATERIAIS</td><td>Materiais + Mao de obra</td><td style="text-align:right">R$ '+total.toFixed(2)+'</td></tr><tr class="opcao2"><td>OPCAO 2 — SO MAO DE OBRA</td><td>Cliente fornece material</td><td style="text-align:right">R$ '+o.subMao.toFixed(2)+'</td></tr></table>'
  +'<div class="secao">CONDICOES COMERCIAIS</div><div class="cond"><div><label>Pagamento</label><p>'+percEnt+'% entrada + restante na conclusao</p></div><div><label>Entrada</label><p>R$ '+entrada.toFixed(2)+'</p></div><div><label>Prazo</label><p>'+prazo+'</p></div><div><label>Garantia</label><p>'+garantia+'</p></div><div><label>Validade</label><p>15 dias</p></div><div><label>Normas</label><p>NR-10 | NR-12 | ABNT NBR 5410</p></div></div>'
  +'<div class="secao">OBSERVACOES</div><div class="obs">• Este orcamento nao inclui obras civis ou servicos nao descritos acima.<br/>• Eventuais alteracoes no escopo serao objeto de aditivo contratual.</div>'
  +'<div class="assinatura"><div><div class="linha-ass"></div><p>A.D.C. Instalacoes — Responsavel Tecnico</p></div><div><div class="linha-ass"></div><p>Cliente / Contratante</p><p style="margin-top:6px;font-size:0.8rem;color:#888">Data: ___/___/______</p></div></div>'
  +'<div class="rodape">A.D.C. Instalacoes | Proposta gerada em '+hoje+' | Valida por 15 dias</div>'
  +'<div style="text-align:center;margin-top:16px"><button class="btn-print" onclick="window.print()" style="padding:12px 30px;background:#1a73e8;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;margin-right:10px">Imprimir / Salvar PDF</button><button class="btn-print" onclick="window.close()" style="padding:12px 20px;background:#888;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer">Fechar</button></div>'
  +'</body></html>';
  var win=window.open("","_blank");
  win.document.write(html);
  win.document.close();
}

var graficoObrasInstance = null;

function atualizarDashboard() {
  var faturamento = 0, totalCustosGeral = 0, totalRecebido = 0;
  obras.forEach(function(o){
    var vf = parseFloat(o.valorFinal||0);
    var vc = parseFloat(o.valorContrato||0);
    faturamento      += (vf > 0 ? vf : vc);
    totalRecebido    += vf;
    totalCustosGeral += custoTotalDaObra(o);
  });
  var lucro        = faturamento - totalCustosGeral;
  var obrasAtivas  = obras.filter(function(o){ return o.status==="andamento"; }).length;
  var obrasConcl   = obras.filter(function(o){ return o.status==="concluida"; }).length;
  var obrasAguard  = obras.filter(function(o){ return o.status==="aguardando"; }).length;

  var dadosCards = [
    {icon:"💰", label:"Faturamento Total",  valor:"R$ "+faturamento.toFixed(2),      cor:"#1a73e8"},
    {icon:"📦", label:"Custos Totais",       valor:"R$ "+totalCustosGeral.toFixed(2), cor:"#e53935"},
    {icon:"📈", label:"Lucro Liquido",        valor:"R$ "+lucro.toFixed(2),            cor:"#43a047"},
    {icon:"🏗️", label:"Obras Ativas",         valor:obrasAtivas+" obra(s)",            cor:"#fb8c00"}
  ];

  var htmlCards="";
  dadosCards.forEach(function(c){
    htmlCards+='<div style="background:white;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-left:4px solid '+c.cor+'">'
      +'<div style="font-size:1.4rem">'+c.icon+'</div>'
      +'<div style="font-size:0.8rem;color:#888;margin:4px 0">'+c.label+'</div>'
      +'<div style="font-size:1.2rem;font-weight:bold;color:'+c.cor+'">'+c.valor+'</div>'
      +'</div>';
  });
  document.getElementById("cards-financeiros").innerHTML = htmlCards;

  // cards de status de obras
  document.getElementById("cards-obras").innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">'
    +'<div style="background:#fff8e1;border-radius:10px;padding:12px;text-align:center"><div style="font-size:0.72rem;color:#888">Aguardando</div><div style="font-weight:bold;color:#fb8c00;font-size:1.3rem">'+obrasAguard+'</div></div>'
    +'<div style="background:#e8f0fe;border-radius:10px;padding:12px;text-align:center"><div style="font-size:0.72rem;color:#888">Em Andamento</div><div style="font-weight:bold;color:#1a73e8;font-size:1.3rem">'+obrasAtivas+'</div></div>'
    +'<div style="background:#e6f4ea;border-radius:10px;padding:12px;text-align:center"><div style="font-size:0.72rem;color:#888">Concluidas</div><div style="font-weight:bold;color:#43a047;font-size:1.3rem">'+obrasConcl+'</div></div>'
    +'</div>'
    + renderObrasResumoDash();

  // grafico
  var nomesObras   = obras.map(function(o){ return o.nome; });
  var valoresObras = obras.map(function(o){ return parseFloat(o.valorContrato||0); });
  var custosObras  = obras.map(function(o){ return custoTotalDaObra(o); });

  if(graficoObrasInstance) graficoObrasInstance.destroy();
  var ctx = document.getElementById("graficoObras").getContext("2d");
  graficoObrasInstance = new Chart(ctx,{
    type:"bar",
    data:{
      labels: nomesObras.length ? nomesObras : ["Nenhuma obra"],
      datasets:[
        {label:"Contrato (R$)", data:valoresObras, backgroundColor:"#1a73e8"},
        {label:"Custos (R$)",   data:custosObras,  backgroundColor:"#e53935"}
      ]
    },
    options:{responsive:true,plugins:{legend:{position:"top"}},scales:{y:{beginAtZero:true}}}
  });
}

function renderObrasResumoDash() {
  if(!obras.length) return '<p style="color:#aaa;text-align:center;padding:10px">Nenhuma obra cadastrada.</p>';
  var cores  = {aguardando:"#fb8c00", andamento:"#1a73e8", concluida:"#43a047", cancelada:"#e53935"};
  var labels = {aguardando:"⏳ Aguardando", andamento:"🔄 Em Andamento", concluida:"✅ Concluida", cancelada:"❌ Cancelada"};
  var html="";
  obras.forEach(function(o){
    var cor       = cores[o.status]||"#888";
    var label     = labels[o.status]||o.status;
    var custoObra = custoTotalDaObra(o);
    var lucro     = (o.valorFinal>0?o.valorFinal:o.valorContrato) - custoObra;
    html+='<div style="background:white;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:10px;border-top:3px solid '+cor+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      +'<strong style="font-size:0.95rem">'+o.nome+'</strong>'
      +'<span style="background:'+cor+';color:white;border-radius:10px;padding:2px 10px;font-size:0.75rem">'+label+'</span>'
      +'</div>'
      +'<div style="font-size:0.8rem;color:#888;margin-bottom:8px">👤 '+o.cliente+' | 📋 '+o.orc+'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center">'
      +'<div style="background:#e8f0fe;border-radius:8px;padding:6px"><div style="font-size:0.68rem;color:#888">Contrato</div><div style="font-weight:bold;color:#1a73e8;font-size:0.82rem">R$ '+parseFloat(o.valorContrato||0).toFixed(2)+'</div></div>'
      +'<div style="background:#fce8e6;border-radius:8px;padding:6px"><div style="font-size:0.68rem;color:#888">Custos</div><div style="font-weight:bold;color:#e53935;font-size:0.82rem">R$ '+custoObra.toFixed(2)+'</div></div>'
      +'<div style="background:#e6f4ea;border-radius:8px;padding:6px"><div style="font-size:0.68rem;color:#888">Lucro</div><div style="font-weight:bold;color:#43a047;font-size:0.82rem">R$ '+lucro.toFixed(2)+'</div></div>'
      +'</div></div>';
  });
  return html;
}

function telaClientes() {
  return '<h2>Clientes</h2>'
  +'<div class="card">'
  +'<label>Nome / Empresa</label><input type="text" id="nomeCliente" placeholder="Ex: Joao Silva"/>'
  +'<label>CPF / CNPJ</label><input type="text" id="docCliente" placeholder="Ex: 000.000.000-00"/>'
  +'<label>Telefone</label><input type="text" id="telCliente" placeholder="Ex: (11) 99999-9999"/>'
  +'<label>Endereco</label><input type="text" id="endCliente" placeholder="Ex: Rua das Flores, 123"/>'
  +'<label>E-mail</label><input type="text" id="emailCliente" placeholder="Ex: joao@email.com"/>'
  +'<button onclick="adicionarCliente()">Cadastrar Cliente</button>'
  +'</div>'
  +'<div class="card" style="margin-bottom:8px"><input type="text" id="buscaCliente" placeholder="🔍 Buscar cliente..." oninput="renderClientes()" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem"/></div>'
  +'<div id="listaClientes"></div>';
}

function adicionarCliente() {
  var nome =document.getElementById("nomeCliente").value;
  var doc  =document.getElementById("docCliente").value;
  var tel  =document.getElementById("telCliente").value;
  var end  =document.getElementById("endCliente").value;
  var email=document.getElementById("emailCliente").value;
  if(!nome){alert("Informe o nome do cliente!");return;}
  clientes.push({nome:nome,doc:doc,tel:tel,end:end,email:email,orcamentos:[]});
  salvar("clientes",clientes); renderClientes();
  document.getElementById("nomeCliente").value="";
  document.getElementById("docCliente").value="";
  document.getElementById("telCliente").value="";
  document.getElementById("endCliente").value="";
  document.getElementById("emailCliente").value="";
}

function renderClientes() {
  var el=document.getElementById("listaClientes");
  if(!el) return;
  var busca=(document.getElementById("buscaCliente").value||"").toLowerCase();
  var lista=clientes.filter(function(c){ return c.nome.toLowerCase().includes(busca); });
  if(!lista.length){el.innerHTML='<p style="color:#888;padding:12px">Nenhum cliente encontrado.</p>';return;}
  var html="";
  lista.forEach(function(c,idx){
    var totalFat=0,totalCusto=0,totalLucro=0,linhasOrc="";
    if(c.orcamentos&&c.orcamentos.length){
      c.orcamentos.forEach(function(o){
        totalFat+=parseFloat(o.valorTotal||0);
        totalCusto+=parseFloat(o.custoObra||0);
        totalLucro+=parseFloat(o.lucro||0);
        var sCor=o.status==="aprovado"?"#43a047":o.status==="recusado"?"#e53935":"#fb8c00";
        var sLbl=o.status==="aprovado"?"Aprovado":o.status==="recusado"?"Recusado":"Pendente";
        linhasOrc+='<tr><td>'+o.numOrc+'</td><td>R$ '+parseFloat(o.valorTotal||0).toFixed(2)+'</td><td>R$ '+parseFloat(o.custoObra||0).toFixed(2)+'</td><td style="color:#43a047;font-weight:bold">R$ '+parseFloat(o.lucro||0).toFixed(2)+'</td><td><span style="background:'+sCor+';color:white;border-radius:12px;padding:2px 8px;font-size:0.75rem">'+sLbl+'</span> <span onclick="removerOrcamentoCliente('+idx+',\''+o.numOrc+'\')" style="color:red;cursor:pointer;font-size:0.75rem">✕</span></td></tr>';
      });
    }
    html+='<div style="background:white;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:12px;border-left:4px solid #1a73e8">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><strong style="font-size:1rem">'+c.nome+'</strong><br/><span style="font-size:0.8rem;color:#888">'+(c.doc||"")+'</span></div><span onclick="removerCliente('+idx+')" style="color:red;cursor:pointer">🗑️</span></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.82rem;color:#555;margin-bottom:10px"><div>📞 '+(c.tel||"—")+'</div><div>✉️ '+(c.email||"—")+'</div><div>📍 '+(c.end||"—")+'</div></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;margin-bottom:10px"><div style="background:#e8f0fe;border-radius:8px;padding:8px"><div style="font-size:0.7rem;color:#888">Faturado</div><div style="font-weight:bold;color:#1a73e8;font-size:0.9rem">R$ '+totalFat.toFixed(2)+'</div></div><div style="background:#fce8e6;border-radius:8px;padding:8px"><div style="font-size:0.7rem;color:#888">Custo</div><div style="font-weight:bold;color:#e53935;font-size:0.9rem">R$ '+totalCusto.toFixed(2)+'</div></div><div style="background:#e6f4ea;border-radius:8px;padding:8px"><div style="font-size:0.7rem;color:#888">Lucro</div><div style="font-weight:bold;color:#43a047;font-size:0.9rem">R$ '+totalLucro.toFixed(2)+'</div></div></div>'
      +(c.orcamentos&&c.orcamentos.length?'<table style="width:100%;border-collapse:collapse;font-size:0.8rem"><tr style="background:#f5f5f5"><th style="padding:6px;text-align:left">Orcamento</th><th>Valor</th><th>Custo</th><th>Lucro</th><th>Status</th></tr>'+linhasOrc+'</table>':'<p style="font-size:0.8rem;color:#aaa">Nenhum orcamento vinculado.</p>')
      +'<button onclick="abrirVincularOrcamento('+idx+')" style="margin-top:10px;background:#1a73e8;font-size:0.82rem;padding:6px 14px">+ Vincular Orcamento</button></div>';
  });
  el.innerHTML = html;
}

function abrirVincularOrcamento(idx) {
  var jaVinc = (clientes[idx].orcamentos||[]).map(function(o){ return o.numOrc; });
  var disponiveis = (orcamentos||[]).filter(function(o){ return jaVinc.indexOf(o.numOrc) === -1; });

  if (!orcamentos || !orcamentos.length) {
    alert("Nenhum orçamento salvo ainda.\n\nVá em Orçamentos, gere um e clique em '💾 Salvar Orçamento' para que ele apareça aqui.");
    return;
  }
  if (!disponiveis.length) {
    alert("Todos os orçamentos salvos já estão vinculados a este cliente.");
    return;
  }

  // Modal de seleção
  var overlay = document.createElement("div");
  overlay.id = "modalVincOrc";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px";
  var opts = '<option value="">— Selecione um orçamento salvo —</option>';
  disponiveis.forEach(function(o){
    var v = parseFloat(o.valorTotal||0).toFixed(2);
    opts += '<option value="'+o.numOrc+'">'+o.numOrc+' — '+(o.cliente||"sem cliente")+' — R$ '+v+'</option>';
  });
  overlay.innerHTML =
    '<div style="background:white;border-radius:14px;padding:18px;max-width:420px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.25)">'
    +'<h3 style="margin:0 0 10px;font-size:1.05rem">Vincular Orçamento a '+clientes[idx].nome+'</h3>'
    +'<label style="font-size:0.85rem;color:#555">Orçamento salvo</label>'
    +'<select id="selVincOrc" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 12px;font-size:0.95rem">'+opts+'</select>'
    +'<label style="font-size:0.85rem;color:#555">Status</label>'
    +'<select id="selVincStatus" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 14px;font-size:0.95rem">'
    +'<option value="pendente">⏳ Pendente</option>'
    +'<option value="aprovado">✅ Aprovado</option>'
    +'<option value="recusado">❌ Recusado</option>'
    +'</select>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="document.getElementById(\'modalVincOrc\').remove()" style="flex:1;background:#e5e7eb;color:#374151">Cancelar</button>'
    +'<button onclick="confirmarVincularOrcamento('+idx+')" style="flex:1;background:#1a73e8">Vincular</button>'
    +'</div>'
    +'</div>';
  document.body.appendChild(overlay);
}

function confirmarVincularOrcamento(idx) {
  var numOrc = document.getElementById("selVincOrc").value;
  var status = document.getElementById("selVincStatus").value || "pendente";
  if (!numOrc) { alert("Selecione um orçamento!"); return; }
  var orc = orcamentos.find(function(o){ return o.numOrc === numOrc; });
  if (!orc) { alert("Orçamento não encontrado."); return; }
  var valorTotal = parseFloat(orc.valorTotal || 0);
  var custoObra  = parseFloat(orc.custoObra || orc.custoTotal || 0);
  var lucro      = valorTotal - custoObra;
  clientes[idx].orcamentos = clientes[idx].orcamentos || [];
  clientes[idx].orcamentos.push({
    numOrc: numOrc, valorTotal: valorTotal, custoObra: custoObra,
    lucro: lucro, status: status
  });
  salvar("clientes", clientes);
  var m = document.getElementById("modalVincOrc"); if(m) m.remove();
  renderClientes();
}

function removerOrcamentoCliente(idxCliente, numOrc) {
  clientes[idxCliente].orcamentos=clientes[idxCliente].orcamentos.filter(function(o){ return o.numOrc!==numOrc; });
  salvar("clientes",clientes); renderClientes();
}

function removerCliente(idx) {
  if(!confirm("Remover cliente "+clientes[idx].nome+"?")) return;
  clientes.splice(idx,1);
  salvar("clientes",clientes); renderClientes();
}

function telaTabelaMateriais() {
  return '<h2>Materiais</h2>'
  +'<div class="card">'
  +'<label>Descricao</label><input type="text" id="descTabMat" placeholder="Ex: Cabo 2.5mm"/>'
  +'<label>Unidade</label><select id="unidTabMat"><option>m</option><option>un</option><option>vb</option><option>kg</option><option>cx</option><option>rolo</option><option>pc</option></select>'
  +'<label>Preco Unitario (R$)</label><input type="number" id="precoTabMat" placeholder="0.00"/>'
  +'<label>Categoria</label><select id="catTabMat"><option>Cabos e Fios</option><option>Eletrodutos</option><option>Quadros e Paineis</option><option>Disjuntores</option><option>Tomadas e Interruptores</option><option>Iluminacao</option><option>Ferragens</option><option>EPI</option><option>Outros</option></select>'
  +'<button onclick="adicionarTabMat()">+ Adicionar Material</button>'
  +'</div>'
  +'<div class="card" style="margin-bottom:8px"><input type="text" id="buscaTabMat" placeholder="🔍 Buscar material..." oninput="renderTabelaMateriais()" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem"/></div>'
  +'<div id="listaTabelaMateriais"></div>';
}

function adicionarTabMat() {
  var desc =document.getElementById("descTabMat").value;
  var unid =document.getElementById("unidTabMat").value;
  var preco=parseFloat(document.getElementById("precoTabMat").value)||0;
  var cat  =document.getElementById("catTabMat").value;
  if(!desc||preco<=0){alert("Preencha descricao e preco!");return;}
  tabelaMateriais.push({desc:desc,unid:unid,preco:preco,cat:cat});
  salvar("tabelaMateriais",tabelaMateriais); renderTabelaMateriais();
  document.getElementById("descTabMat").value="";
  document.getElementById("precoTabMat").value="";
}

function renderTabelaMateriais() {
  var el=document.getElementById("listaTabelaMateriais");
  if(!el) return;
  var busca=(document.getElementById("buscaTabMat").value||"").toLowerCase();
  var lista=tabelaMateriais.filter(function(m){ return m.desc.toLowerCase().includes(busca); });
  if(!lista.length){el.innerHTML='<p style="color:#888;padding:12px">Nenhum material cadastrado.</p>';return;}
  var categorias={};
  lista.forEach(function(m){
    if(!categorias[m.cat]) categorias[m.cat]=[];
    categorias[m.cat].push({m:m,idx:tabelaMateriais.indexOf(m)});
  });
  var html="";
  Object.keys(categorias).forEach(function(cat){
        html+='<div style="background:white;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:12px"><div style="background:#1a73e8;color:white;border-radius:8px;padding:6px 12px;font-weight:bold;font-size:0.85rem;margin-bottom:10px">📦 '+cat+'</div>';
    categorias[cat].forEach(function(item){
      var m=item.m; var idx=item.idx;
      html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0"><div style="flex:1"><div style="font-weight:bold;font-size:0.9rem">'+m.desc+'</div><div style="font-size:0.78rem;color:#888">'+m.unid+' | R$ '+m.preco.toFixed(2)+'</div></div><div style="display:flex;gap:8px;align-items:center"><input type="number" value="'+m.preco+'" onchange="editarPrecoMat('+idx+',this.value)" style="width:70px;padding:4px;border:1px solid #ddd;border-radius:6px;font-size:0.85rem;text-align:right"/><span onclick="removerTabMat('+idx+')" style="color:red;cursor:pointer;font-size:1rem">🗑️</span></div></div>';
    });
    html+='</div>';
  });
  el.innerHTML = html;
}

function editarPrecoMat(idx, novoPreco) {
  tabelaMateriais[idx].preco=parseFloat(novoPreco)||0;
  salvar("tabelaMateriais",tabelaMateriais);
}

function removerTabMat(idx) {
  if(!confirm("Remover "+tabelaMateriais[idx].desc+"?")) return;
  tabelaMateriais.splice(idx,1);
  salvar("tabelaMateriais",tabelaMateriais); renderTabelaMateriais();
}

function telaRelatorio() {
  var hoje=new Date();
  var mesAtual=hoje.getFullYear()+"-"+(String(hoje.getMonth()+1).padStart(2,"0"));
  return '<h2>Relatorio Mensal</h2>'
  +'<div class="card"><label>Selecionar Mes</label><input type="month" id="mesSelecionado" value="'+mesAtual+'" onchange="renderRelatorio()"/></div>'
  +'<div id="conteudoRelatorio"></div>';
}

function renderRelatorio() {
  var el=document.getElementById("conteudoRelatorio");
  if(!el) return;
  var mes=document.getElementById("mesSelecionado").value;
  if(!mes) return;
  var custosMes=custos.filter(function(c){ return c.data&&c.data.startsWith(mes); });
  var totalCustoMes=custosMes.reduce(function(s,c){ return s+c.valor; },0);
  var obrasLista=window.obras||[];
  var obrasMes=obrasLista.filter(function(o){ return o.data&&o.data.startsWith(mes); });
  var totalFatMes=obrasMes.reduce(function(s,o){ return s+parseFloat(o.valorContrato||0); },0);
  var lucroMes=totalFatMes-totalCustoMes;
  var abertas   =obrasMes.filter(function(o){ return o.status==="andamento"; }).length;
  var concluidas=obrasMes.filter(function(o){ return o.status==="concluida"; }).length;
  var canceladas=obrasMes.filter(function(o){ return o.status==="cancelada"; }).length;
  var mesFormatado=new Date(mes+"-02").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  var html='<div style="background:#1a73e8;color:white;border-radius:12px;padding:12px 16px;margin-bottom:16px;text-align:center"><div style="font-size:0.85rem;opacity:0.85">Periodo</div><div style="font-size:1.1rem;font-weight:bold;text-transform:capitalize">'+mesFormatado+'</div></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
  +'<div style="background:white;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-left:4px solid #1a73e8"><div style="font-size:0.75rem;color:#888">Faturamento</div><div style="font-weight:bold;color:#1a73e8;font-size:1rem">R$ '+totalFatMes.toFixed(2)+'</div></div>'
  +'<div style="background:white;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-left:4px solid #e53935"><div style="font-size:0.75rem;color:#888">Custos</div><div style="font-weight:bold;color:#e53935;font-size:1rem">R$ '+totalCustoMes.toFixed(2)+'</div></div>'
  +'<div style="background:white;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-left:4px solid #43a047"><div style="font-size:0.75rem;color:#888">Lucro Liquido</div><div style="font-weight:bold;color:#43a047;font-size:1rem">R$ '+lucroMes.toFixed(2)+'</div></div>'
  +'<div style="background:white;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-left:4px solid #fb8c00"><div style="font-size:0.75rem;color:#888">Obras no Mes</div><div style="font-weight:bold;color:#fb8c00;font-size:1rem">'+obrasMes.length+' obras</div></div>'
  +'</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">'
  +'<div style="background:#fff8e1;border-radius:10px;padding:10px;text-align:center"><div style="font-size:0.72rem;color:#888">Em Andamento</div><div style="font-weight:bold;color:#fb8c00;font-size:1.1rem">'+abertas+'</div></div>'
  +'<div style="background:#e6f4ea;border-radius:10px;padding:10px;text-align:center"><div style="font-size:0.72rem;color:#888">Concluidas</div><div style="font-weight:bold;color:#43a047;font-size:1.1rem">'+concluidas+'</div></div>'
  +'<div style="background:#fce8e6;border-radius:10px;padding:10px;text-align:center"><div style="font-size:0.72rem;color:#888">Canceladas</div><div style="font-weight:bold;color:#e53935;font-size:1.1rem">'+canceladas+'</div></div>'
  +'</div>';
  var grupos={};
  custosMes.forEach(function(c){ if(!grupos[c.tipo]) grupos[c.tipo]=[]; grupos[c.tipo].push(c); });
  var htmlCustos="";
  if(!custosMes.length){
    htmlCustos='<p style="color:#aaa;font-size:0.85rem">Nenhuma despesa neste mes.</p>';
  } else {
    Object.keys(grupos).forEach(function(tipo){
      var subtotal=grupos[tipo].reduce(function(s,c){ return s+c.valor; },0);
      htmlCustos+='<div style="margin-bottom:8px"><div style="background:#f5f5f5;padding:6px 10px;border-radius:6px;font-size:0.82rem;font-weight:bold;display:flex;justify-content:space-between"><span>'+tipo+'</span><span>R$ '+subtotal.toFixed(2)+'</span></div>';
      grupos[tipo].forEach(function(c){
        htmlCustos+='<div style="padding:4px 10px;font-size:0.8rem;color:#555;display:flex;justify-content:space-between"><span>'+c.desc+' ('+c.obra+')</span><span style="color:#e53935">R$ '+c.valor.toFixed(2)+'</span></div>';
      });
      htmlCustos+='</div>';
    });
  }
  html+='<div style="background:white;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08)"><div style="font-weight:bold;color:#1a73e8;margin-bottom:10px">📋 Despesas do Mes</div>'+htmlCustos+'</div>';
  el.innerHTML = html;
}

function telaDiario() {
  var hoje = new Date().toISOString().split("T")[0];
  var clientesOpts = '<option value="">Selecione o cliente...</option>';
  clientes.forEach(function(c){
    clientesOpts += '<option value="'+c.nome+'">'+c.nome+'</option>';
  });
  return '<h2>📓 Diario de Obra</h2>'
  +'<div class="card" style="background:#fff8e1;border-left:4px solid #fb8c00">'
  +'<p style="font-size:0.85rem;color:#fb8c00;font-weight:bold">📅 Registro do dia: '+new Date().toLocaleDateString("pt-BR")+'</p>'
  +'</div>'
  +'<div class="card">'
  +'<label>Cliente</label>'
  +'<select id="clienteDiario" onchange="preencherOrcsDiario()">'+clientesOpts+'</select>'
  +'<label>Orcamento</label>'
  +'<select id="orcDiario"><option value="">Selecione o cliente primeiro...</option></select>'
  +'<label>Anotacoes do Dia</label>'
  +'<textarea id="textoDiario" placeholder="O que foi feito hoje?" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;min-height:120px;resize:vertical;font-family:inherit"></textarea>'
  +'<label style="margin-top:10px">Fotos do Dia</label>'
  +'<div style="display:flex;gap:10px;margin-bottom:10px">'
  +'<button onclick="document.getElementById(\'fotoCamera\').click()" style="flex:1;background:#1a73e8">📷 Camera</button>'
  +'<button onclick="document.getElementById(\'fotoGaleria\').click()" style="flex:1;background:#43a047">🖼️ Galeria</button>'
  +'</div>'
  +'<input type="file" id="fotoCamera" accept="image/*" capture="environment" multiple style="display:none" onchange="previewFotos(this)"/>'
  +'<input type="file" id="fotoGaleria" accept="image/*" multiple style="display:none" onchange="previewFotos(this)"/>'
  +'<div id="previewFotos" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>'
  +'</div>'
  +'<div style="display:flex;gap:10px">'
  +'<button onclick="salvarDiarioHoje()" style="flex:1;background:#1a73e8">💾 Salvar</button>'
  +'<button onclick="fecharExpediente()" style="flex:1;background:#e53935">✅ Fechar Expediente</button>'
  +'</div>'
  +'<div id="avisoFechamento" style="display:none;background:#e6f4ea;border-radius:10px;padding:12px;margin-top:10px;text-align:center;color:#43a047;font-weight:bold">✅ Expediente fechado! Registro salvo.</div>'
  +'<div id="diarioHojeVer" style="margin-top:16px"></div>';
}

var fotosDiarioBase64 = [];

function previewFotos(input) {
  var files = Array.from(input.files);
  files.forEach(function(file){
    var reader = new FileReader();
    reader.onload = function(e){
      fotosDiarioBase64.push(e.target.result);
      renderPreviewFotos();
    };
    reader.readAsDataURL(file);
  });
}

function renderPreviewFotos() {
  var el = document.getElementById("previewFotos");
  if(!el) return;
  var html="";
  fotosDiarioBase64.forEach(function(src,i){
    html+='<div style="position:relative;display:inline-block">'
      +'<img src="'+src+'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #1a73e8"/>'
      +'<span onclick="removerFotoPreview('+i+')" style="position:absolute;top:-6px;right:-6px;background:red;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;cursor:pointer">✕</span>'
      +'</div>';
  });
  el.innerHTML = html||'<p style="font-size:0.8rem;color:#aaa">Nenhuma foto.</p>';
}

function removerFotoPreview(idx) {
  fotosDiarioBase64.splice(idx,1);
  renderPreviewFotos();
}

function preencherOrcsDiario() {
  var nome = document.getElementById("clienteDiario").value;
  var el   = document.getElementById("orcDiario");
  var c    = clientes.find(function(x){ return x.nome===nome; });
  var lista = (c && c.orcamentos && c.orcamentos.length) ? c.orcamentos : (orcamentos||[]);
  if(!lista.length){
    el.innerHTML='<option value="">Nenhum orçamento salvo</option>'; return;
  }
  var opts='<option value="">Selecione...</option>';
  lista.forEach(function(o){
    var v = o.valorTotal ? ' — R$ '+parseFloat(o.valorTotal).toFixed(2) : '';
    opts+='<option value="'+o.numOrc+'">'+o.numOrc+v+'</option>';
  });
  el.innerHTML=opts;
}

function salvarDiarioHoje() {
  var cliente = document.getElementById("clienteDiario").value;
  var orc     = document.getElementById("orcDiario").value;
  var texto   = document.getElementById("textoDiario").value.trim();
  if(!cliente||!orc){alert("Selecione cliente e orcamento!");return;}
  if(!texto&&!fotosDiarioBase64.length){alert("Adicione anotacao ou foto!");return;}
  var hoje = new Date().toISOString().split("T")[0];
  var reg  = {cliente:cliente,orc:orc,data:hoje,texto:texto,fotos:fotosDiarioBase64.slice(),fechado:false};
  var idx  = diario.findIndex(function(d){ return d.data===hoje&&d.orc===orc; });
  if(idx>=0) diario[idx]=reg; else diario.push(reg);
  salvar("diario",diario);
  alert("Anotacao salva!");
  renderDiarioHoje();
}

function fecharExpediente() {
  var cliente = document.getElementById("clienteDiario").value;
  var orc     = document.getElementById("orcDiario").value;
  var texto   = document.getElementById("textoDiario").value.trim();
  if(!cliente||!orc){alert("Selecione cliente e orcamento!");return;}
  if(!confirm("Fechar expediente de hoje para "+orc+" - "+cliente+"?")) return;
  var hoje = new Date().toISOString().split("T")[0];
  var reg  = {cliente:cliente,orc:orc,data:hoje,texto:texto,fotos:fotosDiarioBase64.slice(),fechado:true};
  var idx  = diario.findIndex(function(d){ return d.data===hoje&&d.orc===orc; });
  if(idx>=0) diario[idx]=reg; else diario.push(reg);
  var idxR = registros.findIndex(function(r){ return r.orc===orc; });
  if(idxR<0){
    registros.push({cliente:cliente,orc:orc,dias:[reg]});
  } else {
    var dIdx=registros[idxR].dias.findIndex(function(d){ return d.data===hoje; });
    if(dIdx>=0) registros[idxR].dias[dIdx]=reg; else registros[idxR].dias.push(reg);
  }
  salvar("diario",diario);
  salvar("registros",registros);
  fotosDiarioBase64=[];
  document.getElementById("avisoFechamento").style.display="block";
  renderDiarioHoje();
}

function renderDiarioHoje() {
  var el = document.getElementById("diarioHojeVer");
  if(!el) return;
  var hoje = new Date().toISOString().split("T")[0];
  var lista = diario.filter(function(d){ return d.data===hoje; });
  if(!lista.length){el.innerHTML='<p style="color:#aaa;font-size:0.85rem;text-align:center">Nenhum registro hoje ainda.</p>';return;}
  var html='<h3 style="color:#1a73e8;margin-bottom:10px">📋 Registros de Hoje</h3>';
  lista.forEach(function(d){
    var cor=d.fechado?"#43a047":"#fb8c00";
    html+='<div style="background:white;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:10px;border-left:4px solid '+cor+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      +'<strong style="color:#1a73e8">'+d.orc+' | '+d.cliente+'</strong>'
      +'<span style="background:'+cor+';color:white;border-radius:10px;padding:2px 10px;font-size:0.75rem">'+(d.fechado?"✅ Fechado":"🔄 Aberto")+'</span>'
      +'</div>'
      +(d.texto?'<p style="font-size:0.85rem;color:#444;margin-bottom:8px">'+d.texto+'</p>':'')
      +(d.fotos&&d.fotos.length?'<div style="display:flex;flex-wrap:wrap;gap:6px">'+d.fotos.map(function(f){return '<img src="'+f+'" style="width:70px;height:70px;object-fit:cover;border-radius:8px"/>';}).join('')+'</div>':'')
      +'</div>';
  });
  el.innerHTML=html;
}

function fecharDiarioMeiaNoite() {
  var hoje = new Date().toISOString().split("T")[0];
  diario.forEach(function(d){
    if(d.data===hoje&&!d.fechado){
      d.fechado=true;
      var idxR=registros.findIndex(function(r){ return r.orc===d.orc; });
      if(idxR<0){ registros.push({cliente:d.cliente,orc:d.orc,dias:[d]}); }
      else {
        var dIdx=registros[idxR].dias.findIndex(function(x){ return x.data===hoje; });
        if(dIdx>=0) registros[idxR].dias[dIdx]=d; else registros[idxR].dias.push(d);
      }
    }
  });
  salvar("diario",diario);
  salvar("registros",registros);
}

setInterval(function(){
  var agora=new Date();
  if(agora.getHours()===0&&agora.getMinutes()===0){ fecharDiarioMeiaNoite(); }
},60000);

function telaRegistros() {
  return '<h2>📁 Registros de Obras</h2>'
  +'<div class="card" style="margin-bottom:8px">'
  +'<input type="text" id="buscaRegistro" placeholder="🔍 Buscar por obra ou cliente..." oninput="renderRegistros()" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem"/>'
  +'</div>'
  +'<div id="listaRegistros"></div>';
}

function renderRegistros() {
  var el=document.getElementById("listaRegistros");
  if(!el) return;
  var busca=(document.getElementById("buscaRegistro")?document.getElementById("buscaRegistro").value:"").toLowerCase();
  var lista=registros.filter(function(r){ return r.orc.toLowerCase().includes(busca)||r.cliente.toLowerCase().includes(busca); });
  if(!lista.length){el.innerHTML='<p style="color:#aaa;padding:12px">Nenhum registro encontrado.</p>';return;}
  var html="";
  lista.forEach(function(r){
    html+='<div style="background:white;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:14px;border-left:4px solid #1a73e8">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      +'<div>'
      +'<div style="font-weight:bold;font-size:1rem;color:#1a73e8">📁 '+r.orc+'</div>'
      +'<div style="font-size:0.82rem;color:#888">👤 '+r.cliente+' | '+r.dias.length+' dia(s)</div>'
      +'</div>'
      +'<span style="background:#e8f0fe;color:#1a73e8;border-radius:10px;padding:4px 10px;font-size:0.78rem;font-weight:bold">'+r.dias.length+' dias</span>'
      +'</div>';
    var diasOrdenados=r.dias.slice().sort(function(a,b){ return b.data.localeCompare(a.data); });
    diasOrdenados.forEach(function(d){
      var dataFmt=d.data.split("-").reverse().join("/");
      var cor=d.fechado?"#43a047":"#fb8c00";
      html+='<div style="border-top:1px solid #f0f0f0;padding:10px 0">'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:6px">'
        +'<span style="background:#e8f0fe;color:#1a73e8;border-radius:8px;padding:3px 10px;font-size:0.8rem;font-weight:bold">📅 '+dataFmt+'</span>'
        +'<span style="background:'+cor+';color:white;border-radius:8px;padding:2px 8px;font-size:0.75rem">'+(d.fechado?"✅ Fechado":"🔄 Aberto")+'</span>'
        +'</div>'
        +(d.texto?'<p style="font-size:0.85rem;color:#444;margin-bottom:8px;line-height:1.5">'+d.texto+'</p>':'<p style="font-size:0.8rem;color:#aaa">Sem anotacoes.</p>')
        +(d.fotos&&d.fotos.length
          ?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">'+d.fotos.map(function(f){ return '<img src="'+f+'" onclick="abrirFotoZoom(\''+f+'\')" style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid #ddd"/>'; }).join('')+'</div>'
          :'')
        +'</div>';
    });
    html+='</div>';
  });
  el.innerHTML=html;
}

function abrirFotoZoom(src) {
  var overlay=document.createElement("div");
  overlay.style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column";
  overlay.innerHTML='<img src="'+src+'" style="max-width:95%;max-height:80vh;border-radius:10px"/>'
    +'<button onclick="this.parentElement.remove()" style="margin-top:16px;background:#e53935;padding:10px 30px;border-radius:20px;color:white;border:none;font-size:1rem;cursor:pointer">✕ Fechar</button>';
  document.body.appendChild(overlay);
}

function abrirAreaMenu(area) {
  document.getElementById("menuPrincipal").style.display = "none";
  document.getElementById("menuGestao").style.display    = "none";
  document.getElementById("menuFinanceiro").style.display= "none";
  if(area === "gestao")     document.getElementById("menuGestao").style.display     = "block";
  if(area === "financeiro") document.getElementById("menuFinanceiro").style.display = "block";
}

function voltarMenuPrincipal() {
  // Voltar para a página inicial
  document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
  document.getElementById('pag-inicio').classList.add('ativa');
  document.getElementById('nav-inicio').classList.add('ativo');
  document.getElementById('conteudo').style.display = 'none';
  document.getElementById('conteudo-interno').innerHTML = '';
  
  if(document.getElementById("aba-dashboard")) {
    document.getElementById("aba-dashboard").style.display = "none";
  }
}

function telaObras() {
  var hoje = new Date().toISOString().split("T")[0];
  var clientesOpts = '<option value="">Selecione o cliente...</option>';
  clientes.forEach(function(c){
    clientesOpts += '<option value="'+c.nome+'">'+c.nome+'</option>';
  });
  return '<h2>🏗️ Obras</h2>'
  +'<div class="card">'
  +'<label>Nome da Obra</label>'
  +'<input type="text" id="nomeObra" placeholder="Ex: Residencia Joao Silva"/>'
  +'<label>Cliente</label>'
  +'<select id="clienteObra" onchange="preencherOrcsObra()">'+clientesOpts+'</select>'
  +'<label>Orcamento Vinculado</label>'
  +'<select id="orcObra"><option value="">Selecione o cliente primeiro...</option></select>'
  +'<label>Valor do Contrato (R$)</label>'
  +'<input type="number" id="valorObra" placeholder="0.00"/>'
  +'<label>Data de Inicio</label>'
  +'<input type="date" id="inicioObra" value="'+hoje+'"/>'
  +'<label>Previsao de Termino</label>'
  +'<input type="date" id="terminoObra"/>'
  +'<label>Status</label>'
  +'<select id="statusObra">'
  +'<option value="aguardando">⏳ Aguardando</option>'
  +'<option value="andamento">🔄 Em Andamento</option>'
  +'<option value="concluida">✅ Concluida</option>'
  +'<option value="cancelada">❌ Cancelada</option>'
  +'</select>'
  +'<button onclick="adicionarObra()">+ Cadastrar Obra</button>'
  +'</div>'
  +'<div class="card" style="margin-bottom:8px">'
  +'<input type="text" id="buscaObra" placeholder="🔍 Buscar obra..." oninput="renderObras()" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem"/>'
  +'</div>'
  +'<div id="listaObras"></div>';
}

function preencherOrcsObra() {
  var nome = document.getElementById("clienteObra").value;
  var el   = document.getElementById("orcObra");
  var c    = clientes.find(function(x){ return x.nome===nome; });
  var lista = (c && c.orcamentos && c.orcamentos.length) ? c.orcamentos : (orcamentos||[]);
  if(!lista.length){
    el.innerHTML='<option value="">Nenhum orçamento salvo</option>'; return;
  }
  var opts='<option value="">Selecione...</option>';
  lista.forEach(function(o){
    var v = o.valorTotal ? ' — R$ '+parseFloat(o.valorTotal).toFixed(2) : '';
    opts+='<option value="'+o.numOrc+'">'+o.numOrc+v+'</option>';
  });
  el.innerHTML=opts;
  // Auto-preenche valor do contrato se ainda estiver vazio
  var inp = document.getElementById("valorObra");
  if (inp && !inp.value) {
    el.onchange = function(){
      var sel = lista.find(function(o){ return o.numOrc === el.value; });
      if (sel && sel.valorTotal && !inp.value) inp.value = parseFloat(sel.valorTotal).toFixed(2);
    };
  }
}

function adicionarObra() {
  var nome    = document.getElementById("nomeObra").value.trim();
  var cliente = document.getElementById("clienteObra").value;
  var orc     = document.getElementById("orcObra").value;
  var valor   = parseFloat(document.getElementById("valorObra").value)||0;
  var inicio  = document.getElementById("inicioObra").value;
  var termino = document.getElementById("terminoObra").value;
  var status  = document.getElementById("statusObra").value;
  if(!nome||!cliente||!orc||valor<=0||!inicio){
    alert("Preencha todos os campos obrigatorios!"); return;
  }
  // Busca o custo orçado (custo total previsto) a partir do orçamento salvo
  var custoOrcado = 0;
  var oOrc = (orcamentos||[]).find(function(o){ return o.numOrc === orc; });
  if (!oOrc) {
    var cli = clientes.find(function(x){ return x.nome === cliente; });
    if (cli && cli.orcamentos) {
      oOrc = cli.orcamentos.find(function(o){ return o.numOrc === orc; });
    }
  }
  if (!oOrc) {
    for (var ci=0; ci<clientes.length && !oOrc; ci++) {
      var orcs = clientes[ci].orcamentos || [];
      oOrc = orcs.find(function(o){ return o.numOrc === orc; });
    }
  }
  if (oOrc) {
    custoOrcado = parseFloat(oOrc.custoTotal || oOrc.custoObra || oOrc.base || 0) || 0;
  }
  obras.push({
    id: Date.now(),
    nome:nome, cliente:cliente, orc:orc,
    valorContrato:valor, inicio:inicio,
    termino:termino, status:status,
    valorFinal:0, totalCustos:0,
    custoOrcado: custoOrcado
  });
  salvar("obras", obras);
  renderObras();
  atualizarDashboard();
  document.getElementById("nomeObra").value="";
  document.getElementById("valorObra").value="";
  document.getElementById("terminoObra").value="";
}

// Custo da obra: usa lançamentos manuais quando existem; caso contrário
// usa o custo orçado vindo do orçamento vinculado (se houver).
function custoTotalDaObra(o) {
  var lanc = custos.filter(function(c){ return c.obra === o.nome; })
                   .reduce(function(s,c){ return s + parseFloat(c.valor||0); }, 0);
  if (lanc > 0) return lanc;
  if (o.custoOrcado && o.custoOrcado > 0) return parseFloat(o.custoOrcado);
  // Fallback: tenta achar pelo número do orçamento (global ou dentro do cliente)
  var oOrc = (orcamentos||[]).find(function(x){ return x.numOrc === o.orc; });
  if (!oOrc) {
    var cli = clientes.find(function(x){ return x.nome === o.cliente; });
    if (cli && cli.orcamentos) {
      oOrc = cli.orcamentos.find(function(x){ return x.numOrc === o.orc; });
    }
  }
  if (!oOrc) {
    for (var ci=0; ci<clientes.length && !oOrc; ci++) {
      var orcs = clientes[ci].orcamentos || [];
      oOrc = orcs.find(function(x){ return x.numOrc === o.orc; });
    }
  }
  if (oOrc) return parseFloat(oOrc.custoTotal || oOrc.custoObra || oOrc.base || 0) || 0;
  return 0;
}

function renderObras() {
  var el = document.getElementById("listaObras");
  if(!el) return;
  var busca=(document.getElementById("buscaObra").value||"").toLowerCase();
  var lista=obras.filter(function(o){ return o.nome.toLowerCase().includes(busca)||o.cliente.toLowerCase().includes(busca); });
  if(!lista.length){el.innerHTML='<p style="color:#888;padding:12px">Nenhuma obra cadastrada.</p>';return;}
  var cores  ={aguardando:"#fb8c00",andamento:"#1a73e8",concluida:"#43a047",cancelada:"#e53935"};
  var labels ={aguardando:"⏳ Aguardando",andamento:"🔄 Em Andamento",concluida:"✅ Concluida",cancelada:"❌ Cancelada"};
  var html="";
  lista.forEach(function(o, idx){
    var cor    = cores[o.status]||"#888";
    var label  = labels[o.status]||o.status;
    var custoObra = custoTotalDaObra(o);
    var lucro  = (o.valorFinal>0?o.valorFinal:o.valorContrato) - custoObra;
    var iniF   = o.inicio?o.inicio.split("-").reverse().join("/"):"—";
    var terF   = o.termino?o.termino.split("-").reverse().join("/"):"—";
    html+='<div style="background:white;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:14px;border-top:4px solid '+cor+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">'
      +'<div>'
      +'<div style="font-weight:bold;font-size:1rem">'+o.nome+'</div>'
      +'<div style="font-size:0.8rem;color:#888">👤 '+o.cliente+' | 📋 '+o.orc+'</div>'
      +'</div>'
      +'<span style="background:'+cor+';color:white;border-radius:12px;padding:3px 10px;font-size:0.75rem;white-space:nowrap">'+label+'</span>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.8rem;color:#666;margin-bottom:10px">'
      +'<div>📅 Inicio: <strong>'+iniF+'</strong></div>'
      +'<div>🏁 Termino: <strong>'+terF+'</strong></div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;margin-bottom:10px">'
      +'<div style="background:#e8f0fe;border-radius:8px;padding:8px">'
      +'<div style="font-size:0.7rem;color:#888">Contrato</div>'
      +'<div style="font-weight:bold;color:#1a73e8;font-size:0.85rem">R$ '+parseFloat(o.valorContrato).toFixed(2)+'</div>'
      +'</div>'
      +'<div style="background:#fce8e6;border-radius:8px;padding:8px">'
      +'<div style="font-size:0.7rem;color:#888">Custos</div>'
      +'<div style="font-weight:bold;color:#e53935;font-size:0.85rem">R$ '+custoObra.toFixed(2)+'</div>'
      +'</div>'
      +'<div style="background:#e6f4ea;border-radius:8px;padding:8px">'
      +'<div style="font-size:0.7rem;color:#888">Lucro</div>'
      +'<div style="font-weight:bold;color:#43a047;font-size:0.85rem">R$ '+lucro.toFixed(2)+'</div>'
      +'</div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
      +'<select onchange="atualizarStatusObra('+idx+',this.value)" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:0.85rem">'
      +'<option value="aguardando"'+(o.status==="aguardando"?" selected":"")+'>⏳ Aguardando</option>'
      +'<option value="andamento"'+(o.status==="andamento"?" selected":"")+'>🔄 Em Andamento</option>'
      +'<option value="concluida"'+(o.status==="concluida"?" selected":"")+'>✅ Concluida</option>'
      +'<option value="cancelada"'+(o.status==="cancelada"?" selected":"")+'>❌ Cancelada</option>'
      +'</select>'
      +'<span onclick="removerObra('+idx+')" style="background:#fce8e6;color:#e53935;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:0.85rem">🗑️</span>'
      +'</div>'
      +(o.status==="concluida"?
        (o.valorFinal && parseFloat(o.valorFinal) > 0
          ? '<div style="margin-top:10px;background:#e6f4ea;border-radius:10px;padding:10px;display:flex;justify-content:space-between;align-items:center;gap:8px">'
            +'<div><div style="font-size:0.7rem;color:#43a047;font-weight:bold">💰 Valor Final Recebido</div>'
            +'<div style="font-size:1rem;font-weight:bold;color:#1F2937">R$ '+parseFloat(o.valorFinal).toFixed(2)+'</div></div>'
            +'<button onclick="editarValorFinal('+idx+')" style="background:white;color:#43a047;border:1px solid #43a047;border-radius:8px;padding:6px 12px;font-size:0.78rem;cursor:pointer">✏️ Editar</button>'
            +'</div>'
          : '<div style="margin-top:10px;background:#e6f4ea;border-radius:10px;padding:10px">'
            +'<label style="font-size:0.8rem;color:#43a047;font-weight:bold">💰 Valor Final Recebido (R$)</label>'
            +'<div style="display:flex;gap:8px;margin-top:6px">'
            +'<input type="number" id="valorFinal_'+idx+'" value="" placeholder="0.00" style="flex:1;padding:8px;border:1px solid #43a047;border-radius:8px;font-size:0.9rem"/>'
            +'<button onclick="salvarValorFinal('+idx+')" style="background:#43a047;padding:8px 14px;font-size:0.85rem">Salvar</button>'
            +'</div></div>')
        :'')
      +'</div>';
  });
  el.innerHTML=html;
}

function atualizarStatusObra(idx, novoStatus) {
  obras[idx].status = novoStatus;
  salvar("obras", obras);
  renderObras();
  atualizarDashboard();
}

function salvarValorFinal(idx) {
  var inp = document.getElementById("valorFinal_"+idx);
  var val = inp ? parseFloat(inp.value)||0 : 0;
  if (val <= 0) { alert("Informe um valor maior que zero."); return; }
  obras[idx].valorFinal = val;
  salvar("obras", obras);
  renderObras();
  try { atualizarDashboard(); } catch(e){}
  var lembrete = document.getElementById("lembrete-agenda");
  if(lembrete && typeof lembreteAgendaDashboard === "function") {
    lembrete.innerHTML = lembreteAgendaDashboard();
  }
  alert("Valor final salvo!");
}

function editarValorFinal(idx) {
  obras[idx].valorFinal = 0;
  salvar("obras", obras);
  renderObras();
  try { atualizarDashboard(); } catch(e){}
}

function removerObra(idx) {
  if(!confirm("Remover a obra "+obras[idx].nome+"?")) return;
  obras.splice(idx,1);
  salvar("obras", obras);
  renderObras();
  atualizarDashboard();
}

var agendaMesAtual = new Date().getMonth();
var agendaAnoAtual = new Date().getFullYear();

function telaAgenda() {
  var hoje = new Date().toISOString().split("T")[0];
  var obrasOpts = '<option value="">Compromisso Geral</option>';
  obras.forEach(function(o){
    obrasOpts += '<option value="'+o.nome+'">🏗️ '+o.nome+'</option>';
  });
  return '<h2>📅 Agenda de Obras</h2>'
  +'<div id="calendarioContainer"></div>'
  +'<div id="eventosDia" style="margin-top:12px"></div>'
  +'<div class="card" style="margin-top:12px">'
  +'<h3 style="color:#1a73e8;margin-bottom:12px">➕ Nova Reuniao / Compromisso</h3>'
  +'<label>Data</label>'
  +'<input type="date" id="dataReuniao" value="'+hoje+'"/>'
  +'<label>Hora</label>'
  +'<input type="time" id="horaReuniao" value="08:00"/>'
  +'<label>Assunto</label>'
  +'<input type="text" id="assuntoReuniao" placeholder="Ex: Visita tecnica, Reuniao cliente..."/>'
  +'<label>Participantes</label>'
  +'<input type="text" id="participantesReuniao" placeholder="Ex: Joao, Maria, Pedro..."/>'
  +'<label>Vincular a Obra (opcional)</label>'
  +'<select id="obraReuniao">'+obrasOpts+'</select>'
  +'<button onclick="adicionarReuniao()">💾 Salvar Compromisso</button>'
  +'</div>';
}

function renderAgenda() {
  var container = document.getElementById("calendarioContainer");
  if(!container) return;
  var meses = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  var primeiroDia = new Date(agendaAnoAtual, agendaMesAtual, 1).getDay();
  var diasNoMes   = new Date(agendaAnoAtual, agendaMesAtual+1, 0).getDate();
  var hoje        = new Date().toISOString().split("T")[0];
  var cores       = {aguardando:"#fb8c00",andamento:"#1a73e8",concluida:"#43a047",cancelada:"#e53935"};
  var diasComEvento = {};

  obras.forEach(function(o){
    if(o.inicio && o.termino){
      var d   = new Date(o.inicio);
      var fim = new Date(o.termino);
      while(d <= fim){
        var key = d.toISOString().split("T")[0];
        diasComEvento[key] = diasComEvento[key]||[];
        diasComEvento[key].push({tipo:"obra", status:o.status, nome:o.nome});
        d.setDate(d.getDate()+1);
      }
    }
  });

  reunioes.forEach(function(r){
    diasComEvento[r.data] = diasComEvento[r.data]||[];
    diasComEvento[r.data].push({tipo:"reuniao"});
  });

  var html = '<div class="card" style="padding:12px">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    +'<button onclick="mudarMesAgenda(-1)" style="background:#e8f0fe;color:#1a73e8;padding:8px 16px;border-radius:20px;border:none;font-size:1rem;cursor:pointer">◀</button>'
    +'<strong style="font-size:1rem;color:#1a73e8">'+meses[agendaMesAtual]+' '+agendaAnoAtual+'</strong>'
    +'<button onclick="mudarMesAgenda(1)" style="background:#e8f0fe;color:#1a73e8;padding:8px 16px;border-radius:20px;border:none;font-size:1rem;cursor:pointer">▶</button>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center;margin-bottom:6px">'
    +'<div style="font-size:0.7rem;color:#e53935;font-weight:bold">Dom</div>'
    +'<div style="font-size:0.7rem;color:#666;font-weight:bold">Seg</div>'
    +'<div style="font-size:0.7rem;color:#666;font-weight:bold">Ter</div>'
    +'<div style="font-size:0.7rem;color:#666;font-weight:bold">Qua</div>'
    +'<div style="font-size:0.7rem;color:#666;font-weight:bold">Qui</div>'
    +'<div style="font-size:0.7rem;color:#666;font-weight:bold">Sex</div>'
    +'<div style="font-size:0.7rem;color:#888;font-weight:bold">Sab</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center">';

  for(var i=0; i<primeiroDia; i++) html += '<div></div>';

  for(var dia=1; dia<=diasNoMes; dia++){
    var dataStr = agendaAnoAtual+"-"
      +String(agendaMesAtual+1).padStart(2,"0")+"-"
      +String(dia).padStart(2,"0");
    var isHoje     = dataStr===hoje;
    var eventos    = diasComEvento[dataStr]||[];
    var temObra    = eventos.find(function(e){ return e.tipo==="obra"; });
    var temReuniao = eventos.find(function(e){ return e.tipo==="reuniao"; });
    var corFundo   = isHoje?"#1a73e8":(temObra?(cores[temObra.status]||"#888")+"33":"transparent");
    var corTexto   = isHoje?"white":"#333";
    var borda      = isHoje?"2px solid #1a73e8":(temObra?"1px solid "+(cores[temObra.status]||"#ddd"):"1px solid #f0f0f0");

    html += '<div onclick="verEventosDia(\''+dataStr+'\')" style="'
      +'background:'+corFundo+';color:'+corTexto+';border:'+borda+';'
      +'border-radius:8px;padding:6px 2px;cursor:pointer;min-height:36px">'
      +'<div style="font-size:0.82rem;font-weight:'+(isHoje?"bold":"normal")+'">'+dia+'</div>'
      +(temReuniao?'<div style="width:6px;height:6px;background:#fb8c00;border-radius:50%;margin:0 auto"></div>':'')
      +'</div>';
  }

  html += '</div></div>';
  container.innerHTML = html;
}

function mudarMesAgenda(dir) {
  agendaMesAtual += dir;
  if(agendaMesAtual>11){ agendaMesAtual=0; agendaAnoAtual++; }
  if(agendaMesAtual<0) { agendaMesAtual=11; agendaAnoAtual--; }
  renderAgenda();
}

function verEventosDia(data) {
  var el = document.getElementById("eventosDia");
  if(!el) return;
  var dataFmt = data.split("-").reverse().join("/");
  var cores   = {aguardando:"#fb8c00",andamento:"#1a73e8",concluida:"#43a047",cancelada:"#e53935"};
  var labels  = {aguardando:"⏳ Aguardando",andamento:"🔄 Em Andamento",concluida:"✅ Concluida",cancelada:"❌ Cancelada"};
  var obrasNoDia    = obras.filter(function(o){ return o.inicio<=data && o.termino>=data; });
  var reunioesNoDia = reunioes.filter(function(r){ return r.data===data; });
  if(!obrasNoDia.length&&!reunioesNoDia.length){
    el.innerHTML='<div class="card" style="text-align:center;color:#aaa">📅 '+dataFmt+' — Nenhum evento.</div>'; return;
  }
  var html='<div class="card"><h3 style="color:#1a73e8;margin-bottom:12px">📅 '+dataFmt+'</h3>';
  obrasNoDia.forEach(function(o){
    var cor  = cores[o.status]||"#888";
    var tipo = o.inicio===data?"🚀 Inicio":(o.termino===data?"🏁 Termino":"🔄 Em Execucao");
    html+='<div style="background:white;border-radius:10px;padding:12px;margin-bottom:8px;border-left:4px solid '+cor+'">'
      +'<div style="display:flex;justify-content:space-between">'
      +'<strong>🏗️ '+o.nome+'</strong>'
      +'<span style="background:'+cor+';color:white;border-radius:10px;padding:2px 8px;font-size:0.72rem">'+labels[o.status]+'</span>'
      +'</div>'
      +'<div style="font-size:0.8rem;color:#888;margin-top:4px">'+tipo+' | 👤 '+o.cliente+'</div>'
      +'</div>';
  });
  reunioesNoDia.forEach(function(r){
    html+='<div style="background:#fff8e1;border-radius:10px;padding:12px;margin-bottom:8px;border-left:4px solid #fb8c00">'
      +'<div style="display:flex;justify-content:space-between">'
      +'<strong>👥 '+r.assunto+'</strong>'
      +'<span style="background:#fb8c00;color:white;border-radius:10px;padding:2px 8px;font-size:0.72rem">⏰ '+r.hora+'</span>'
      +'</div>'
      +(r.participantes?'<div style="font-size:0.8rem;color:#888;margin-top:4px">👤 '+r.participantes+'</div>':'')
      +(r.obra?'<div style="font-size:0.8rem;color:#1a73e8;margin-top:2px">🏗️ '+r.obra+'</div>':'')
      +'<span onclick="removerReuniao(\''+r.id+'\')" style="color:red;font-size:0.78rem;cursor:pointer;margin-top:6px;display:inline-block">🗑️ Remover</span>'
      +'</div>';
  });
  html+='</div>';
  el.innerHTML=html;
}

function adicionarReuniao() {
  var data          = document.getElementById("dataReuniao").value;
  var hora          = document.getElementById("horaReuniao").value;
  var assunto       = document.getElementById("assuntoReuniao").value.trim();
  var participantes = document.getElementById("participantesReuniao").value.trim();
  var obra          = document.getElementById("obraReuniao").value;
  if(!data||!hora||!assunto){alert("Preencha data, hora e assunto!");return;}
  reunioes.push({id:Date.now(),data:data,hora:hora,assunto:assunto,participantes:participantes,obra:obra});
  salvar("reunioes",reunioes);
  renderAgenda();
  verEventosDia(data);
  document.getElementById("assuntoReuniao").value="";
  document.getElementById("participantesReuniao").value="";
  alert("Compromisso salvo!");
}

function removerReuniao(id) {
  id=parseInt(id);
  var r=reunioes.find(function(x){ return x.id===id; });
  if(!confirm("Remover este compromisso?")) return;
  reunioes=reunioes.filter(function(x){ return x.id!==id; });
  salvar("reunioes",reunioes);
  renderAgenda();
  if(r) verEventosDia(r.data);
}

function lembreteAgendaDashboard() {
  var hoje=new Date().toISOString().split("T")[0];
  var reunioesHoje=reunioes.filter(function(r){ return r.data===hoje; });
  var obrasHoje=obras.filter(function(o){ return o.inicio===hoje||o.termino===hoje; });
  if(!reunioesHoje.length&&!obrasHoje.length) return "";
  var html='<div style="background:#fff8e1;border-radius:12px;padding:14px;margin-bottom:14px;border-left:4px solid #fb8c00">'
    +'<div style="font-weight:bold;color:#fb8c00;margin-bottom:8px">📅 Agenda de Hoje</div>';
  obrasHoje.forEach(function(o){
    var tipo=o.inicio===hoje?"🚀 Inicio":"🏁 Termino";
    html+='<div style="font-size:0.85rem;color:#444;margin-bottom:4px">🏗️ '+tipo+': <strong>'+o.nome+'</strong></div>';
  });
  reunioesHoje.forEach(function(r){
    html+='<div style="font-size:0.85rem;color:#444;margin-bottom:4px">👥 '+r.hora+' — <strong>'+r.assunto+'</strong>'+(r.obra?' ('+r.obra+')':"")+'</div>';
  });
  return html+'</div>';
}

// ====== SISTEMA DE PONTO ======

function abrirPonto() {
  var hoje = new Date().toISOString().split('T')[0];
  var chave = "ponto_" + usuarioAtual.usuario + "_" + hoje;
  var registro = JSON.parse(localStorage.getItem(chave) || '{}');

  var ordem  = ["entrada","saidaAlmoco","retornoAlmoco","saida"];
  var labels = ["✅ Registrar Entrada","🍽️ Saída para Almoço","🔙 Retorno do Almoço","🏁 Registrar Saída"];
  var cores  = ["#16a34a","#f59e0b","#2563EB","#dc2626"];
  var nomesLabel = ["Entrada","Saída Almoço","Retorno Almoço","Saída"];

  // Descobrir próximo registro
  var proximo = 0;
  for (var i = 0; i < ordem.length; i++) {
    if (registro[ordem[i]]) proximo = i + 1;
  }

  // Montar registros do dia
  var htmlRegistros = "";
  for (var i = 0; i < ordem.length; i++) {
    if (registro[ordem[i]]) {
      htmlRegistros +=
        '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6">'
        +'<span style="color:#6B7280;font-size:0.9rem">'+nomesLabel[i]+'</span>'
        +'<strong style="color:#1F2937">'+registro[ordem[i]]+'</strong>'
        +'</div>';
    }
  }

  // Calcular horas se saída registrada
  var resumo = "";
  if (registro.entrada && registro.saida) {
    resumo = calcularHorasPonto(registro);
  }

  // Botão inteligente
  var btnBater = proximo < 4
    ? '<button onclick="baterPonto(\''+ordem[proximo]+'\')" style="background:'+cores[proximo]+';color:white;border:none;border-radius:12px;padding:14px;width:100%;font-weight:bold;font-size:1rem;cursor:pointer">'+labels[proximo]+'</button>'
    : '<div style="background:#f3f4f6;color:#6b7280;border-radius:12px;padding:14px;text-align:center;font-weight:bold">✅ Ponto completo do dia!</div>';

  var areaPonto = document.getElementById("area-ponto");
  if (areaPonto) {
    areaPonto.innerHTML =
      '<div style="background:white;border-radius:16px;padding:20px;margin-top:16px;box-shadow:0 2px 10px rgba(0,0,0,0.08)">'
      +'<h3 style="margin:0 0 16px;color:#1F2937;font-size:1.1rem">⏱️ Controle de Ponto - '+hoje.split('-').reverse().join('/')+'</h3>'
      +htmlRegistros
      +(resumo?'<div style="background:#f0f9ff;padding:12px;border-radius:10px;margin:12px 0">'+resumo+'</div>':'')
      +btnBater
      +'</div>';
  }
}

function baterPonto(tipo) {
  var agora = new Date();
  var hora = agora.getHours().toString().padStart(2,'0')+':'+agora.getMinutes().toString().padStart(2,'0');
  var hoje = agora.toISOString().split('T')[0];
  var chave = "ponto_" + usuarioAtual.usuario + "_" + hoje;
  var registro = JSON.parse(localStorage.getItem(chave) || '{}');

  registro[tipo] = hora;
  localStorage.setItem(chave, JSON.stringify(registro));

  // Salva também no Firebase para a Folha de Ponto consultar
  try {
    db.collection("pontos").doc(usuarioAtual.usuario + "_" + hoje).set({
      usuario: usuarioAtual.usuario,
      nome: usuarioAtual.nome,
      data: hoje,
      entrada: registro.entrada || null,
      saidaAlmoco: registro.saidaAlmoco || null,
      retornoAlmoco: registro.retornoAlmoco || null,
      saida: registro.saida || null
    }, { merge: true }).catch(function(e){ console.error("Erro ao salvar ponto:", e); });
  } catch(e) { console.error("Erro ao gravar ponto no Firestore:", e); }

  abrirPonto(); // Atualiza a tela
}

function calcularHorasPonto(registro) {
  try {
    var entrada = registro.entrada.split(':');
    var saida = registro.saida.split(':');
    var totalMinutos = (parseInt(saida[0])*60 + parseInt(saida[1])) - (parseInt(entrada[0])*60 + parseInt(entrada[1]));
    
    if (registro.saidaAlmoco && registro.retornoAlmoco) {
      var almoco = registro.saidaAlmoco.split(':');
      var retorno = registro.retornoAlmoco.split(':');
      totalMinutos -= (parseInt(retorno[0])*60 + parseInt(retorno[1])) - (parseInt(almoco[0])*60 + parseInt(almoco[1]));
    }
    
    var horas = Math.floor(totalMinutos / 60);
    var minutos = totalMinutos % 60;
    return '⏰ Total trabalhado: <strong>' + horas + 'h' + (minutos > 0 ? minutos + 'min' : '') + '</strong>';
  } catch(e) {
    return '';
  }
}

// ====== FIM SISTEMA DE PONTO ======

// ====== FOLHA DE PONTO — RH ======

function abrirFolhaPonto() {
  // Garante que a área de conteúdo apareça
  var conteudo = document.getElementById("conteudo");
  var conteudoInterno = document.getElementById("conteudo-interno");
  if (!conteudo || !conteudoInterno) {
    alert("Area de conteudo nao encontrada. Recarregue a pagina.");
    return;
  }
  document.querySelectorAll(".pagina").forEach(function(p){ p.classList.remove("ativa"); });
  document.querySelectorAll(".nav-item").forEach(function(n){ n.classList.remove("ativo"); });
  conteudo.style.display = "block";
  conteudoInterno.innerHTML = '<div class="card"><p>Carregando folha de ponto...</p></div>';
  window.scrollTo(0,0);

  var mesAtual = new Date().toISOString().substring(0, 7);

  db.collection("pontos")
    .where("data", ">=", mesAtual + "-01")
    .where("data", "<=", mesAtual + "-31")
    .get().then(function(snap) {

      var funcionarios = {};
      snap.forEach(function(doc) {
        var d = doc.data();
        if (!funcionarios[d.usuario]) {
          funcionarios[d.usuario] = { nome: d.nome, registros: [] };
        }
        funcionarios[d.usuario].registros.push(d);
      });

      // Inclui pontos do dispositivo atual (caso ainda não tenham subido pro Firebase)
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("ponto_") === 0) {
            var partes = k.split("_");
            var usu = partes[1];
            var dt  = partes.slice(2).join("_");
            if (dt && dt.indexOf(mesAtual) === 0) {
              var reg = JSON.parse(localStorage.getItem(k) || "{}");
              reg.usuario = usu; reg.data = dt;
              if (!reg.nome) reg.nome = (usuarioAtual && usuarioAtual.usuario===usu) ? usuarioAtual.nome : usu;
              if (!funcionarios[usu]) funcionarios[usu] = { nome: reg.nome, registros: [] };
              var jaTem = funcionarios[usu].registros.some(function(r){ return r.data === dt; });
              if (!jaTem) funcionarios[usu].registros.push(reg);
            }
          }
        }
      } catch(e) { console.error("Erro lendo pontos locais:", e); }

      var html = '<div style="padding:12px 16px 8px">'
        +'<button onclick="voltarMenuPrincipal()" style="background:#F3F4F6;color:#374151;border:none;border-radius:12px;padding:10px 20px;font-size:0.85rem;font-weight:700;cursor:pointer">← Voltar</button>'
        +'</div>'
        +'<div style="padding:0 16px 16px">'
        +'<h2 style="color:#1a73e8;margin:0 0 4px">🗂️ Folha de Ponto</h2>'
        +'<p style="color:#9CA3AF;font-size:0.8rem;margin:0 0 16px">'+formatarMesBR(mesAtual)+'</p>';

      if (Object.keys(funcionarios).length === 0) {
        html += '<div style="text-align:center;padding:40px 16px;color:#9CA3AF">'
          +'<div style="font-size:2.5rem">📭</div>'
          +'<p style="margin-top:8px">Nenhum registro neste mês.</p></div>';
      } else {
        Object.keys(funcionarios).forEach(function(usuario) {
          var f = funcionarios[usuario];
          var totalExtras = 0;
          f.registros.forEach(function(r) {
            if (r.entrada && r.saida) totalExtras += calcularExtraMin(r);
          });
          html += '<div onclick="abrirFolhaFuncionario(\''+usuario+'\')" '
            +'style="background:white;border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.07);cursor:pointer;margin-bottom:10px">'
            +'<div>'
            +'<div style="font-weight:700;color:#1F2937">'+f.nome+'</div>'
            +'<div style="font-size:0.75rem;color:#9CA3AF">'+f.registros.length+' dias registrados</div>'
            +'</div>'
            +(totalExtras > 0
              ? '<span style="background:#fef2f2;color:#dc2626;font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:20px">⚡ '+minParaHora(totalExtras)+' extra</span>'
              : '<span style="background:#f0fdf4;color:#16a34a;font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:20px">✅ Normal</span>'
            )
            +'</div>';
        });
      }

      html += '</div>';
      document.getElementById("conteudo-interno").innerHTML = html;
      window._folhaDados = funcionarios;
      window._folhaMes = mesAtual;
    })
    .catch(function(err){
      console.error("Erro ao carregar folha de ponto:", err);
      document.getElementById("conteudo-interno").innerHTML =
        '<div class="card"><h2>Erro ao carregar folha de ponto</h2>'
        +'<p>'+(err && err.message ? err.message : err)+'</p></div>';
    });
}

function abrirFolhaFuncionario(usuario) {
  var f = window._folhaDados[usuario];
  var mes = window._folhaMes;

  var html = '<div style="padding:12px 16px 8px">'
    +'<button onclick="abrirFolhaPonto()" style="background:#F3F4F6;color:#374151;border:none;border-radius:12px;padding:10px 20px;font-size:0.85rem;font-weight:700;cursor:pointer">← Voltar</button>'
    +'</div>'
    +'<div style="padding:0 16px 16px">'
    +'<h2 style="color:#1a73e8;margin:0 0 4px">'+f.nome+'</h2>'
    +'<p style="color:#9CA3AF;font-size:0.8rem;margin:0 0 16px">'+formatarMesBR(mes)+'</p>'
    +'<button onclick="gerarPDFPonto(\''+usuario+'\')" style="background:#1a73e8;color:white;border:none;border-radius:12px;padding:10px 20px;font-weight:700;cursor:pointer;margin-bottom:16px">📄 Gerar PDF</button>';

  f.registros.sort(function(a,b){ return a.data.localeCompare(b.data); });

  html += '<div style="background:white;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07)">'
    +'<table style="width:100%;border-collapse:collapse">'
    +'<thead><tr style="background:#1a73e8;color:white">'
    +'<th style="padding:12px 8px;text-align:left;font-size:0.8rem">Data</th>'
    +'<th style="padding:12px 8px;text-align:center;font-size:0.8rem">Entrada</th>'
    +'<th style="padding:12px 8px;text-align:center;font-size:0.8rem">S.Almoço</th>'
    +'<th style="padding:12px 8px;text-align:center;font-size:0.8rem">R.Almoço</th>'
    +'<th style="padding:12px 8px;text-align:center;font-size:0.8rem">Saída</th>'
    +'<th style="padding:12px 8px;text-align:center;font-size:0.8rem">Horas</th>'
    +'</tr></thead><tbody>';

  f.registros.forEach(function(r) {
    var extra = (r.entrada && r.saida) ? calcularExtraMin(r) : 0;
    var normal = (r.entrada && r.saida) ? calcularNormalMin(r) : 0;
    var horas = extra > 0 ? '+'+minParaHora(extra) : minParaHora(normal);
    var cor = extra > 0 ? '#dc2626' : '#16a34a';
    
    html += '<tr>'
      +'<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-size:0.85rem">'+formatarDataBR(r.data)+'</td>'
      +'<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:0.85rem">'+(r.entrada||'—')+'</td>'
      +'<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:0.85rem">'+(r.saidaAlmoco||'—')+'</td>'
      +'<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:0.85rem">'+(r.retornoAlmoco||'—')+'</td>'
      +'<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:0.85rem">'+(r.saida||'—')+'</td>'
      +'<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:700;color:'+cor+';font-size:0.85rem">'+horas+'</td>'
      +'</tr>';
  });

  html += '</tbody></table></div></div>';
  document.getElementById("conteudo-interno").innerHTML = html;
  window._folhaMes = mes;
}

function gerarPDFPonto(usuario) {
  var f = window._folhaDados[usuario];
  var mes = window._folhaMes;

  f.registros.sort(function(a,b){ return a.data.localeCompare(b.data); });

  var totalNormal = 0, totalExtra = 0;
  var linhasPDF = f.registros.map(function(r) {
    var extra  = (r.entrada && r.saida) ? calcularExtraMin(r)  : 0;
    var normal = (r.entrada && r.saida) ? calcularNormalMin(r) : 0;
    totalNormal += normal;
    totalExtra  += extra;
    return '<tr>'
      +'<td>'+formatarDataBR(r.data)+'</td>'
      +'<td>'+(r.entrada||'—')+'</td>'
      +'<td>'+(r.saidaAlmoco||'—')+'</td>'
      +'<td>'+(r.retornoAlmoco||'—')+'</td>'
      +'<td>'+(r.saida||'—')+'</td>'
      +'<td style="color:'+(extra>0?'#dc2626':'#16a34a')+';font-weight:bold">'
      +(extra>0?'+'+minParaHora(extra):minParaHora(normal))+'</td>'
      +'</tr>';
  }).join('');

  var conteudoPDF =
    '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    +'<style>'
    +'body{font-family:Arial,sans-serif;padding:32px;color:#1F2937}'
    +'h1{color:#1a73e8;margin-bottom:4px;font-size:1.3rem}'
    +'p.sub{color:#9CA3AF;margin:0 0 20px;font-size:0.85rem}'
    +'.resumo{display:flex;gap:16px;margin-bottom:24px}'
    +'.resumo div{background:#f9fafb;border-radius:8px;padding:10px 18px;text-align:center;border:1px solid #e5e7eb}'
    +'.resumo .label{font-size:10px;color:#9CA3AF;text-transform:uppercase}'
    +'.resumo .valor{font-size:1.2rem;font-weight:800;color:#1F2937}'
    +'table{width:100%;border-collapse:collapse}'
    +'th{background:#1a73e8;color:white;padding:9px 8px;font-size:11px;text-align:center}'
    +'th:first-child{text-align:left}'
    +'td{padding:8px;font-size:11px;text-align:center;border-bottom:1px solid #f3f4f6}'
    +'td:first-child{text-align:left}'
    +'tr:hover{background:#f9fafb}'
    +'.footer{margin-top:28px;color:#9CA3AF;font-size:10px;text-align:center;border-top:1px solid #f3f4f6;padding-top:12px}'
    +'@media print{body{padding:16px}}'
    +'</style></head><body>'
    +'<h1>Folha de Ponto — '+f.nome+'</h1>'
    +'<p class="sub">'+formatarMesBR(mes)+'</p>'
    +'<div class="resumo">'
    +'<div><div class="label">Horas Normais</div><div class="valor">'+minParaHora(totalNormal)+'</div></div>'
    +'<div><div class="label">Horas Extras</div><div class="valor" style="color:'+(totalExtra>0?'#dc2626':'#16a34a')+'">'+(totalExtra>0?'+':'')+minParaHora(totalExtra)+'</div></div>'
    +'<div><div class="label">Dias Trabalhados</div><div class="valor">'+f.registros.length+'</div></div>'
    +'</div>'
    +'<table>'
    +'<thead><tr><th>Data</th><th>Entrada</th><th>S.Almoço</th><th>R.Almoço</th><th>Saída</th><th>Horas</th></tr></thead>'
    +'<tbody>'+linhasPDF+'</tbody>'
    +'</table>'
    +'<div class="footer">Gerado em '+new Date().toLocaleDateString('pt-BR')+' às '+new Date().toLocaleTimeString('pt-BR')+'</div>'
    +'</body></html>';

  var janela = window.open('', '_blank');
  janela.document.write(conteudoPDF);
  janela.document.close();
  setTimeout(function(){ janela.print(); }, 600);
}

function calcularNormalMin(r) {
  var entrada = horaEmMin(r.entrada);
  var saida   = horaEmMin(r.saida);
  var almoco  = (r.saidaAlmoco && r.retornoAlmoco)
    ? horaEmMin(r.retornoAlmoco) - horaEmMin(r.saidaAlmoco) : 60;
  return Math.min((saida - entrada) - almoco, 480);
}

function calcularExtraMin(r) {
  var entrada = horaEmMin(r.entrada);
  var saida   = horaEmMin(r.saida);
  var almoco  = (r.saidaAlmoco && r.retornoAlmoco)
    ? horaEmMin(r.retornoAlmoco) - horaEmMin(r.saidaAlmoco) : 60;
  return Math.max((saida - entrada) - almoco - 480, 0);
}

function horaEmMin(hora) {
  var partes = hora.split(':');
  return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

function minParaHora(minutos) {
  var h = Math.floor(minutos / 60);
  var m = minutos % 60;
  return h + 'h' + (m > 0 ? m + 'min' : '');
}

function formatarDataBR(data) {
  var partes = data.split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function formatarMesBR(mes) {
  var meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  var p = mes.split("-");
  return meses[parseInt(p[1])-1] + " de " + p[0];
}

// ====== FIM FOLHA DE PONTO ======

window.onload = function() {
  firebase.auth().signInAnonymously()
    .then(function() {
      criarUsuarioMasterSeNaoExistir();
      document.getElementById("telaLogin").style.display = "flex";
      var barraUsuario = document.getElementById("barraUsuario");
      if (barraUsuario) barraUsuario.style.display = "none";
    })
    .catch(function(e) {
      console.error("Erro ao conectar Firebase:", e);
    });
};

if("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}