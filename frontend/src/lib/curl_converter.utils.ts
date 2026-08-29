export interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  auth?: {
    type: 'basic' | 'bearer';
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Parses raw cURL command into structured HTTP request components.
 */
export function parseCurlCommand(rawCurl: string): ParsedCurl {
  const clean = rawCurl
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let method = 'GET';
  let url = '';
  const headers: Record<string, string> = {};
  let body: string | undefined;
  let auth: ParsedCurl['auth'];

  // Tokenize preserving quotes
  const tokens: string[] = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(clean)) !== null) {
    if (match[1] !== undefined) tokens.push(match[1]);
    else if (match[2] !== undefined) tokens.push(match[2]);
    else tokens.push(match[0]);
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === 'curl') continue;

    // HTTP Method
    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        method = tokens[++i].toUpperCase();
      }
      continue;
    }

    // Headers
    if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[++i];
        const separatorIdx = headerStr.indexOf(':');
        if (separatorIdx > 0) {
          const key = headerStr.slice(0, separatorIdx).trim();
          const val = headerStr.slice(separatorIdx + 1).trim();
          headers[key] = val;

          if (key.toLowerCase() === 'authorization' && val.toLowerCase().startsWith('bearer ')) {
            auth = { type: 'bearer', token: val.slice(7).trim() };
          }
        }
      }
      continue;
    }

    // Data / Body
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-urlencode'
    ) {
      if (i + 1 < tokens.length) {
        body = tokens[++i];
        if (method === 'GET') method = 'POST';
      }
      continue;
    }

    // Basic Auth
    if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        const userPass = tokens[++i];
        const [username, password] = userPass.split(':');
        auth = { type: 'basic', username, password: password || '' };
      }
      continue;
    }

    // Target URL
    if (token.startsWith('http://') || token.startsWith('https://')) {
      url = token;
    } else if (!url && !token.startsWith('-') && token !== 'curl') {
      if (token.includes('.') || token.startsWith('localhost') || token.startsWith('/')) {
        url = token.startsWith('http') ? token : `https://${token}`;
      }
    }
  }

  return {
    method,
    url: url || 'https://api.example.com/v1/resource',
    headers,
    body,
    auth,
  };
}

/**
 * Generates JavaScript Fetch code snippet.
 */
export function generateFetch(parsed: ParsedCurl): string {
  const options: Record<string, any> = {
    method: parsed.method,
  };

  if (Object.keys(parsed.headers).length > 0) {
    options.headers = parsed.headers;
  }

  if (parsed.body) {
    try {
      options.body = JSON.parse(parsed.body);
    } catch {
      options.body = parsed.body;
    }
  }

  let code = `fetch("${parsed.url}", {\n`;
  code += `  method: "${parsed.method}",\n`;

  if (Object.keys(parsed.headers).length > 0) {
    code += `  headers: ${JSON.stringify(parsed.headers, null, 4).replace(/\n/g, '\n  ')},\n`;
  }

  if (parsed.body) {
    try {
      JSON.parse(parsed.body);
      code += `  body: JSON.stringify(${parsed.body.trim()}),\n`;
    } catch {
      code += `  body: ${JSON.stringify(parsed.body)},\n`;
    }
  }

  code += `})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error('Error:', error));`;
  return code;
}

/**
 * Generates JavaScript Axios code snippet.
 */
export function generateAxios(parsed: ParsedCurl): string {
  let code = `import axios from 'axios';\n\n`;
  code += `const config = {\n`;
  code += `  method: '${parsed.method.toLowerCase()}',\n`;
  code += `  url: '${parsed.url}',\n`;

  if (Object.keys(parsed.headers).length > 0) {
    code += `  headers: ${JSON.stringify(parsed.headers, null, 4).replace(/\n/g, '\n  ')},\n`;
  }

  if (parsed.body) {
    try {
      JSON.parse(parsed.body);
      code += `  data: ${parsed.body.trim()},\n`;
    } catch {
      code += `  data: ${JSON.stringify(parsed.body)},\n`;
    }
  }

  code += `};\n\n`;
  code += `axios(config)\n  .then(response => console.log(response.data))\n  .catch(error => console.error(error));`;
  return code;
}

