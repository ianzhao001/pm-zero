// Data-only parser. Legacy JS object literals remain readable, but are never executed.
export function parseTagAttributes(tag) {
  const start=/^<\/?[A-Za-z][\w:-]*/.exec(tag);if(!start)throw new Error('Invalid HTML tag');
  let i=start[0].length;const attrs=Object.create(null);
  while(i<tag.length){
    while(/[\t\n\f\r ]/.test(tag[i]??'')&&i<tag.length)i++;
    if(tag[i]==='>'||(tag[i]==='/'&&tag[i+1]==='>'))break;
    const match=/^[^\t\n\f\r />=]+/.exec(tag.slice(i));if(!match)throw new Error('Malformed HTML attribute');
    const name=match[0].toLowerCase();i+=match[0].length;if(Object.hasOwn(attrs,name))throw new Error(`Duplicate HTML attribute: ${name}`);
    while(/[\t\n\f\r ]/.test(tag[i]??'')&&i<tag.length)i++;
    let value='';if(tag[i]==='='){
      i++;while(/[\t\n\f\r ]/.test(tag[i]??'')&&i<tag.length)i++;
      const quote=tag[i];if(quote==='"'||quote==="'"){i++;const end=tag.indexOf(quote,i);if(end<0)throw new Error('Unclosed HTML attribute');value=tag.slice(i,end);i=end+1;}
      else{const m=/^[^\t\n\f\r >]+/.exec(tag.slice(i));if(!m)throw new Error('Missing attribute value');value=m[0];i+=value.length;}
    }
    // Generated paths/ids have no entities. Refuse ambiguous browser decoding,
    // rather than checking a different literal filename than the browser sees.
    if(['src','data-asset-id','id','type','data-brand'].includes(name)&&value.includes('&'))throw new Error(`Entity-encoded ${name} is not supported`);
    attrs[name]=value;
  }
  return attrs;
}

export function parseAssetLiteral(source) {
  let i = 0;
  const white = () => { while (/\s/.test(source[i] ?? '') && i < source.length) i++; };
  const fail = () => { throw new Error(`Asset manifest must contain data only (offset ${i})`); };
  function string() {
    const quote = source[i++]; let value = '';
    while (i < source.length) {
      const c = source[i++];
      if (c === quote) return value;
      if (c === '\\') {
        const e = source[i++];
        if (e === 'u') { const hex=source.slice(i,i+4);if(!/^[0-9a-f]{4}$/i.test(hex))fail();value+=String.fromCharCode(parseInt(hex,16));i+=4; }
        else if ('\\\"\'/'.includes(e)) value += e;
        else if ({n:1,r:1,t:1,b:1,f:1}[e]) value += ({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'})[e];
        else fail();
      } else if (c.charCodeAt(0)<32) fail(); else value+=c;
    }
    fail();
  }
  function value(depth=0) {
    if(depth>32)fail();white();const c=source[i];
    if(c==='"'||c==="'")return string();
    if(c==='['||c==='{') {
      const array=c==='[';const out=array?[]:Object.create(null);const end=array?']':'}';i++;white();
      while(source[i]!==end) {
        if(i>=source.length)fail();
        if(array)out.push(value(depth+1));
        else {
          white();let key;
          if(source[i]==='"'||source[i]==="'")key=string();else{const m=/^[A-Za-z_$][\w$]*/.exec(source.slice(i));if(!m)fail();key=m[0];i+=key.length;}
          if(['__proto__','constructor','prototype'].includes(key)||Object.hasOwn(out,key))fail();
          white();if(source[i++]!==':')fail();out[key]=value(depth+1);
        }
        white();if(source[i]===end)break;if(source[i++]!==',')fail();white();
      }
      i++;return out;
    }
    const primitive=/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(source.slice(i));
    if(!primitive)fail();i+=primitive[0].length;return JSON.parse(primitive[0]);
  }
  const result=value();white();if(source[i]===';')i++;white();if(i!==source.length)fail();return result;
}

export function extractAssetManifest(html) {
  const dataScripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(m=>parseTagAttributes('<script'+m[1]+'>').id==='asset-manifest');
  if(dataScripts.length>1)throw new Error('Duplicate asset-manifest data blocks');
  if(dataScripts.length) {
    if(parseTagAttributes('<script'+dataScripts[0][1]+'>').type!=='application/json')throw new Error('Asset manifest block must be JSON');
    const result=JSON.parse(dataScripts[0][2]);if(!Array.isArray(result))throw new Error('Asset manifest must be an array');return result;
  }
  const assignment=/window\.ASSET_MANIFEST\s*=\s*/g;const hits=[...html.matchAll(assignment)];
  if(hits.length!==1)throw new Error('One asset manifest is required');
  const start=hits[0].index+hits[0][0].length;let depth=0,quote=null,escape=false,end=-1;
  for(let i=start;i<html.length;i++) {
    const c=html[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='[')depth++;else if(c===']'&&--depth===0){end=i+1;break;}
  }
  if(end<0)throw new Error('Unclosed asset manifest');
  const result=parseAssetLiteral(html.slice(start,end));if(!Array.isArray(result))throw new Error('Asset manifest must be an array');return result;
}
