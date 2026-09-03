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

    if (selector === "window") {
        return "window";
    }

    if (selector === "document") {
        return "document";
    }

    return `__molangResolve(${selector})`;

}

function compileScript(input) {
    const output = [];
    const stack = [];
    const declared = new Set();

    output.push(
        `function __molangResolve(value) { return typeof value === "string" ? document.querySelector(value) : value; }`
    );
    function closeBlocks(indent) {
        while (
            stack.length &&
            indent <= stack[stack.length - 1].indent
        ) {
            const block = stack.pop();

            if (block.type === "event") {
                output.push("});");
            } else if (block.type === "async") {
                output.push("})();");
            } else if (block.type === "native") {
                // Native JavaScript blocks manage their own braces.
            } else {
                output.push("}");
            }
        }
    }

    function closeAllBlocks() {
        while (stack.length) {
            const block = stack.pop();

            if (block.type === "event") {
                output.push("});");
            } else if (block.type === "async") {
                output.push("})();");
            } else if (block.type === "native") {
                // Native JavaScript owns its own closing brace.
            } else {
                output.push("}");
            }
        }
    }

    function camelCaseCssProperty(property) {
        return property.replace(/-([a-z])/g, (_, letter) =>
            letter.toUpperCase()
        );
    }

    function replaceContinuationBlock(indent, type) {
        if (
            stack.length &&
            stack[stack.length - 1].indent === indent &&
            stack[stack.length - 1].type !== "native"
        ) {
            stack.pop();
        }

        if (type === "elif") {
            return "else if";
        }

        if (type === "else") {
            return "else";
        }

        return type;
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

        if (
            line.startsWith("//") ||
            line.startsWith("/*") ||
            line.startsWith("*")
        ) {
            output.push(line);
            continue;
        }

        if (/^(}\s*;?|}\s*\)\s*;?|}\s*\]\s*;?)$/.test(line)) {
            if (
                stack.length &&
                stack[stack.length - 1].type === "native"
            ) {
                stack.pop();
            }

            output.push(line);
            continue;
        }

        let match;

        match = line.match(/^elif\s+(.+?)\s*:?\s*$/);
        if (match) {
            const keyword = replaceContinuationBlock(indent, "elif");

            output.push(
                `${keyword} (${transformExpression(match[1])}) {`
            );

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        match = line.match(/^else\s*:?\s*$/);
        if (match) {
            const keyword = replaceContinuationBlock(indent, "else");

            output.push(`${keyword} {`);

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        match = line.match(/^except(?:\s+(\w+))?\s*:?\s*$/);
        if (match) {
            replaceContinuationBlock(indent, "except");

            const errorName = match[1] || "error";

            output.push(`catch (${errorName}) {`);

            stack.push({
                indent,
                type: "block"
            });

            declared.add(errorName);

            continue;
        }

        match = line.match(/^finally\s*:?\s*$/);
        if (match) {
            replaceContinuationBlock(indent, "finally");

            output.push("finally {");

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        closeBlocks(indent);

        if (line.endsWith("{")) {
            output.push(line);

            stack.push({
                indent,
                type: "native"
            });

            continue;
        }

        match = line.match(
            /^on\s+(.+?)\s+([a-zA-Z][\w-]*)(?:\s+as\s+(\w+))?\s*:?\s*$/
        );

        if (match) {
            const callback = match[3]
                ? `(${match[3]}) => {`
                : "() => {";

            output.push(
                `${selectorExpression(match[1])}.addEventListener("${match[2]}", ${callback}`
            );

            stack.push({
                indent,
                type: "event"
            });

            continue;
        }

        match = line.match(/^if\s+(.+?)\s*:?\s*$/);
        if (match) {
            output.push(
                `if (${transformExpression(match[1])}) {`
            );

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        match = line.match(/^while\s+(.+?)\s*:?\s*$/);
        if (match) {
            output.push(
                `while (${transformExpression(match[1])}) {`
            );

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        match = line.match(
            /^async\s+def\s+(\w+)\s*\((.*?)\)\s*:?\s*$/
        );

        if (match) {
            output.push(
                `async function ${match[1]}(${match[2]}) {`
            );

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        match = line.match(
            /^def\s+(\w+)\s*\((.*?)\)\s*:?\s*$/
        );

        if (match) {
            output.push(
                `function ${match[1]}(${match[2]}) {`
            );

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        match = line.match(/^async\s*:?\s*$/);
        if (match) {
            output.push("(async () => {");

            stack.push({
                indent,
                type: "async"
            });

            continue;
        }

        match = line.match(
            /^for\s+(\w+)\s+in\s+range\s*\((.*?)\)\s*:?\s*$/
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

            const variable = match[1];

            output.push(
                `for (let ${variable} = ${start}; ${step} < 0 ? ${variable} > ${end} : ${variable} < ${end}; ${variable} += ${step}) {`
            );

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        match = line.match(
            /^for\s+(\w+)\s+in\s+(.+?)\s*:?\s*$/
        );

        if (match) {
            output.push(
                `for (const ${match[1]} of ${transformExpression(match[2])}) {`
            );

            stack.push({
                indent,
                type: "block"
            });

            continue;
        }

        match = line.match(/^try\s*:?\s*$/);
        if (match) {
            output.push("try {");

            stack.push({
                indent,
                type: "try"
            });

            continue;
        }

        match = line.match(/^(\w+)\s*=\s*get\s+(.+)$/);

        if (match) {
            const variable = match[1];
            const prefix = declared.has(variable) ? "" : "let ";

            declared.add(variable);

            output.push(
                `${prefix}${variable} = ${selectorExpression(match[2])};`
            );

            continue;
        }

        match = line.match(
            /^set\s+(.+?)\s+style\s+([a-zA-Z-]+)\s+to\s+(.+?)\s*;?$/
        );

        if (match) {
            const property = camelCaseCssProperty(match[2]);

            output.push(
                `${selectorExpression(match[1])}.style.${property} = ${transformExpression(match[3])};`
            );

            continue;
        }

        match = line.match(
            /^set\s+(.+?)\s+html\s+to\s+(.+?)\s*;?$/
        );

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.innerHTML = ${transformExpression(match[2])};`
            );

            continue;
        }

        match = line.match(
            /^set\s+(.+?)\s+text\s+to\s+(.+?)\s*;?$/
        );

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.textContent = ${transformExpression(match[2])};`
            );

            continue;
        }

        match = line.match(
            /^set\s+(.+?)\s+value\s+to\s+(.+?)\s*;?$/
        );

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.value = ${transformExpression(match[2])};`
            );

            continue;
        }

        match = line.match(
            /^add\s+class\s+(.+?)\s+to\s+(.+?)\s*;?$/
        );

        if (match) {
            output.push(
                `${selectorExpression(match[2])}.classList.add(${transformExpression(match[1])});`
            );

            continue;
        }

        match = line.match(
            /^remove\s+class\s+(.+?)\s+from\s+(.+?)\s*;?$/
        );

        if (match) {
            output.push(
                `${selectorExpression(match[2])}.classList.remove(${transformExpression(match[1])});`
            );

            continue;
        }

        match = line.match(
            /^toggle\s+class\s+(.+?)\s+on\s+(.+?)\s*;?$/
        );

        if (match) {
            output.push(
                `${selectorExpression(match[2])}.classList.toggle(${transformExpression(match[1])});`
            );

            continue;
        }

        match = line.match(/^show\s+(.+?)\s*;?$/);

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.style.display = "";`
            );

            continue;
        }

        match = line.match(/^hide\s+(.+?)\s*;?$/);

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.style.display = "none";`
            );

            continue;
        }

        match = line.match(/^remove\s+(.+?)\s*;?$/);

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.remove();`
            );

            continue;
        }

        match = line.match(/^focus\s+(.+?)\s*;?$/);

        if (match) {
            output.push(
                `${selectorExpression(match[1])}.focus();`
            );

            continue;
        }

        match = line.match(
            /^create\s+([a-zA-Z][\w:-]*)\s+as\s+(\w+)\s*;?$/
        );

        if (match) {
            const variable = match[2];
            const prefix = declared.has(variable) ? "" : "let ";

            declared.add(variable);

            output.push(
                `${prefix}${variable} = document.createElement("${match[1]}");`
            );

            continue;
        }

        match = line.match(
            /^append\s+(\w+)\s+to\s+(.+?)\s*;?$/
        );

        if (match) {
            output.push(
                `${selectorExpression(match[2])}.appendChild(${match[1]});`
            );

            continue;
        }

        match = line.match(/^print\s*\((.*)\)\s*;?$/);

        if (match) {
            output.push(
                `console.log(${transformExpression(match[1])});`
            );

            continue;
        }

        match = line.match(/^print\s+(.+?)\s*;?$/);

        if (match) {
            output.push(
                `console.log(${transformExpression(match[1])});`
            );

            continue;
        }

        match = line.match(/^return(?:\s+(.+?))?\s*;?$/);

        if (match) {
            output.push(
                match[1]
                    ? `return ${transformExpression(match[1])};`
                    : "return;"
            );

            continue;
        }

        if (/^break\s*;?$/.test(line)) {
            output.push("break;");
            continue;
        }

        if (/^continue\s*;?$/.test(line)) {
            output.push("continue;");
            continue;
        }

        match = line.match(/^await\s+(.+?)\s*;?$/);

        if (match) {
            output.push(
                `await ${transformExpression(match[1])};`
            );

            continue;
        }

        match = line.match(
            /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(\+=|-=|\*=|\/=|%=)\s*(.+?)\s*;?$/
        );

        if (match) {
            output.push(
                `${match[1]} ${match[2]} ${transformExpression(match[3])};`
            );

            continue;
        }

        match = line.match(
            /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(\+\+|--)\s*;?$/
        );

        if (match) {
            output.push(
                `${match[1]}${match[2]};`
            );

            continue;
        }

        match = line.match(
            /^([A-Za-z_$][\w$]*)\s*=\s*(.+?)\s*;?$/
        );

        if (match) {
            const variable = match[1];
            const prefix = declared.has(variable) ? "" : "let ";

            declared.add(variable);

            output.push(
                `${prefix}${variable} = ${transformExpression(match[2])};`
            );

            continue;
        }

        output.push(line);
    }

    closeAllBlocks();

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
