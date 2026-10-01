/* ════════════════════════════════════════════════════════════════
   PSICOTERAPIA · Landing page
   JS vanilla. Depende solo de Lenis (scroll suave, opcional: si no
   carga, el sitio funciona igual con scroll nativo).

   Número de WhatsApp: cambiar CONFIG.whatsapp aquí y buscar
   "525531699579" en index.html (enlaces que funcionan sin JS).
════════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    const CONFIG = {
        whatsapp: '525531699579',
        greeting: 'Hola, me gustaría agendar una cita.'
    };

    const root = document.documentElement;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    let lenis = null;

    /* ───────────── 1. LOADER ─────────────
       Progreso real (carga de la página + tipografías) con una duración
       mínima para que la animación de entrada se aprecie. */
    function initLoader() {
        return new Promise((resolve) => {
            const loader = $('#loader');
            if (!loader) { root.classList.remove('is-loading'); root.classList.add('is-ready'); resolve(); return; }

            const arc = $('#ld-arc');
            const pctEl = $('#ld-pct');
            const MIN_TIME = reduceMotion.matches ? 350 : 2100;
            const MAX_TIME = 6500;
            const t0 = performance.now();

            let pageLoaded = document.readyState === 'complete';
            let fontsReady = false;
            let shown = 0;

            if (!pageLoaded) window.addEventListener('load', () => { pageLoaded = true; }, { once: true });
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => { fontsReady = true; }).catch(() => { fontsReady = true; });
            } else {
                fontsReady = true;
            }

            const finish = () => {
                pctEl.textContent = '100';
                arc.style.strokeDashoffset = 0;
                setTimeout(() => {
                    loader.classList.add('is-out');
                    root.classList.remove('is-loading');
                    setTimeout(() => {
                        root.classList.add('is-ready');
                        resolve();
                    }, 450);
                    setTimeout(() => loader.remove(), 1500);
                }, 320);
            };

            const tick = (now) => {
                const elapsed = now - t0;
                const ready = pageLoaded && fontsReady;
                const timeP = 1 - Math.pow(1 - clamp(elapsed / MIN_TIME, 0, 1), 2.2);
                const target = ready ? timeP : Math.min(timeP, 0.9);
                shown = Math.max(shown, target);

                const pct = Math.floor(shown * 100);
                pctEl.textContent = pct;
                arc.style.strokeDashoffset = 100 - shown * 100;

                if ((ready && elapsed >= MIN_TIME) || elapsed > MAX_TIME) { finish(); return; }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    /* ───────────── 2. SCROLL: Lenis + efectos ligados al scroll ─────────────
       Un único manejador actualiza: barra de progreso, estado del nav,
       parallax del hero, texto del manifiesto y línea de tiempo.
       Primero se leen medidas y luego se escribe, para evitar reflows. */
    const scrollState = { hp: -1, bar: -1, manifesto: -1, line: -1 };
    let onScrollFrame = () => {};

    function initScroll() {
        const nav = $('#nav');
        const bar = $('#progress-bar');
        const hero = $('#inicio');
        const manifesto = $('#manifesto');
        const timeline = $('#timeline');
        const steps = $$('[data-step]');

        onScrollFrame = () => {
            const y = window.scrollY;
            const vh = window.innerHeight;

            // Lecturas
            const docH = root.scrollHeight - vh;
            const heroH = hero ? hero.offsetHeight : 1;
            const mRect = manifesto && manifesto.classList.contains('is-split') ? manifesto.getBoundingClientRect() : null;
            const tRect = timeline ? timeline.getBoundingClientRect() : null;

            // Escrituras
            nav.classList.toggle('is-scrolled', y > 24);

            const bp = docH > 0 ? clamp(y / docH, 0, 1) : 0;
            if (Math.abs(bp - scrollState.bar) > 0.0005) {
                bar.style.transform = 'scaleX(' + bp.toFixed(4) + ')';
                scrollState.bar = bp;
            }

            if (hero && !reduceMotion.matches) {
                const hp = clamp(y / (heroH * 0.85), 0, 1);
                if (Math.abs(hp - scrollState.hp) > 0.002) {
                    hero.style.setProperty('--hp', hp.toFixed(3));
                    scrollState.hp = hp;
                }
            }

            if (mRect) {
                const p = clamp((vh * 0.9 - mRect.top) / (vh * 0.45 + mRect.height), 0, 1);
                if (Math.abs(p - scrollState.manifesto) > 0.001) {
                    manifesto.style.setProperty('--p', p.toFixed(4));
                    scrollState.manifesto = p;
                }
            }

            if (tRect && tRect.top < vh && tRect.bottom > 0) {
                const lineY = vh * 0.62 - tRect.top;
                const p = clamp((lineY - 26) / Math.max(tRect.height - 52, 1), 0, 1);
                if (Math.abs(p - scrollState.line) > 0.001) {
                    timeline.style.setProperty('--line', p.toFixed(4));
                    scrollState.line = p;
                }
                steps.forEach((step) => {
                    step.classList.toggle('is-lit', tRect.top + step.offsetTop + 26 < vh * 0.62);
                });
            }
        };

        if (!reduceMotion.matches && window.Lenis) {
            lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.2, smoothWheel: true });
            lenis.on('scroll', onScrollFrame);
            lenis.stop();
            const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        } else {
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(() => { onScrollFrame(); ticking = false; });
            }, { passive: true });
        }
        window.addEventListener('resize', () => { scrollState.manifesto = -1; scrollState.line = -1; onScrollFrame(); });
        onScrollFrame();
    }

    function scrollToEl(target) {
        if (lenis) {
            lenis.scrollTo(target, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
        } else {
            target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
        }
    }

    function initAnchors() {
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const hash = a.getAttribute('href');
            if (hash.length < 2) return;
            const target = document.getElementById(hash.slice(1));
            if (!target) return;
            e.preventDefault();
            if (a.closest('#menu')) closeMenu();
            scrollToEl(target);
            history.pushState(null, '', hash);
        });
    }

    /* ───────────── 3. NAVEGACIÓN ───────────── */
    const burger = $('#burger');
    const menu = $('#menu');

    function openMenu() {
        menu.classList.add('is-open');
        menu.inert = false;
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Cerrar menú');
        root.classList.add('menu-open');
        if (lenis) lenis.stop(); else root.style.overflow = 'hidden';
    }
    function closeMenu() {
        if (!menu.classList.contains('is-open')) return;
        menu.classList.remove('is-open');
        menu.inert = true;
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        root.classList.remove('menu-open');
        if (lenis) lenis.start(); else root.style.overflow = '';
    }

    function initNav() {
        menu.inert = true;
        burger.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
        window.matchMedia('(min-width: 64rem)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });

        // Enlace activo según la sección visible
        const links = $$('.nav-links a');
        const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
        if (!('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                const link = map.get(en.target.id);
                if (link) link.classList.toggle('is-active', en.isIntersecting);
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }

    /* ───────────── 4. REVELADO AL HACER SCROLL ───────────── */
    function initReveal() {
        const els = $$('[data-reveal]');
        $$('[data-stagger]').forEach((group) => {
            $$(':scope > [data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's'));
        });

        if (!('IntersectionObserver' in window) || reduceMotion.matches) {
            els.forEach((el) => el.classList.add('is-in', 'is-done'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                const el = en.target;
                el.classList.add('is-in');
                io.unobserve(el);
                setTimeout(() => el.classList.add('is-done'), 1900);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
        els.forEach((el) => io.observe(el));
    }

    /* ───────────── 5. HERO: palabra rotativa ───────────── */
    function initRotator() {
        const rot = $('#rot');
        if (!rot) return;
        const words = $$('.rot-w', rot);
        let current = 0;

        const fit = () => { rot.style.width = words[current].offsetWidth + 'px'; };
        fit();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
        let rt;
        window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 120); });

        if (reduceMotion.matches) return;

        setInterval(() => {
            if (document.hidden) return;
            const next = (current + 1) % words.length;
            rot.style.width = words[next].offsetWidth + 'px';
            words[current].classList.remove('is-active');
            words[current].classList.add('is-leaving');
            const leaving = words[current];
            setTimeout(() => leaving.classList.remove('is-leaving'), 950);
            words[next].classList.add('is-active');
            current = next;
        }, 3400);
    }

    /* ───────────── 6. HERO: esfera de partículas que respira ─────────────
       Esfera de Fibonacci proyectada en 2D (canvas), con conexiones
       precalculadas, pulsos de señal y un ciclo de respiración de 10 s
       (4.2 s inhala, 5.8 s exhala) sincronizado con la etiqueta. */
    function initOrb() {
        const canvas = $('#orb');
        const hero = $('#inicio');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const pill = $('#breath-pill');
        const words = pill ? $$('.bp-word', pill) : [];

        const compact = window.innerWidth < 640;
        const tiny = canvas.getBoundingClientRect().width < 220;
        const N = tiny ? 210 : compact ? 300 : 480;
        const CYCLE = 10;
        const INHALE = 0.42;

        // Puntos sobre la esfera
        const golden = Math.PI * (3 - Math.sqrt(5));
        const base = new Float32Array(N * 3);
        const phase = new Float32Array(N);
        const seed = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const y = 1 - ((i + 0.5) * 2) / N;
            const r = Math.sqrt(1 - y * y);
            const th = i * golden;
            base[i * 3] = Math.cos(th) * r;
            base[i * 3 + 1] = y;
            base[i * 3 + 2] = Math.sin(th) * r;
            phase[i] = Math.random() * Math.PI * 2;
            seed[i] = 0.65 + Math.random() * 0.7;
        }

        // Conexiones entre vecinos (se calculan una sola vez)
        const spacing = Math.sqrt((4 * Math.PI) / N);
        const maxD2 = Math.pow(spacing * 1.32, 2);
        const edgeList = [];
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                const dx = base[i * 3] - base[j * 3];
                const dy = base[i * 3 + 1] - base[j * 3 + 1];
                const dz = base[i * 3 + 2] - base[j * 3 + 2];
                if (dx * dx + dy * dy + dz * dz < maxD2) edgeList.push(i, j);
            }
        }
        const edges = Uint16Array.from(edgeList);
        const E = edges.length / 2;

        // Posiciones proyectadas de cada cuadro
        const sx = new Float32Array(N);
        const sy = new Float32Array(N);
        const sz = new Float32Array(N);

        // Colores leídos de los tokens CSS (cambian con el modo oscuro)
        const colors = { near: [11, 95, 90], far: [124, 207, 192], accent: [15, 127, 120] };
        const parseHex = (v) => {
            v = (v || '').trim();
            if (v[0] !== '#') return null;
            if (v.length === 4) v = '#' + v.slice(1).split('').map((c) => c + c).join('');
            return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
        };
        const readColors = () => {
            const cs = getComputedStyle(root);
            colors.near = parseHex(cs.getPropertyValue('--orb-near')) || colors.near;
            colors.far = parseHex(cs.getPropertyValue('--orb-far')) || colors.far;
            colors.accent = parseHex(cs.getPropertyValue('--accent')) || colors.accent;
        };
        const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')';
        readColors();

        // Tamaño
        let W = 0, H = 0, R = 0, unit = 1;
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = Math.max(Math.round(rect.width), 1);
            H = Math.max(Math.round(rect.height), 1);
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            R = Math.min(W, H) * 0.3;
            unit = Math.max(Math.min(W, H) / 560, 0.5);
            if (!running) render(time);
        };

        // Interacción con el puntero (solo escritorio)
        let px = 0, py = 0, tx = 0, ty = 0;
        if (finePointer.matches && hero) {
            hero.addEventListener('pointermove', (e) => {
                const r = hero.getBoundingClientRect();
                tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
                ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
            });
            hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
        }

        const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
        const breathOf = (t) => {
            const ph = (t % CYCLE) / CYCLE;
            return ph < INHALE ? ease(ph / INHALE) : 1 - ease((ph - INHALE) / (1 - INHALE));
        };

        // Pulsos de señal que recorren las conexiones
        const pulses = [];
        let nextPulse = 0;
        let inhaling = true;
        let time = 1.4;
        let intro = 0;
        let running = false;

        const render = (t) => {
            const b = breathOf(t);
            const introE = 1 - Math.pow(1 - intro, 3);
            const scale = (0.9 + 0.11 * b) * (0.55 + 0.45 * introE);
            const angY = t * 0.14 + px * 0.55;
            const angX = -0.32 + py * 0.3;
            const cY = Math.cos(angY), sY = Math.sin(angY);
            const cX = Math.cos(angX), sX = Math.sin(angX);
            const cx = W / 2, cy = H / 2;

            ctx.clearRect(0, 0, W, H);

            // Resplandor central que respira
            const glowR = R * (1.25 + 0.22 * b);
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
            g.addColorStop(0, rgba(colors.far, (0.2 + 0.12 * b) * introE));
            g.addColorStop(1, rgba(colors.far, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Anillo orbital (mitad trasera)
            const ringRx = R * 1.62, ringRy = R * 0.5, ringRot = -0.38;
            ctx.strokeStyle = rgba(colors.accent, 0.16 * introE);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(cx, cy, ringRx, ringRy, ringRot, Math.PI, Math.PI * 2);
            ctx.stroke();

            // Proyección de los puntos
            for (let i = 0; i < N; i++) {
                const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
                const x1 = x * cY + z * sY;
                const z1 = -x * sY + z * cY;
                const y2 = y * cX - z1 * sX;
                const z2 = y * sX + z1 * cX;
                const k = scale * (1 + 0.024 * Math.sin(phase[i] + t * 1.15 + y * 4));
                const X = x1 * k, Y = y2 * k, Z = z2 * k;
                const f = 1 / (1 - Z * 0.17);
                sx[i] = cx + X * R * f;
                sy[i] = cy + Y * R * f;
                sz[i] = Z;
            }

            // Conexiones por profundidad (3 trazos en total)
            ctx.lineWidth = Math.max(0.6, unit * 0.9);
            for (let bucket = 0; bucket < 3; bucket++) {
                const d = (bucket + 0.5) / 3;
                ctx.strokeStyle = rgba(mix(colors.far, colors.near, d), (0.05 + 0.2 * d) * (0.8 + 0.2 * b) * introE);
                ctx.beginPath();
                for (let e = 0; e < E; e++) {
                    const a = edges[e * 2], c = edges[e * 2 + 1];
                    const dz = ((sz[a] + sz[c]) / 2 + 1) / 2;
                    const bk = dz < 0.36 ? 0 : dz < 0.66 ? 1 : 2;
                    if (bk !== bucket) continue;
                    ctx.moveTo(sx[a], sy[a]);
                    ctx.lineTo(sx[c], sy[c]);
                }
                ctx.stroke();
            }

            // Puntos por profundidad (4 rellenos en total)
            for (let bucket = 0; bucket < 4; bucket++) {
                const d = (bucket + 0.5) / 4;
                ctx.fillStyle = rgba(mix(colors.far, colors.near, d), (0.28 + 0.68 * d) * introE);
                ctx.beginPath();
                for (let i = 0; i < N; i++) {
                    const dz = (sz[i] + 1) / 2;
                    if (Math.min(3, Math.floor(dz * 4)) !== bucket) continue;
                    const r = (0.8 + 1.7 * dz) * seed[i] * unit * 1.25;
                    ctx.moveTo(sx[i] + r, sy[i]);
                    ctx.arc(sx[i], sy[i], r, 0, Math.PI * 2);
                }
                ctx.fill();
            }

            // Pulsos de señal
            for (let p = pulses.length - 1; p >= 0; p--) {
                const pl = pulses[p];
                const u = (t - pl.t0) / pl.dur;
                if (u >= 1) { pulses.splice(p, 1); continue; }
                const a = pl.flip ? edges[pl.e * 2 + 1] : edges[pl.e * 2];
                const c = pl.flip ? edges[pl.e * 2] : edges[pl.e * 2 + 1];
                const ue = ease(u);
                const x = sx[a] + (sx[c] - sx[a]) * ue;
                const y = sy[a] + (sy[c] - sy[a]) * ue;
                const al = Math.sin(u * Math.PI) * introE;
                const depth = ((sz[a] + sz[c]) / 2 + 1) / 2;
                const col = mix(colors.far, colors.near, 0.5 + depth * 0.5);
                ctx.fillStyle = rgba(col, 0.16 * al);
                ctx.beginPath(); ctx.arc(x, y, 6 * unit * 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = rgba(col, 0.95 * al);
                ctx.beginPath(); ctx.arc(x, y, 2.1 * unit * 1.2, 0, Math.PI * 2); ctx.fill();
            }

            // Anillo orbital (mitad delantera) y satélite
            ctx.strokeStyle = rgba(colors.accent, 0.3 * introE);
            ctx.beginPath();
            ctx.ellipse(cx, cy, ringRx, ringRy, ringRot, 0, Math.PI);
            ctx.stroke();

            const th = t * 0.55;
            const ex = Math.cos(th) * ringRx, ey = Math.sin(th) * ringRy;
            const sxp = cx + ex * Math.cos(ringRot) - ey * Math.sin(ringRot);
            const syp = cy + ex * Math.sin(ringRot) + ey * Math.cos(ringRot);
            const front = Math.sin(th) > 0;
            ctx.fillStyle = rgba(colors.accent, (front ? 1 : 0.45) * introE);
            ctx.beginPath(); ctx.arc(sxp, syp, (front ? 4.4 : 3.2) * unit * 1.2, 0, Math.PI * 2); ctx.fill();

            // Etiqueta Inhala / Exhala
            const nowInhaling = (t % CYCLE) / CYCLE < INHALE;
            if (nowInhaling !== inhaling && words.length === 2) {
                inhaling = nowInhaling;
                words[0].classList.toggle('is-on', inhaling);
                words[1].classList.toggle('is-on', !inhaling);
            }
        };

        const update = (dt) => {
            time += dt;
            intro = Math.min(intro + dt / 2.6, 1);
            const k = 1 - Math.pow(0.002, dt);
            px += (tx - px) * k;
            py += (ty - py) * k;

            if (time >= nextPulse && pulses.length < 9) {
                for (let tries = 0; tries < 8; tries++) {
                    const e = (Math.random() * E) | 0;
                    if ((sz[edges[e * 2]] + sz[edges[e * 2 + 1]]) / 2 > -0.2) {
                        pulses.push({ e, t0: time, dur: 1.1 + Math.random() * 1.1, flip: Math.random() < 0.5 });
                        break;
                    }
                }
                nextPulse = time + 0.35 + Math.random() * 0.5;
            }
        };

        // Bucle de animación (se pausa fuera de pantalla y en pestañas ocultas)
        let last = 0;
        let raf = 0;
        let visible = true;
        const loop = (now) => {
            if (!running) return;
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            update(dt);
            render(time);
            raf = requestAnimationFrame(loop);
        };
        const start = () => {
            if (running || reduceMotion.matches || !visible || document.hidden) return;
            running = true;
            last = performance.now();
            raf = requestAnimationFrame(loop);
        };
        const stop = () => { running = false; cancelAnimationFrame(raf); };

        if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
        resize();

        if (reduceMotion.matches) {
            intro = 1;
            render(time);
            return;
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                visible = entries[0].isIntersecting;
                visible ? start() : stop();
            }, { threshold: 0 }).observe(canvas);
        }
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
        start();
    }

    /* ───────────── 7. TERAPIAS: foco de luz y botones magnéticos ───────────── */
    function initInteractions() {
        if (finePointer.matches && !reduceMotion.matches) {
            $$('.btn-mag').forEach((btn) => {
                btn.addEventListener('pointermove', (e) => {
                    const r = btn.getBoundingClientRect();
                    const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
                    const dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
                    btn.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
                });
                btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
            });
        }
    }

    /* ───────────── 8. MANIFIESTO: divide el texto en palabras ───────────── */
    function initManifesto() {
        const el = $('#manifesto');
        if (!el || reduceMotion.matches) return;
        let i = 0;
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
                        const span = document.createElement('span');
                        span.className = 'w';
                        span.style.setProperty('--i', i++);
                        span.textContent = part;
                        frag.appendChild(span);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === 1) {
                    walk(child);
                }
            });
        };
        walk(el);
        el.style.setProperty('--n', i + 1);
        el.classList.add('is-split');
    }

    /* ───────────── 9. ESPECIALIDADES: foco según el scroll ───────────── */
    function initAreas() {
        const areas = $$('[data-area]');
        if (!areas.length) return;
        if (!('IntersectionObserver' in window) || reduceMotion.matches) {
            areas.forEach((a) => a.classList.add('is-active'));
            return;
        }
        areas[0].classList.add('is-active');
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                areas.forEach((a) => a.classList.toggle('is-active', a === en.target));
            });
        }, { rootMargin: '-40% 0px -45% 0px' });
        areas.forEach((a) => io.observe(a));
    }

    /* ───────────── 10. PAUSA: respiración guiada ───────────── */
    function initPausa() {
        const stage = $('#pausa-stage');
        const btn = $('#pausa-btn');
        if (!stage || !btn) return;
        const word = $('#pausa-word');
        const count = $('#pausa-count');
        const label = $('#pausa-btn-text');
        const icon = $('use', btn);

        const IN = 4, OUT = 6, ROUNDS = 3;
        let token = 0;
        stage.classList.add('is-idle');

        const setScale = (s, dur) => {
            stage.style.setProperty('--dur', dur + 's');
            stage.style.setProperty('--s', s);
        };
        const wait = (ms, id) => new Promise((res) => setTimeout(() => res(id === token), ms));

        const countdown = async (seconds, round, id) => {
            for (let s = seconds; s > 0; s--) {
                count.textContent = s + ' s, ronda ' + round + ' de ' + ROUNDS;
                if (!(await wait(1000, id))) return false;
            }
            return true;
        };

        const reset = (finished) => {
            stage.classList.add('is-idle');
            setScale(0.62, 1.4);
            word.textContent = finished ? 'Muy bien' : 'Listo';
            count.textContent = finished ? 'Cuando quieras, agenda tu cita' : 'Presiona iniciar';
            label.textContent = finished ? 'Repetir pausa' : 'Iniciar pausa';
            icon.setAttribute('href', '#i-play');
        };

        const run = async () => {
            const id = ++token;
            stage.classList.remove('is-idle');
            label.textContent = 'Detener';
            icon.setAttribute('href', '#i-stop');
            for (let r = 1; r <= ROUNDS; r++) {
                word.textContent = 'Inhala';
                setScale(1, IN);
                if (!(await countdown(IN, r, id))) return;
                word.textContent = 'Exhala';
                setScale(0.62, OUT);
                if (!(await countdown(OUT, r, id))) return;
            }
            token++;
            reset(true);
        };

        btn.addEventListener('click', () => {
            const running = !stage.classList.contains('is-idle');
            if (running) { token++; reset(false); } else { run(); }
        });
    }

    /* ───────────── 11. FAQ ───────────── */
    function initFaq() {
        const items = $$('.faq-item');
        items.forEach((item) => {
            const q = $('.faq-q', item);
            const a = $('.faq-a', item);
            a.inert = true;
            q.addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach((other) => {
                    const isThis = other === item;
                    const show = isThis && open;
                    other.classList.toggle('is-open', show);
                    $('.faq-q', other).setAttribute('aria-expanded', String(show));
                    $('.faq-a', other).inert = !show;
                });
            });
        });
    }

    /* ───────────── 12. FORMULARIO → WHATSAPP ───────────── */
    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const submit = $('#form-submit');
        const status = $('#form-status');
        const f = {
            name: $('#f-name'),
            phone: $('#f-phone'),
            type: $('#f-type'),
            message: $('#f-msg')
        };

        const setError = (input, msg) => {
            const field = input.closest('.field');
            const out = $('#' + input.id + '-err');
            field.classList.toggle('has-error', Boolean(msg));
            input.setAttribute('aria-invalid', msg ? 'true' : 'false');
            if (out) out.textContent = msg || '';
        };

        const validators = {
            name: () => (f.name.value.trim().length < 2 ? 'Escribe tu nombre.' : ''),
            phone: () => {
                const digits = f.phone.value.replace(/\D/g, '');
                return f.phone.value.trim() && (digits.length < 8 || digits.length > 15) ? 'Revisa tu teléfono, parece incompleto.' : '';
            },
            type: () => (!f.type.value ? 'Selecciona el tipo de terapia.' : '')
        };

        ['name', 'phone', 'type'].forEach((key) => {
            const ev = key === 'type' ? 'change' : 'input';
            f[key].addEventListener(ev, () => { if (f[key].closest('.field').classList.contains('has-error')) setError(f[key], validators[key]()); });
            f[key].addEventListener('blur', () => { if (f[key].value) setError(f[key], validators[key]()); });
        });

        const buildMessage = () => {
            const lines = [
                'Hola, soy ' + f.name.value.trim() + '. Me gustaría agendar una cita.',
                'Busco: ' + f.type.value + '.'
            ];
            if (f.phone.value.trim()) lines.push('Mi teléfono: ' + f.phone.value.trim());
            if (f.message.value.trim()) lines.push('Mensaje: ' + f.message.value.trim());
            return lines.join('\n');
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let firstInvalid = null;
            ['name', 'phone', 'type'].forEach((key) => {
                const msg = validators[key]();
                setError(f[key], msg);
                if (msg && !firstInvalid) firstInvalid = f[key];
            });
            if (firstInvalid) {
                status.textContent = '';
                firstInvalid.focus();
                return;
            }

            const url = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(buildMessage());
            submit.classList.add('is-loading');
            status.textContent = 'Abriendo WhatsApp...';

            // Se abre dentro del gesto del usuario para que los navegadores no lo bloqueen
            const win = window.open(url, '_blank');
            if (win) win.opener = null;

            setTimeout(() => {
                submit.classList.remove('is-loading');
                status.innerHTML = 'Listo. Si WhatsApp no se abrió, <a href="' + url + '" target="_blank" rel="noopener">toca aquí para continuar</a>.';
            }, 1300);
        });
    }

    /* ───────────── 13. BOTÓN FLOTANTE ───────────── */
    function initFloat() {
        const fl = $('#wa-float');
        if (!fl) return;
        setTimeout(() => {
            fl.classList.add('show-tip');
            setTimeout(() => fl.classList.remove('show-tip'), 5000);
        }, 7000);
    }

    /* ───────────── ARRANQUE ───────────── */
    try {
        if (!reduceMotion.matches) root.classList.add('anim');
        const yearEl = $('#year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        initNav();
        initManifesto();
        initScroll();
        initAnchors();
        initAreas();
        initFaq();
        initPausa();
        initForm();
        initInteractions();

        initLoader().then(() => {
            if (lenis) lenis.start();
            initReveal();
            initRotator();
            initOrb();
            initFloat();
            onScrollFrame();
        });
    } catch (err) {
        // Si algo falla, el sitio sigue siendo utilizable sin animaciones
        root.classList.remove('anim', 'is-loading');
        const l = $('#loader');
        if (l) l.remove();
        console.error(err);
    }
})();
