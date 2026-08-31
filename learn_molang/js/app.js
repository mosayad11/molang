function escapeHTML(value){return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

function token(text, cls){return '<span class="'+cls+'">'+text+'</span>';}

function highlightPage(line){
    let indent=line.match(/^\s*/)[0], rest=line.slice(indent.length);
    if(/^page\.?$/i.test(rest)) return escapeHTML(indent)+token(escapeHTML(rest),"tok-key");
    if(rest.startsWith("//")) return escapeHTML(indent)+token(escapeHTML(rest),"tok-comment");
    const m=rest.match(/^([\w:-]+)(.*)$/);
    if(!m) return escapeHTML(line);
    let out=escapeHTML(indent)+token(escapeHTML(m[1]),"tok-tag");
    let tail=m[2]||"", pos=0, attr=/\s+([\w:-]+)(?:=("[^"]*"|'[^']*'|[^\s.]+))?/g, match;
    while((match=attr.exec(tail))){
        out+=escapeHTML(tail.slice(pos,match.index));
        out+=token(escapeHTML(match[1]),"tok-attr");
        if(match[2]) out+=token("=","tok-op")+token(escapeHTML(match[2]),"tok-string");
        pos=attr.lastIndex;
    }
    out+=escapeHTML(tail.slice(pos));
    let dotIndex=out.indexOf(".");
    if(dotIndex>=0) out=out.slice(0,dotIndex)+token(".","tok-dot")+out.slice(dotIndex+1);
    return out;
}

function highlightStyle(line){
    const safe=escapeHTML(line), trimmed=safe.trim();
    if(/^style\.?$/i.test(trimmed)) return safe.replace(/style\.?/i,m=>token(m,"tok-key"));
    if(trimmed.startsWith("//")||trimmed.startsWith("/*")) return token(safe,"tok-comment");
    let colon=safe.match(/^(\s*)((?:--)?[a-zA-Z-]+)(\s*:)(.*)$/);
    if(colon){
        let value=colon[4].replace(/(&quot;.*?&quot;|".*?"|'.*?')/g,m=>token(m,"tok-string"));
        value=value.replace(/(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw|fr|s|ms|deg)?/g,(m,n,u)=>token(n,"tok-number")+(u?token(u,"tok-unit"):""));
        return colon[1]+token(colon[2],"tok-property")+colon[3]+value;
    }
    return safe.replace(/(\.)$/,""+token(".","tok-dot")).replace(/^(\s*)(.*?)(?=<span|$)/,(m,a,b)=>a+token(b,"tok-selector"));
}

function highlightScript(line){
    let safe=escapeHTML(line), trim=safe.trim();
    if(/^script\.?$/i.test(trim)) return safe.replace(/script\.?/i,m=>token(m,"tok-key"));
    if(trim.startsWith("#")||trim.startsWith("//")) return token(safe,"tok-comment");
    safe=safe.replace(/(&quot;.*?&quot;|".*?"|'.*?')/g,m=>token(m,"tok-string"));
    safe=safe.replace(/\b(True|False|None)\b/g,m=>token(m,"tok-bool"));
    safe=safe.replace(/\b(if|elif|else|while|for|in|range|def|async|try|except|finally|return|break|continue|await)\b/g,m=>token(m,"tok-key"));
    safe=safe.replace(/\b(print|get|set|add|remove|toggle|show|hide|create|append|focus|len|str|int|float)\b/g,m=>token(m,"tok-function"));
    safe=safe.replace(/\b\d+(?:\.\d+)?\b/g,m=>token(m,"tok-number"));
    return safe;
}

function highlightBlock(pre){
    const lang=pre.dataset.lang||"script";
    const source=pre.textContent.replace(/\r/g,"");
    const fn=lang==="page"?highlightPage:lang==="style"?highlightStyle:highlightScript;
    pre.innerHTML=source.split("\n").map(line=>'<span class="code-line">'+fn(line)+'</span>').join("");
}

document.querySelectorAll("pre[data-lang]").forEach(highlightBlock);

const menu=document.getElementById("mobileMenu"), sidebar=document.getElementById("sidebar");
if(menu) menu.addEventListener("click",()=>sidebar.classList.toggle("open"));

const links=[...document.querySelectorAll(".nav")];
links.forEach(a=>a.addEventListener("click",()=>{links.forEach(x=>x.classList.remove("active"));a.classList.add("active");sidebar.classList.remove("open");}));