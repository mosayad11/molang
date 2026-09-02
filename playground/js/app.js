const defaults = {
    page: `page

main class="hero".
    h1. Hello, MoLang!
    p. This is an interactive MoLang playground.
    button id="helloButton". Click me`,

    style: `style

body
    margin: 0
    font-family: Arial, sans-serif
    background: #111827
    color: white

.hero
    padding: 70px
    text-align: center

button
    padding: 12px 20px
    border: 0
    border-radius: 10px
    cursor: pointer`,

    script: `script

button = get "#helloButton"

on button click
    set "h1" text to "You clicked the button!"
    print "Hello from MoLang!"`
};

const editors = {};
let activeEditor = "page";

require.config({
    paths: {
        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs"
    }
});

require(["vs/editor/editor.main"], function () {
    MoLangLanguage.register(monaco);
    monaco.editor.setTheme("molang-dark");

    for (const name of ["page", "style", "script"]) {
        const saved = localStorage.getItem("molang-playground-" + name);
        editors[name] = monaco.editor.create(
            document.getElementById(name + "Editor"),
            {
                value: saved !== null ? saved : defaults[name],
                language: "molang",
                theme: "molang-dark",
                automaticLayout: true,
                fontSize: 14,
                lineHeight: 22,
                fontFamily: "Consolas, 'Courier New', monospace",
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                tabSize: 4,
                insertSpaces: true,
                detectIndentation: false,
                bracketPairColorization: { enabled: true },
                guides: {
                    indentation: true,
                    bracketPairs: true
                },
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                autoIndent: "advanced",
                formatOnPaste: false,
                wordWrap: "off",
                padding: { top: 12 }
            }
        );

        editors[name].onDidChangeModelContent(() => {
            localStorage.setItem(
                "molang-playground-" + name,
                editors[name].getValue()
            );
        });
    }

    setupUI();
    runProject();
});

function compilePage(input) {
    const output = [];
    const stack = [];
    const voidTags = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;

    function closeBlocks(indent) {
        while (
            stack.length &&
            indent <= stack[stack.length - 1].indent
        ) {
            output.push(`</${stack.pop().tag}>`);
        }
    }

    for (const raw of input.replace(/\r/g, "").split("\n")) {
        if (!raw.trim()) continue;

        const indent = raw.match(/^\s*/)[0].length;
        const line = raw.trim();

        if (/^(page|style|script)\.?$/i.test(line)) continue;
        if (line.startsWith("//")) continue;

        if (line.startsWith("<")) {
            output.push(line);
            continue;
        }

        closeBlocks(indent);

        const match = line.match(/^([\w:-]+)(.*)$/);

        if (!match) {
            output.push(line);
            continue;
        }

        const tag = match[1];
        const remainder = (match[2] || "").trimStart();
        const marker = remainder.search(/\.(?=\s|$)/);

        const attrs = (
            marker >= 0
                ? remainder.slice(0, marker)
                : remainder
        ).trim();

        const text = marker >= 0
            ? remainder.slice(marker + 1).trim()
            : "";

        if (voidTags.test(tag)) {
            output.push(`<${tag}${attrs ? " " + attrs : ""}>`);
            continue;
        }

        if (text) {
            output.push(
                `<${tag}${attrs ? " " + attrs : ""}>${text}</${tag}>`
            );
            continue;
        }

        output.push(`<${tag}${attrs ? " " + attrs : ""}>`);
        stack.push({ tag, indent });
    }

    while (stack.length) {
        output.push(`</${stack.pop().tag}>`);
    }

    return output.join("\n");
}

function compileStyle(input) {
    const output = [];
    const stack = [];

    function closeBlocks(currentIndent) {
        while (
            stack.length &&
            currentIndent <= stack[stack.length - 1]
        ) {
            output.push("}");
            stack.pop();
        }
    }

    for (const raw of input.replace(/\r/g, "").split("\n")) {
        if (!raw.trim()) continue;

        const indent = raw.match(/^\s*/)[0].length;
        const line = raw.trim();

        if (/^style\.?$/i.test(line)) continue;
        if (line.startsWith("//")) {
            output.push("/* " + line.slice(2).trim() + " */");
            continue;
        }

        if (/^((--)?[a-zA-Z-]+)\s*:/.test(line)) {
            output.push(line.replace(/;$/, "") + ";");
            continue;
        }

        if (line.endsWith("{") || line.endsWith(";")) {
            output.push(line);
            continue;
        }

        closeBlocks(indent);
        output.push(line.replace(/\.$/, "") + " {");
        stack.push(indent);
    }

    while (stack.length) {
        output.push("}");
        stack.pop();
    }

    return output.join("\n");
}

