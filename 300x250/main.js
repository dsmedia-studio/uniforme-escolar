(function () {
  "use strict";

  var PROFILE_NAME = "DCO_GDF_UNIFORME_ESCOLAR_Feed_Principal";
  var PROFILE_ID = 0;
  var CREATIVE_SIZE = { width: 300, height: 250 };

  // Configuracao de fonte dinamica
  var FONT_CONFIG = {
    headline: { min: 11, max: 16, shortThreshold: 30, longThreshold: 70 },
    subtext: { min: 9, max: 13, shortThreshold: 40, longThreshold: 90 }
  };

  var StudioEvent = (window.studio && window.studio.events && window.studio.events.StudioEvent) || null;
  var eventFallback = {
    INIT: "init",
    PAGE_LOADED: "page_loaded",
    VISIBLE: "visible"
  };

  // Biblioteca de conteudos para preview
  var contentLibrary = {
    headlines: {
      H01: "Cartao Uniforme Escolar.",
      H02: "Cartao Uniforme Escolar garante acesso ao tamanho certo dos uniformes.",
      H03: "Creditos do Cartao Uniforme Escolar ja estao disponiveis.",
      H04: "442 mil alunos podem usar Cartao Uniforme Escolar este ano.",
      H05: "Cartao Uniforme Escolar: ate 7 pecas para o ano letivo.",
      H06: "Cartao Uniforme Escolar: kits ja podem ser comprados.",
      H07: "Kits de uniformes podem ser comprados com Cartao Uniforme Escolar.",
      H08: "Cartao Uniforme Escolar tem creditos disponiveis.",
      H09: "Mais de 442 mil alunos sao beneficiados pelo Cartao Uniforme Escolar.",
      H10: "DF tem mais de 90 malharias credenciadas para uniformes."
    },
    ctas: {
      C01: "Desbloqueie o seu cartao no aplicativo BRB Social.",
      C02: "Confira as malharias credenciadas.",
      C03: "Em caso de duvidas, procure a Regional de Ensino do seu filho."
    }
  };

  // Texto fixo do Frame 1
  var FIXED_SUBTEXT = "Feito na medida certa para 442 mil estudantes das escolas publicas.";

  var devDynamicContent = {};
  devDynamicContent[PROFILE_NAME] = [
    {
      _id: 0,
      Formato: [{ Width: CREATIVE_SIZE.width, Height: CREATIVE_SIZE.height }],
      Personagem_Asset: { Type: "file", Url: "../assets/images/personagens/300x250/menina01_300x250.png" },
      Headline: "Cartao Uniforme Escolar.",
      CTA: "Desbloqueie o seu cartao no aplicativo BRB Social.",
      ExitURL: {
        Url: "https://agenciabrasilia.df.gov.br/w/cartao-uniforme-escolar-permite-a-aquisicao-de-itens-para-estudantes-da-rede-publica-em-malharias-credenciadas?redirect=%2Fnoticias&utm_source=dv360&utm_medium=display&utm_campaign=uniforme_escolar&utm_content=default_300x250"
      }
    }
  ];

  var cache = {};
  var timeouts = [];
  var animationStarted = false;
  var currentContent = null;

  function getUrlParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function getPersonagemFromUrl() {
    var personagem = getUrlParam('personagem');
    if (personagem && ['menina01', 'menino01', 'menino02'].indexOf(personagem) !== -1) {
      return personagem;
    }
    return 'menina01';
  }

  function getContentFromUrl() {
    var headline = getUrlParam('headline');
    var cta = getUrlParam('cta');

    return {
      headline: headline && contentLibrary.headlines[headline] ? contentLibrary.headlines[headline] : null,
      cta: cta && contentLibrary.ctas[cta] ? contentLibrary.ctas[cta] : null
    };
  }

  // Calcula tamanho de fonte dinamico baseado no tamanho do texto
  function calculateFontSize(text, config) {
    var len = text ? text.length : 0;
    if (len <= config.shortThreshold) {
      return config.max;
    } else if (len >= config.longThreshold) {
      return config.min;
    } else {
      var range = config.longThreshold - config.shortThreshold;
      var fontRange = config.max - config.min;
      var ratio = (len - config.shortThreshold) / range;
      return Math.round(config.max - (ratio * fontRange));
    }
  }

  function applyDynamicFontSize(element, text, config) {
    if (!element || !text) return;
    var fontSize = calculateFontSize(text, config);
    element.style.fontSize = fontSize + 'px';
  }

  function resolveAssetUrl(asset) {
    if (!asset) return "";
    var url = "";
    if (typeof asset === "string") url = asset;
    else if (asset.Url) url = asset.Url;
    else if (asset.url) url = asset.url;
    if (!url) return "";
    if (typeof Enabler === "object" && typeof Enabler.getUrl === "function") {
      return Enabler.getUrl(url);
    }
    return url;
  }

  function getEventId(key) {
    if (StudioEvent && StudioEvent[key]) return StudioEvent[key];
    return eventFallback[key];
  }

  function addEnablerListener(key, handler) {
    if (typeof Enabler !== "object" || typeof Enabler.addEventListener !== "function") return;
    var eventId = getEventId(key);
    if (eventId) Enabler.addEventListener(eventId, handler);
  }

  function cacheDom() {
    cache.personagem = document.getElementById("personagem");
    cache.headline = document.getElementById("headline");
    cache.subtext = document.getElementById("subtext");
    cache.mainContent = document.getElementById("mainContent");
    cache.frameFinal = document.getElementById("frameFinal");
    cache.clickArea = document.getElementById("clickArea");
  }

  function ensureDevContent() {
    if (typeof Enabler === "object") {
      if (typeof Enabler.setProfileId === "function") Enabler.setProfileId(PROFILE_ID);
      if (!window.dynamicContent || !window.dynamicContent[PROFILE_NAME]) {
        Enabler.setDevDynamicContent(devDynamicContent);
      }
    } else if (!window.dynamicContent || !window.dynamicContent[PROFILE_NAME]) {
      window.dynamicContent = devDynamicContent;
    }
  }

  function matchesFormato(entry) {
    if (!entry) return false;
    var formatos = entry.Formato;
    if (!formatos) return true;
    if (!Array.isArray(formatos)) formatos = [formatos];
    for (var i = 0; i < formatos.length; i++) {
      var item = formatos[i];
      if (!item) continue;
      if (typeof item === "string") {
        var normalized = item.replace(/\s+/g, "").toLowerCase();
        var expected = (CREATIVE_SIZE.width + "x" + CREATIVE_SIZE.height).toLowerCase();
        if (normalized === expected) return true;
        continue;
      }
      var width = parseInt(item.Width, 10);
      var height = parseInt(item.Height, 10);
      if (!isNaN(width) && !isNaN(height) && width === CREATIVE_SIZE.width && height === CREATIVE_SIZE.height) {
        return true;
      }
    }
    return false;
  }

  function getActiveContent() {
    var source = (window.dynamicContent && window.dynamicContent[PROFILE_NAME]) || devDynamicContent[PROFILE_NAME];
    if (!source || !source.length) return devDynamicContent[PROFILE_NAME][0];
    for (var i = 0; i < source.length; i++) {
      if (matchesFormato(source[i])) return source[i];
    }
    return source[0];
  }

  function applyContent(content) {
    var urlContent = getContentFromUrl();

    currentContent = {
      Headline: urlContent.headline || content.Headline,
      Subtext: FIXED_SUBTEXT,
      CTA: urlContent.cta || content.CTA,
      ExitURL: content.ExitURL
    };

    if (cache.personagem) {
      var personagemUrl;
      var urlPersonagem = getPersonagemFromUrl();
      if (getUrlParam('personagem')) {
        personagemUrl = '../assets/images/personagens/' + CREATIVE_SIZE.width + 'x' + CREATIVE_SIZE.height + '/' + urlPersonagem + '_' + CREATIVE_SIZE.width + 'x' + CREATIVE_SIZE.height + '.png';
      } else {
        personagemUrl = resolveAssetUrl(content.Personagem_Asset);
      }
      if (personagemUrl) cache.personagem.src = personagemUrl;
    }

    if (cache.headline) {
      cache.headline.textContent = currentContent.Headline || "";
      applyDynamicFontSize(cache.headline, currentContent.Headline, FONT_CONFIG.headline);
    }

    if (cache.clickArea && currentContent.ExitURL && currentContent.ExitURL.Url) {
      cache.clickArea.onclick = function () {
        if (typeof Enabler === "object" && typeof Enabler.exitOverride === "function") {
          Enabler.exitOverride("BackgroundExit", currentContent.ExitURL.Url);
        } else {
          window.open(currentContent.ExitURL.Url, "_blank");
        }
      };
    }
  }

  function showElement(el) {
    if (el) el.classList.add("visible");
  }

  function hideElement(el) {
    if (el) el.classList.remove("visible");
  }

  function clearTimeline() {
    while (timeouts.length) clearTimeout(timeouts.pop());
  }

  function startAnimation() {
    if (animationStarted) return;
    animationStarted = true;
    clearTimeline();

    hideElement(cache.headline);
    hideElement(cache.subtext);
    hideElement(cache.frameFinal);

    // Fase 1: Headline (amarelo) + Subtext fixo (branco)
    timeouts.push(setTimeout(function () {
      if (cache.subtext && currentContent) {
        cache.subtext.textContent = currentContent.Subtext || "";
        applyDynamicFontSize(cache.subtext, currentContent.Subtext, FONT_CONFIG.subtext);
      }
      showElement(cache.headline);
      showElement(cache.subtext);
    }, 0));

    // Transicao: Esconde headline E subtext
    timeouts.push(setTimeout(function () {
      if (cache.subtext) cache.subtext.classList.add("fade-only");
      if (cache.headline) cache.headline.classList.add("fade-only");
      hideElement(cache.headline);
      hideElement(cache.subtext);
    }, 5000));

    // Fase 2: Apenas CTA (branco, centralizado) - sem headline
    timeouts.push(setTimeout(function () {
      if (cache.subtext && currentContent) {
        cache.subtext.textContent = currentContent.CTA || "";
        applyDynamicFontSize(cache.subtext, currentContent.CTA, FONT_CONFIG.subtext);
        cache.subtext.classList.add("cta-phase");
      }
      showElement(cache.subtext);
    }, 5600));

    // Fase 3: Frame final
    timeouts.push(setTimeout(function () {
      showElement(cache.frameFinal);
    }, 10600));
  }

  function runAd() {
    ensureDevContent();
    applyContent(getActiveContent());
    startAnimation();
  }

  function init() {
    cacheDom();
    if (typeof Enabler === "object" && typeof Enabler.isInitialized === "function" && !Enabler.isInitialized()) {
      addEnablerListener("INIT", runAd);
    } else {
      runAd();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
