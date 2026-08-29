/* =========================================================
   MOLANG WEBSITE
   Main JavaScript
   ========================================================= */


/* =========================================================
   MOBILE MENU
   ========================================================= */

const mobileMenuButton =
    document.getElementById(
        "mobileMenuButton"
    );

const mobileMenu =
    document.getElementById(
        "mobileMenu"
    );


if (
    mobileMenuButton &&
    mobileMenu
) {

    mobileMenuButton.addEventListener(
        "click",
        function () {

            mobileMenu.classList.toggle(
                "active"
            );

        }
    );


    const mobileMenuLinks =
        mobileMenu.querySelectorAll(
            "a"
        );


    mobileMenuLinks.forEach(
        function (link) {

            link.addEventListener(
                "click",
                function () {

                    mobileMenu.classList.remove(
                        "active"
                    );

                }
            );

        }
    );


    document.addEventListener(
        "click",
        function (event) {

            const clickedInsideMenu =
                mobileMenu.contains(
                    event.target
                );

            const clickedMenuButton =
                mobileMenuButton.contains(
                    event.target
                );


            if (
                !clickedInsideMenu &&
                !clickedMenuButton
            ) {

                mobileMenu.classList.remove(
                    "active"
                );

            }

        }
    );

}


/* =========================================================
   COPY CODE
   ========================================================= */

const copyButtons =
    document.querySelectorAll(
        ".copy-button"
    );


copyButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            async function () {

                const targetId =
                    button.getAttribute(
                        "data-copy-target"
                    );


                const target =
                    document.getElementById(
                        targetId
                    );


                if (!target) {

                    return;

                }


                const codeText =
                    target.innerText;


                const oldText =
                    button.textContent;


                try {

                    await navigator.clipboard.writeText(
                        codeText
                    );


                    button.textContent =
                        "Copied";


                    button.disabled =
                        true;


                    setTimeout(
                        function () {

                            button.textContent =
                                oldText;

                            button.disabled =
                                false;

                        },
                        1400
                    );


                } catch (error) {

                    console.error(
                        "Failed to copy code:",
                        error
                    );


                    fallbackCopy(
                        codeText,
                        button,
                        oldText
                    );

                }

            }
        );

    }
);


/* =========================================================
   FALLBACK COPY
   ========================================================= */

function fallbackCopy(
    text,
    button,
    oldText
) {

    const textarea =
        document.createElement(
            "textarea"
        );


    textarea.value =
        text;


    textarea.style.position =
        "fixed";

    textarea.style.opacity =
        "0";

    textarea.style.pointerEvents =
        "none";


    document.body.appendChild(
        textarea
    );


    textarea.focus();

    textarea.select();


    try {

        document.execCommand(
            "copy"
        );


        button.textContent =
            "Copied";


        button.disabled =
            true;


        setTimeout(
            function () {

                button.textContent =
                    oldText;

                button.disabled =
                    false;

            },
            1400
        );


    } catch (error) {

        console.error(
            "Fallback copy failed:",
            error
        );

    }


    textarea.remove();

}


/* =========================================================
   CURRENT YEAR
   ========================================================= */

const currentYear =
    document.getElementById(
        "currentYear"
    );


if (currentYear) {

    currentYear.textContent =
        new Date().getFullYear();

}


/* =========================================================
   SMOOTH SCROLL
   ========================================================= */

const internalLinks =
    document.querySelectorAll(
        'a[href^="#"]'
    );


internalLinks.forEach(
    function (link) {

        link.addEventListener(
            "click",
            function (event) {

                const href =
                    link.getAttribute(
                        "href"
                    );


                if (
                    !href ||
                    href === "#"
                ) {

                    return;

                }


                const target =
                    document.querySelector(
                        href
                    );


                if (!target) {

                    return;

                }


                event.preventDefault();


                target.scrollIntoView(
                    {
                        behavior:
                            "smooth",

                        block:
                            "start"
                    }
                );

            }
        );

    }
);


/* =========================================================
   SCROLL REVEAL
   ========================================================= */

const revealElements =
    document.querySelectorAll(
        [
            ".feature-card",
            ".example-container",
            ".syntax-card",
            ".download-card"
        ].join(", ")
    );


if (
    "IntersectionObserver" in window
) {

    const revealObserver =
        new IntersectionObserver(
            function (entries) {

                entries.forEach(
                    function (entry) {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList.add(
                                "reveal"
                            );


                            revealObserver.unobserve(
                                entry.target
                            );

                        }

                    }
                );

            },
            {
                threshold:
                    0.12
            }
        );


    revealElements.forEach(
        function (element) {

            revealObserver.observe(
                element
            );

        }
    );

} else {

    revealElements.forEach(
        function (element) {

            element.classList.add(
                "reveal"
            );

        }
    );

}


/* =========================================================
   DOWNLOAD FEEDBACK
   ========================================================= */

const downloadButtons =
    document.querySelectorAll(
        'a[download]'
    );


downloadButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                button.classList.add(
                    "download-clicked"
                );


                setTimeout(
                    function () {

                        button.classList.remove(
                            "download-clicked"
                        );

                    },
                    700
                );

            }
        );

    }
);


/* =========================================================
   ACTIVE NAV SECTION
   ========================================================= */

const sections =
    document.querySelectorAll(
        "section[id]"
    );


const navLinks =
    document.querySelectorAll(
        '.nav-links a[href^="#"]'
    );


if (
    sections.length > 0 &&
    navLinks.length > 0 &&
    "IntersectionObserver" in window
) {

    const sectionObserver =
        new IntersectionObserver(
            function (entries) {

                entries.forEach(
                    function (entry) {

                        if (
                            !entry.isIntersecting
                        ) {

                            return;

                        }


                        const currentId =
                            entry.target.id;


                        navLinks.forEach(
                            function (link) {

                                const linkId =
                                    link
                                        .getAttribute(
                                            "href"
                                        )
                                        .replace(
                                            "#",
                                            ""
                                        );


                                link.classList.toggle(
                                    "active",
                                    linkId === currentId
                                );

                            }
                        );

                    }
                );

            },
            {
                rootMargin:
                    "-35% 0px -55% 0px"
            }
        );


    sections.forEach(
        function (section) {

            sectionObserver.observe(
                section
            );

        }
    );

}


/* =========================================================
   PAGE LOAD
   ========================================================= */

window.addEventListener(
    "load",
    function () {

        document.body.classList.add(
            "loaded"
        );

    }
);
