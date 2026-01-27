(function () {
  "use strict";

  var PROFILE_NAME = "DCO_GDF_UNIFORME_ESCOLAR_Feed_Principal";
  var PROFILE_ID = 0;
  var CREATIVE_SIZE = { width: 300, height: 250 };

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
    subtexts1: {
      S01: "Feito na medida certa para 442 mil estudantes das escolas publicas.",
      S02: "Estudantes da rede publica do DF ja podem adquirir seus uniformes.",
      S03: "Jovens e criancas do DF garantem ate 7 pecas para o ano letivo."
    },
    subtexts2: {
      C01: "Desbloqueie o seu cartao no aplicativo BRB Social e confira as malharias credenciadas.",
      C02: "Confira as malharias credenciadas no site da Secretaria de Educacao.",
      C03: "Em caso de duvidas, procure a Regional de Ensino do seu filho."
    }
  };

  var devDynamicContent = {};
  devDynamicContent[PROFILE_NAME] = [
    {
      _id: 0,
      Formato: [{ Width: CREATIVE_SIZE.width, Height: CREATIVE_SIZE.height }],
      Personagem_Asset: { Type: "file", Url: "menina01_300x250.png" },
      Headline: "Cartao Uniforme Escolar.",
      Subtext_Frame1: "Feito na medida certa para 442 mil estudantes das escolas publicas.",
      Subtext_Frame2: "Desbloqueie o seu cartao no aplicativo BRB Social e confira as malharias credenciadas.",
      ExitURL: {
        Url: "https://agenciabrasilia.df.gov.br/w/cartao-uniforme-escolar-permite-a-aquisicao-de-itens-para-estudantes-da-rede-publica-em-malharias-credenciadas?redirect=%2Fnoticias&utm_source=dv360&utm_medium=display&utm_campaign=uniforme_escolar&utm_content=default_300x250"
      }
    }
  ];

  var FONT_CONFIG = {
    headline: { min: 13, max: 16 },
    subtext: { min: 14, max: 16 }
  };

  var cache = {};
  var timeouts = [];
  var animationStarted = false;
  var currentContent = null;

  function calculateFontSize(text, config) {
    if (!text) return config.max;
    var len = text.length;
    if (len < 30) return config.max;
    if (len > 80) return config.min;
    var range = config.max - config.min;
    var ratio = (len - 30) / 50;
    return Math.round(config.max - (range * ratio));
  }

  function applyDynamicFontSize(element, text, config) {
    if (!element || !text) return;
    var fontSize = calculateFontSize(text, config);
    element.style.fontSize = fontSize + 'px';

    var parent = element.parentElement;
    if (parent && element.scrollHeight > parent.clientHeight) {
      while (element.scrollHeight > parent.clientHeight && fontSize > config.min) {
        fontSize--;
        element.style.fontSize = fontSize + 'px';
      }
    }
  }

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
    var subtext1 = getUrlParam('subtext1');
    var subtext2 = getUrlParam('subtext2');

    return {
      headline: headline && contentLibrary.headlines[headline] ? contentLibrary.headlines[headline] : null,
      subtext1: subtext1 && contentLibrary.subtexts1[subtext1] ? contentLibrary.subtexts1[subtext1] : null,
      subtext2: subtext2 && contentLibrary.subtexts2[subtext2] ? contentLibrary.subtexts2[subtext2] : null
    };
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
    // Obtem conteudo da URL (para preview) ou usa DCO
    var urlContent = getContentFromUrl();

    currentContent = {
      Headline: urlContent.headline || content.Headline,
      Subtext_Frame1: urlContent.subtext1 || content.Subtext_Frame1,
      Subtext_Frame2: urlContent.subtext2 || content.Subtext_Frame2,
      ExitURL: content.ExitURL
    };

    if (cache.personagem) {
      var personagemUrl;
      var urlPersonagem = getPersonagemFromUrl();
      if (getUrlParam('personagem')) {
        personagemUrl = urlPersonagem + '_' + CREATIVE_SIZE.width + 'x' + CREATIVE_SIZE.height + '.png';
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

    timeouts.push(setTimeout(function () {
      if (cache.subtext && currentContent) {
        cache.subtext.textContent = currentContent.Subtext_Frame1 || "";
        applyDynamicFontSize(cache.subtext, currentContent.Subtext_Frame1, FONT_CONFIG.subtext);
      }
      showElement(cache.headline);
      showElement(cache.subtext);
    }, 0));

    timeouts.push(setTimeout(function () {
      if (cache.subtext) cache.subtext.classList.add("fade-only");
      hideElement(cache.subtext);
    }, 5000));

    timeouts.push(setTimeout(function () {
      if (cache.subtext && currentContent) {
        cache.subtext.textContent = currentContent.Subtext_Frame2 || "";
        applyDynamicFontSize(cache.subtext, currentContent.Subtext_Frame2, FONT_CONFIG.subtext);
      }
      showElement(cache.subtext);
    }, 5600));

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