function transformExpression(value) {
    return value
        .trim()
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/\bNone\b/g, "null")
        .replace(/\band\b/g, "&&")
        .replace(/\bor\b/g, "||")
        .replace(/\bnot\s+/g, "!")
        .replace(/\blen\s*\(([^()]*)\)/g, "($1).length");
}

function selectorExpression(selector) {
    selector = selector.trim();

    if (
        (selector.startsWith('"') && selector.endsWith('"')) ||
        (selector.startsWith("'") && selector.endsWith("'"))
    ) {
        return `document.querySelector(${selector})`;
    }

    return selector;
}

function compileScript(input) {
    const output = [];
    const stack = [];
    const declared = new Set();

    function closeBlocks(indent) {
        while (
            stack.length &&
            indent <= stack[stack.length - 1].indent
        ) {
            const block = stack.pop();
            output.push(block.type === "event" ? "});" : "}");
        }
    }

    for (const raw of input.replace(/\r/g, "").split("\n")) {
        if (!raw.trim()) continue;

        const indent = raw.match(/^\s*/)[0].length;
        const line = raw.trim();

        if (/^script\.?$/i.test(line)) continue;

        if (line.startsWith("#")) {
            output.push("// " + line.slice(1).trim());
            continue;
        }

        if (line.startsWith("//")) {
            output.push(line);
            continue;
        }

        closeBlocks(indent);

        let match;

        match = line.match(
            /^on\s+(.+?)\s+([a-zA-Z][\w-]*)(?:\s+as\s+(\w+))?\s*:?$/
        );

        if (match) {
            const callback = match[3]
                ? `(${match[3]}) => {`
                : "() => {";

            output.push(
                `${selectorExpression(match[1])}.addEventListener("${match[2]}", ${callback}`
            );

            stack.push({ indent, type: "event" });
            continue;
        }

        match = line.match(/^if\s+(.+?)\s*:?$/);

        if (match) {
            output.push(`if (${transformExpression(match[1])}) {`);
            stack.push({ indent, type: "block" });
            continue;
        }

        match = line.match(/^def\s+(\w+)\s*\((.*?)\)\s*:?$/);

        if (match) {
            output.push(`function ${match[1]}(${match[2]}) {`);
            stack.push({ indent, type: "block" });
            continue;
        }

        match = line.match(
            /^for\s+(\w+)\s+in\s+range\s*\((.*?)\)\s*:?$/
        );

        if (match) {
            const parts = match[2]
                .split(",")
                .map(x => transformExpression(x));

            let start = "0";
            let end = "0";
            let step = "1";

            if (parts.length === 1) {
                end = parts[0];
            } else if (parts.length === 2) {
                start = parts[0];
                end = parts[1];
            } else {
                [start, end, step] = parts;
            }

            output.push(
                `for (let ${match[1]} = ${start}; ${match[1]} < ${end}; ${match[1]} += ${step}) {`
            );

            stack.push({ indent, type: "block" });
            continue;
        }

        match = line.match(/^(\w+)\s*=\s*get\s+(.+)$/);

        if (match) {
            const prefix = declared.has(match[1]) ? "" : "let ";
            declared.add(match[1]);

            output.push(
                `${prefix}${match[1]} = ${selectorExpression(match[2])};`
            );

            continue;
        }

        match = line.match(/^set\s+(.+?)\s+text\s+to\s+(.+)$/);

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.textContent = ${transformExpression(match[2])};`
            );
            continue;
        }

        match = line.match(/^set\s+(.+?)\s+html\s+to\s+(.+)$/);

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.innerHTML = ${transformExpression(match[2])};`
            );
            continue;
        }

        match = line.match(/^print\s*\((.*)\)$/);

        if (match) {
            output.push(
                `console.log(${transformExpression(match[1])});`
            );
            continue;
        }

        match = line.match(/^print\s+(.+)$/);

        if (match) {
            output.push(
                `console.log(${transformExpression(match[1])});`
            );
            continue;
        }

        match = line.match(/^(\w+)\s*=\s*(.+)$/);

        if (match) {
            const prefix = declared.has(match[1]) ? "" : "let ";
            declared.add(match[1]);

            output.push(
                `${prefix}${match[1]} = ${transformExpression(match[2])};`
            );
            continue;
        }

        output.push(line.endsWith(";") ? line : line + ";");
    }

    while (stack.length) {
        const block = stack.pop();
        output.push(block.type === "event" ? "});" : "}");
    }

    return output.join("\n");
}

