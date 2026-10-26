/* =========================================================
   DESCENT — INTERACTIVE PARALLAX ENGINE
   Author: Nihar Tiwari
   File: script.js
   ========================================================= */

(() => {
    "use strict";

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const isCoarsePointer = window.matchMedia("(pointer: coarse)");

    const state = {
        motionEnabled: !prefersReducedMotion.matches,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        ticking: false,
        pointerX: -500,
        pointerY: -500,
        pointerActive: false,
        signalDecoded: false
    };

    const progressBar = $("#progressBar");
    const cursorGlow = $("#cursorGlow");
    const motionToggle = $("#motionToggle");
    const motionLabel = $("#motionLabel");
    const signalButton = $("#signalButton");
    const signalMessage = $("#signalMessage");
    const waveform = $("#waveform");

    /* -------------------------------------------------------
       1. GENERATE STAR FIELDS
       ------------------------------------------------------- */

    function createStars(container, count, options = {}) {
        if (!container) return;

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
            const star = document.createElement("span");
            star.className = "star";

            const size = Math.random() * (options.maxSize || 2.2) + 0.5;
            const duration = (Math.random() * 4 + 2).toFixed(2);

            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.setProperty("--twinkle-duration", `${duration}s`);
            star.style.animationDelay = `${(Math.random() * -5).toFixed(2)}s`;

            fragment.appendChild(star);
        }

        container.appendChild(fragment);
    }

    createStars($("#starfield"), 115, { maxSize: 2 });
    createStars($(".world__stars"), 40, { maxSize: 1.8 });
    createStars($(".orbit-world__stars"), 55, { maxSize: 2 });

    /* -------------------------------------------------------
       2. BIOLUMINESCENT PARTICLES
       ------------------------------------------------------- */

    function createBloomParticles() {
        const container = $("#bloomParticles");
        if (!container) return;

        const fragment = document.createDocumentFragment();
        const particleCount = state.viewportWidth < 600 ? 24 : 48;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement("span");
            particle.className = "bloom-particle";

            particle.style.left = `${Math.random() * 100}%`;
            particle.style.setProperty(
                "--particle-duration",
                `${(Math.random() * 8 + 6).toFixed(2)}s`
            );
            particle.style.setProperty(
                "--particle-delay",
                `${(Math.random() * -14).toFixed(2)}s`
            );
            particle.style.setProperty(
                "--particle-drift",
                `${Math.round(Math.random() * 100 - 50)}px`
            );

            const size = Math.random() * 2.5 + 1;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            fragment.appendChild(particle);
        }

        container.replaceChildren(fragment);
    }

    createBloomParticles();

    /* -------------------------------------------------------
       3. ANIMATED SIGNAL WAVEFORM
       ------------------------------------------------------- */

    function createWaveform() {
        if (!waveform) return;

        const fragment = document.createDocumentFragment();
        const barCount = state.viewportWidth < 600 ? 32 : 52;

        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement("span");
            bar.className = "waveform__bar";

            const height = Math.round(12 + Math.random() * 80);

            bar.style.setProperty("--bar-height", `${height}%`);
            bar.style.setProperty(
                "--bar-speed",
                `${(Math.random() * 0.9 + 0.45).toFixed(2)}s`
            );
            bar.style.setProperty(
                "--bar-delay",
                `${(Math.random() * -1.5).toFixed(2)}s`
            );

            fragment.appendChild(bar);
        }

        waveform.replaceChildren(fragment);
    }

    createWaveform();

    /* -------------------------------------------------------
       4. SCROLL-TRIGGERED REVEALS
       ------------------------------------------------------- */

    const revealElements = $$(".reveal");

    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -35px 0px"
            }
        );

        revealElements.forEach((element) => {
            revealObserver.observe(element);
        });
    } else {
        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });
    }

    /* -------------------------------------------------------
       5. MULTI-LAYER PARALLAX ENGINE

       Each data-speed attribute determines how fast its layer
       moves relative to the document's scroll position.

       Positive speed: layer shifts downward.
       Negative speed: layer shifts upward.
       ------------------------------------------------------- */

    const parallaxLayers = $$("[data-speed]");

    const parallaxData = parallaxLayers.map((element) => ({
        element,
        speed: Number.parseFloat(element.dataset.speed) || 0,
        baseOffset: 0
    }));

    function updateParallax() {
        const scrollY = state.scrollY;

        parallaxData.forEach(({ element, speed }) => {
            if (!state.motionEnabled) {
                element.style.translate = "0 0";
                return;
            }

            const section = element.closest(
                ".hero, .world, .signal-section, .archive"
            );

            let sectionOffset = 0;

            if (section) {
                const rect = section.getBoundingClientRect();
                const sectionTop = rect.top + scrollY;

                // Use local section scroll to prevent distant
                // sections from receiving enormous offsets.
                sectionOffset = scrollY - sectionTop;
            } else {
                sectionOffset = scrollY;
            }

            const offset = sectionOffset * speed;

            element.style.translate = `0 ${offset.toFixed(2)}px`;
        });
    }

    function updateScrollProgress() {
        if (!progressBar) return;

        const documentHeight =
            document.documentElement.scrollHeight - state.viewportHeight;

        const progress = documentHeight > 0
            ? Math.min(100, Math.max(0, (state.scrollY / documentHeight) * 100))
            : 0;

        progressBar.style.width = `${progress}%`;
    }

    function renderFrame() {
        state.ticking = false;

        updateScrollProgress();
        updateParallax();

        if (
            state.pointerActive &&
            cursorGlow &&
            state.motionEnabled &&
            !isCoarsePointer.matches
        ) {
            cursorGlow.style.left = `${state.pointerX}px`;
            cursorGlow.style.top = `${state.pointerY}px`;
        }
    }

    function requestRender() {
        if (state.ticking) return;

        state.ticking = true;
        window.requestAnimationFrame(renderFrame);
    }

    window.addEventListener(
        "scroll",
        () => {
            state.scrollY = window.scrollY;
            requestRender();
        },
        { passive: true }
    );

    window.addEventListener(
        "resize",
        () => {
            state.viewportHeight = window.innerHeight;
            state.viewportWidth = window.innerWidth;

            createBloomParticles();
            createWaveform();
            requestRender();
        },
        { passive: true }
    );

    /* -------------------------------------------------------
       6. POINTER-RESPONSIVE AMBIENT GLOW
       ------------------------------------------------------- */

    if (!isCoarsePointer.matches && cursorGlow) {
        window.addEventListener(
            "pointermove",
            (event) => {
                state.pointerX = event.clientX;
                state.pointerY = event.clientY;
                state.pointerActive = true;

                document.body.classList.add("pointer-active");

                requestRender();
            },
            { passive: true }
        );

        document.addEventListener("pointerleave", () => {
            state.pointerActive = false;
            document.body.classList.remove("pointer-active");
        });

        document.addEventListener("pointerenter", () => {
            state.pointerActive = true;
        });
    }

    /* -------------------------------------------------------
       7. MOTION CONTROL

       The control pauses decorative CSS animations and disables
       scroll-based parallax while preserving navigation.
       ------------------------------------------------------- */

    function updateMotionControl() {
        document.body.classList.toggle(
            "motion-off",
            !state.motionEnabled
        );

        if (motionToggle) {
            motionToggle.setAttribute(
                "aria-pressed",
                String(!state.motionEnabled)
            );
        }

        if (motionLabel) {
            motionLabel.textContent = state.motionEnabled
                ? "MOTION ON"
                : "MOTION OFF";
        }

        if (!state.motionEnabled) {
            parallaxData.forEach(({ element }) => {
                element.style.translate = "0 0";
            });

            if (cursorGlow) {
                document.body.classList.remove("pointer-active");
            }
        } else {
            requestRender();
        }
    }

    if (motionToggle) {
        motionToggle.addEventListener("click", () => {
            state.motionEnabled = !state.motionEnabled;
            updateMotionControl();
        });
    }

    updateMotionControl();

    /* -------------------------------------------------------
       8. INTERACTIVE SIGNAL DECODER
       ------------------------------------------------------- */

    const transmissions = [
        {
            label: "TRANSMISSION 001",
            message: "YOU WERE NEVER MEANT TO STAY ON THE SURFACE."
        },
        {
            label: "TRANSMISSION 002",
            message: "DISTANCE IS AN ILLUSION. PERSPECTIVE IS THE KEY."
        },
        {
            label: "TRANSMISSION 003",
            message: "THE WORLD CHANGES WHEN YOU CHANGE YOUR POSITION."
        }
    ];

    if (signalButton && signalMessage) {
        signalButton.addEventListener("click", () => {
            const messageLabel = $(".signal-message__label", signalMessage);
            const messageText = $("p", signalMessage);

            if (!messageLabel || !messageText) return;

            const index = state.signalDecoded
                ? 1 + Math.floor(Math.random() * (transmissions.length - 1))
                : 0;

            const transmission = transmissions[index];

            messageLabel.textContent = transmission.label;
            messageText.textContent = transmission.message;

            state.signalDecoded = true;

            signalMessage.classList.remove("is-visible");

            // Restart the reveal transition without a timer.
            void signalMessage.offsetWidth;

            signalMessage.classList.add("is-visible");

            signalButton.querySelector("span").textContent =
                "DECODE ANOTHER SIGNAL";

            const arrow = signalButton.querySelector(".button__arrow");

            if (arrow) arrow.textContent = "↻";

            signalButton.setAttribute("aria-expanded", "true");
        });

        signalButton.setAttribute("aria-expanded", "false");
    }

    /* -------------------------------------------------------
       9. INTERACTIVE FIELD ARCHIVE

       Every archive card navigates to its matching world.
       ------------------------------------------------------- */

    $$(".archive-card[data-target]").forEach((card) => {
        card.addEventListener("click", () => {
            const targetId = card.dataset.target;
            const target = document.getElementById(targetId);

            if (!target) return;

            target.scrollIntoView({
                behavior: state.motionEnabled ? "smooth" : "auto",
                block: "start"
            });
        });
    });

    /* -------------------------------------------------------
       10. NAVIGATION SCROLLING

       Native anchor navigation remains functional. This helper
       also handles browsers with reduced-motion preferences.
       ------------------------------------------------------- */

    $$('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const href = link.getAttribute("href");

            if (!href || href === "#") return;

            const target = document.querySelector(href);

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: state.motionEnabled ? "smooth" : "auto",
                block: "start"
            });

            // Keep the URL useful for direct navigation.
            if (window.location.hash !== href) {
                history.replaceState(null, "", href);
            }
        });
    });

    /* -------------------------------------------------------
       11. INITIAL RENDER
       ------------------------------------------------------- */

    requestRender();

    console.info(
        "DESCENT initialized | Parallax layers:",
        parallaxData.length,
        "| Author: Nihar Tiwari"
    );
})();