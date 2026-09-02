window.MoLangLanguage = {
    register(monaco) {
        monaco.languages.register({ id: "molang" });

        monaco.languages.setLanguageConfiguration("molang", {
            comments: {
                lineComment: "//"
            },
            brackets: [
                ["{", "}"],
                ["[", "]"],
                ["(", ")"]
            ],
            autoClosingPairs: [
                { open: "{", close: "}" },
                { open: "[", close: "]" },
                { open: "(", close: ")" },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            surroundingPairs: [
                { open: "(", close: ")" },
                { open: "[", close: "]" },
                { open: "{", close: "}" },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            indentationRules: {
                increaseIndentPattern: /^.*(\.\s*$|:\s*$|\{\s*$|\(\s*$|\[\s*$)/,
                decreaseIndentPattern: /^\s*(elif\b|else\b|except\b|finally\b|[\}\]\)])/
            }
        });

        monaco.languages.setMonarchTokensProvider("molang", {
            defaultToken: "",
            tokenPostfix: ".molang",

            keywords: [
                "page", "style", "script",
                "if", "elif", "else", "while",
                "for", "in", "range",
                "def", "async", "await",
                "try", "except", "finally",
                "return", "break", "continue",
                "True", "False", "None",
                "and", "or", "not",
                "print", "get", "set",
                "create", "append",
                "show", "hide", "remove",
                "focus", "on", "as",
                "add", "class", "to", "from",
                "html", "text", "value", "style"
            ],

            htmlTags: [
                "html", "head", "body", "main", "header", "footer",
                "section", "article", "aside", "nav", "div", "span",
                "h1", "h2", "h3", "h4", "h5", "h6", "p", "a",
                "img", "button", "input", "form", "label",
                "textarea", "select", "option", "ul", "ol", "li",
                "table", "tr", "td", "th", "video", "audio",
                "canvas", "figure", "figcaption", "br", "hr"
            ],

            cssProperties: [
                "color", "background", "background-color",
                "width", "height", "min-width", "max-width",
                "min-height", "max-height", "margin", "padding",
                "display", "position", "top", "right", "bottom", "left",
                "font-size", "font-family", "font-weight", "line-height",
                "border", "border-radius", "box-shadow", "opacity",
                "overflow", "cursor", "flex", "grid", "gap",
                "justify-content", "align-items", "text-align",
                "transition", "transform", "animation"
            ],

            tokenizer: {
                root: [
                    [/\/\/.*$/, "comment"],
                    [/#.*$/, "comment"],
                    [/\b(page|style|script|if|elif|else|while|for|in|range|def|async|await|try|except|finally|return|break|continue|True|False|None|and|or|not|print|get|set|create|append|show|hide|remove|focus|on|as|add|class|to|from|html|text|value|style)\b/, "keyword"],
                    [/\b(html|head|body|main|header|footer|section|article|aside|nav|div|span|h1|h2|h3|h4|h5|h6|p|a|img|button|input|form|label|textarea|select|option|ul|ol|li|table|tr|td|th|video|audio|canvas|figure|figcaption|br|hr)\b/, "type"],
                    [/\b(color|background|background-color|width|height|min-width|max-width|min-height|max-height|margin|padding|display|position|top|right|bottom|left|font-size|font-family|font-weight|line-height|border|border-radius|box-shadow|opacity|overflow|cursor|flex|grid|gap|justify-content|align-items|text-align|transition|transform|animation)(?=\s*:)/, "attribute.name"],
                    [/"([^"\\]|\\.)*$/, "string.invalid"],
                    [/'([^'\\]|\\.)*$/, "string.invalid"],
                    [/"/, "string", "@doubleQuote"],
                    [/'/, "string", "@singleQuote"],
                    [/\b\d+(\.\d+)?\b/, "number"],
                    [/[{}()\[\]]/, "@brackets"],
                    [/[+\-*\/%=!<>]+/, "operator"],
                    [/[a-zA-Z_$][\w$-]*/, "identifier"]
                ],

                doubleQuote: [
                    [/[^\\"]+/, "string"],
                    [/\\./, "string.escape"],
                    [/"/, "string", "@pop"]
                ],

                singleQuote: [
                    [/[^\\']+/, "string"],
                    [/\\./, "string.escape"],
                    [/'/, "string", "@pop"]
                ]
            }
        });

        monaco.editor.defineTheme("molang-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "keyword", foreground: "C586C0", fontStyle: "bold" },
                { token: "type", foreground: "4EC9B0" },
                { token: "string", foreground: "CE9178" },
                { token: "string.escape", foreground: "D7BA7D" },
                { token: "number", foreground: "B5CEA8" },
                { token: "comment", foreground: "6A9955", fontStyle: "italic" },
                { token: "attribute.name", foreground: "9CDCFE" },
                { token: "operator", foreground: "D4D4D4" },
                { token: "identifier", foreground: "DCDCAA" }
            ],
            colors: {
                "editor.background": "#101722",
                "editor.lineHighlightBackground": "#172132",
                "editorLineNumber.foreground": "#526178",
                "editorLineNumber.activeForeground": "#B9C7DA",
                "editor.selectionBackground": "#3D4E70",
                "editorCursor.foreground": "#AEAFAD",
                "editorBracketMatch.background": "#294258",
                "editorBracketMatch.border": "#56B6C2"
            }
        });
    }
};