function runProject() {
    const page = compilePage(editors.page.getValue());
    const style = compileStyle(editors.style.getValue());
    const script = compileScript(editors.script.getValue());

    const generated =
        `<!-- GENERATED PAGE -->\n${page}\n\n` +
        `/* GENERATED STYLE */\n${style}\n\n` +
        `// GENERATED SCRIPT\n${script}`;

    document.getElementById("generatedOutput").textContent = generated;

    const iframe = document.getElementById("preview");

    const safeScript = script.replace(
        /<\/script>/gi,
        "<\\/script>"
    );

    iframe.srcdoc =
        `<!DOCTYPE html>
<html>
<head>
<style>${style}</style>
</head>
<body>
${page}
<script>
console.log = (...args) => parent.postMessage(
    {
        type: "molang-console",
        message: args.map(String).join(" ")
    },
    "*"
);

try {
${safeScript}
} catch (error) {
    parent.postMessage(
        {
            type: "molang-console",
            message: "ERROR: " + error.message
        },
        "*"
    );
}
<\/script>
</body>
</html>`;

    document.getElementById("consoleOutput").textContent =
        "✓ MoLang compiled successfully.\n";

    toast("MoLang is running");
}

function setupUI() {
    document.querySelectorAll(".tab").forEach(button => {
        button.addEventListener("click", () => {
            const name = button.dataset.editor;
            activeEditor = name;

            document.querySelectorAll(".tab")
                .forEach(x => x.classList.remove("active"));

            document.querySelectorAll(".editor")
                .forEach(x => x.classList.remove("active"));

            button.classList.add("active");
            document
                .getElementById(name + "Editor")
                .classList.add("active");

            document.getElementById("languageLabel").textContent =
                "MoLang " + name.toUpperCase();

            editors[name].layout();
            editors[name].focus();
        });
    });

    document.querySelectorAll(".result-tab").forEach(button => {
        button.addEventListener("click", () => {
            const result = button.dataset.result;

            document.querySelectorAll(".result-tab")
                .forEach(x => x.classList.remove("active"));

            document.querySelectorAll(".result")
                .forEach(x => x.classList.remove("active"));

            button.classList.add("active");
            document
                .getElementById(result + "Output")
                .classList.add("active");
        });
    });

    document.getElementById("runButton").onclick = runProject;

    document.getElementById("clearButton").onclick = () => {
        editors[activeEditor].setValue("");
        editors[activeEditor].focus();
        toast("Editor cleared");
    };

    document.getElementById("copyButton").onclick = async () => {
        const text =
            document.getElementById("generatedOutput").textContent;

        try {
            await navigator.clipboard.writeText(text);
            toast("Generated code copied");
        } catch {
            toast("Could not copy");
        }
    };

    document.getElementById("openPreview").onclick = () => {
        const iframe = document.getElementById("preview");

        const popup = window.open();
        if (popup) {
            popup.document.open();
            popup.document.write(iframe.srcdoc);
            popup.document.close();
        }
    };

    window.addEventListener("message", event => {
        if (event.data?.type === "molang-console") {
            const consoleOutput =
                document.getElementById("consoleOutput");

            consoleOutput.textContent +=
                event.data.message + "\n";
        }
    });

    window.addEventListener("keydown", event => {
        if (event.shiftKey && event.key.toLowerCase() === "r") {
            event.preventDefault();
            runProject();
        }

        if (event.shiftKey && event.key.toLowerCase() === "c") {
            event.preventDefault();

            document.querySelector(
                '[data-result="generated"]'
            ).click();

            document
                .getElementById("generatedOutput")
                .scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            toast("Generated code opened");
        }
    });
}

function toast(message) {
    const element = document.getElementById("toast");

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        element.classList.remove("show");
    }, 1800);
}