/**
 * Generates Python Requests code snippet.
 */
export function generatePythonRequests(parsed: ParsedCurl): string {
  let code = `import requests\n\n`;
  code += `url = "${parsed.url}"\n`;

  if (Object.keys(parsed.headers).length > 0) {
    code += `headers = {\n`;
    for (const [k, v] of Object.entries(parsed.headers)) {
      code += `    "${k}": "${v}",\n`;
    }
    code += `}\n`;
  }

  if (parsed.body) {
    try {
      JSON.parse(parsed.body);
      code += `payload = ${parsed.body.trim().replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')}\n`;
    } catch {
      code += `payload = """${parsed.body}"""\n`;
    }
  }

  const methodFunc = parsed.method.toLowerCase();
  const args = [`url`];
  if (Object.keys(parsed.headers).length > 0) args.push(`headers=headers`);
  if (parsed.body) {
    try {
      JSON.parse(parsed.body);
      args.push(`json=payload`);
    } catch {
      args.push(`data=payload`);
    }
  }

  code += `\nresponse = requests.${methodFunc}(${args.join(', ')})\n`;
  code += `print(response.status_code)\nprint(response.json())`;
  return code;
}

/**
 * Generates Go net/http code snippet.
 */
export function generateGoHttp(parsed: ParsedCurl): string {
  let code = `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"\n`;
  if (parsed.body) code += `\t"strings"\n`;
  code += `)\n\nfunc main() {\n`;
  code += `\turl := "${parsed.url}"\n`;

  if (parsed.body) {
    code += `\tpayload := strings.NewReader(\`${parsed.body}\`)\n`;
    code += `\treq, err := http.NewRequest("${parsed.method}", url, payload)\n`;
  } else {
    code += `\treq, err := http.NewRequest("${parsed.method}", url, nil)\n`;
  }

  code += `\tif err != nil {\n\t\tpanic(err)\n\t}\n\n`;

  for (const [k, v] of Object.entries(parsed.headers)) {
    code += `\treq.Header.Add("${k}", "${v}")\n`;
  }

  code += `\n\tres, err := http.DefaultClient.Do(req)\n`;
  code += `\tif err != nil {\n\t\tpanic(err)\n\t}\n`;
  code += `\tdefer res.Body.Close()\n\n`;
  code += `\tbody, _ := io.ReadAll(res.Body)\n`;
  code += `\tfmt.Println(res.Status)\n`;
  code += `\tfmt.Println(string(body))\n}`;
  return code;
}

/**
 * Generates Rust Reqwest code snippet.
 */
export function generateRustReqwest(parsed: ParsedCurl): string {
  let code = `use reqwest::header::HeaderMap;\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n`;
  code += `    let client = reqwest::Client::new();\n`;
  code += `    let mut headers = HeaderMap::new();\n`;

  for (const [k, v] of Object.entries(parsed.headers)) {
    code += `    headers.insert("${k}", "${v}".parse()?);\n`;
  }

  code += `\n    let response = client.${parsed.method.toLowerCase()}("${parsed.url}")\n`;
  code += `        .headers(headers)\n`;

  if (parsed.body) {
    try {
      JSON.parse(parsed.body);
      code += `        .body(r#"${parsed.body}"#)\n`;
    } catch {
      code += `        .body("${parsed.body}")\n`;
    }
  }

  code += `        .send()\n        .await?;\n\n`;
  code += `    println!("Status: {}", response.status());\n`;
  code += `    println!("Body: {}", response.text().await?);\n`;
  code += `    Ok(())\n}`;
  return code;
}
