// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const themeIcon = themeToggle.querySelector('i');

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    body.classList.add('light-mode');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'light');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'dark');
    }
});

// Language switcher
const langSwitcher = document.getElementById('langSwitcher');
const langToggle = document.getElementById('langToggle');
const langMenu = document.getElementById('langMenu');
const supportedLangs = ['en', 'ta', 'hi', 'ru', 'de', 'ja'];

function getSavedLanguage() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('lang');
    if (supportedLangs.includes(fromUrl)) return fromUrl;
    const saved = localStorage.getItem('portfolioLang');
    return supportedLangs.includes(saved) ? saved : 'en';
}

function syncLanguageInUrl(lang) {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', lang);
        // file:// needs the full href — pathname-only replaceState can break the URL.
        const next = window.location.protocol === 'file:'
            ? url.href
            : url.pathname + url.search + url.hash;
        window.history.replaceState({}, '', next);
    } catch {
        // Ignore history sync failures in restricted contexts.
    }
}

function applyLanguage(lang) {
    const dict = translations[lang] || translations.en;
    document.documentElement.lang = lang;
    localStorage.setItem('portfolioLang', lang);
    syncLanguageInUrl(lang);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] != null) {
            el.textContent = dict[key];
        }
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
        const key = el.getAttribute('data-i18n-html');
        if (dict[key] != null) {
            el.innerHTML = dict[key];
        }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const key = el.getAttribute('data-i18n-aria');
        if (dict[key] != null) {
            el.setAttribute('aria-label', dict[key]);
        }
    });

    document.querySelectorAll('.lang-option').forEach((option) => {
        option.classList.toggle('active', option.dataset.lang === lang);
        option.setAttribute('aria-selected', option.dataset.lang === lang ? 'true' : 'false');
    });
}

function closeLangMenu() {
    langSwitcher.classList.remove('open');
    langToggle.setAttribute('aria-expanded', 'false');
    langMenu.hidden = true;
}

function openLangMenu() {
    langSwitcher.classList.add('open');
    langToggle.setAttribute('aria-expanded', 'true');
    langMenu.hidden = false;
}

langToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (langSwitcher.classList.contains('open')) {
        closeLangMenu();
    } else {
        openLangMenu();
    }
});

langMenu.addEventListener('click', (e) => {
    const option = e.target.closest('.lang-option');
    if (!option) return;
    const lang = option.dataset.lang;
    applyLanguage(lang);
    closeLangMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.addEventListener('click', (e) => {
    if (!langSwitcher.contains(e.target)) {
        closeLangMenu();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLangMenu();
});

applyLanguage(getSavedLanguage());

// Native share (mobile share sheet) with clipboard fallback
// Optional: set this to your live site URL so Share works while testing from a local file.
const SHARE_PUBLIC_URL = '';

const shareToggle = document.getElementById('shareToggle');
const shareToast = document.getElementById('shareToast');
let shareToastTimer;

function getShareDict() {
    const lang = getSavedLanguage();
    return translations[lang] || translations.en;
}

function showShareToast(message) {
    if (!shareToast) return;
    shareToast.textContent = message;
    shareToast.classList.add('show');
    clearTimeout(shareToastTimer);
    shareToastTimer = setTimeout(() => {
        shareToast.classList.remove('show');
    }, 2200);
}

function isHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function getSharePageUrl() {
    // Prefer an explicit public URL when testing from disk.
    if (SHARE_PUBLIC_URL && isHttpUrl(SHARE_PUBLIC_URL)) {
        const publicUrl = new URL(SHARE_PUBLIC_URL);
        const lang = getSavedLanguage();
        publicUrl.searchParams.set('lang', lang);
        return publicUrl.toString();
    }

    // Never pass file:// into navigator.share — Chromium/Brave can crash
    // with RESULT_CODE_KILLED_BAD_MESSAGE.
    if (window.location.protocol === 'file:') return '';

    const href = window.location.href.split('#')[0];
    return isHttpUrl(href) ? href : '';
}

function canUseNativeShare(shareData) {
    // Local files must never use Web Share API.
    if (window.location.protocol === 'file:') return false;
    if (!navigator.share) return false;
    if (!isHttpUrl(shareData.url || window.location.href)) return false;

    if (typeof navigator.canShare === 'function') {
        try {
            return navigator.canShare(shareData);
        } catch {
            return false;
        }
    }
    return true;
}

async function copyShareLink(value) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
    }
    const input = document.createElement('input');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    if (!ok) throw new Error('copy failed');
}

function openWhatsAppShare(text, url) {
    const message = url ? `${text}\n${url}` : text;
    window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer'
    );
}

async function fallbackShare(dict, url) {
    const copyTarget = url || `${dict.shareTitle}\n${dict.shareText}`;
    try {
        await copyShareLink(copyTarget);
        showShareToast(dict.shareCopied);
    } catch {
        // file:// is not a secure context — clipboard often fails; WhatsApp is the next option.
        openWhatsAppShare(dict.shareText, url);
        showShareToast(dict.shareCopied);
    }
}

async function shareProfile() {
    const dict = getShareDict();
    const url = getSharePageUrl();

    // Build payload carefully: omit url unless it is a real http(s) link.
    const shareData = { title: dict.shareTitle, text: dict.shareText };
    if (url) shareData.url = url;

    try {
        if (canUseNativeShare(shareData)) {
            await navigator.share(shareData);
            return;
        }
        await fallbackShare(dict, url);
    } catch (err) {
        if (err && err.name === 'AbortError') return;
        try {
            await fallbackShare(dict, url);
        } catch {
            showShareToast(dict.shareFailed);
        }
    }
}

if (shareToggle) {
    shareToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        shareProfile();
    });
}

// Mobile Menu Toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    
    // Animate hamburger
    const spans = hamburger.querySelectorAll('span');
    if (mobileMenu.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translateY(8px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
    } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }
});

// Close mobile menu when clicking on a link
const mobileLinks = document.querySelectorAll('.mobile-link');
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements on page load
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll(
        '.project-card, .skill-group, .timeline-item, .education-card, .award-item'
    );
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Navbar scroll effect
let lastScroll = 0;
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > lastScroll && currentScroll > 100) {
        nav.style.transform = 'translateY(-100%)';
    } else {
        nav.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
});

// Scrollspy - highlight the active nav link based on scroll position
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.pageYOffset >= sectionTop) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active-link');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active-link');
        }
    });
});
