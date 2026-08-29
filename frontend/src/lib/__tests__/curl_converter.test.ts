import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCurlCommand,
  generateFetch,
  generateAxios,
  generatePythonRequests,
  generateGoHttp,
  generateRustReqwest,
} from '../curl_converter.utils.ts';

describe('cURL Parser & Multi-Language Code Generator', () => {
  const sampleCurl = `curl -X POST "https://api.example.com/v1/orders" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer dev_token_123" \\
    -d '{"itemId": "item_99", "quantity": 3}'`;

  it('should accurately parse HTTP method, URL, headers, and request body', () => {
    const parsed = parseCurlCommand(sampleCurl);

    assert.equal(parsed.method, 'POST');
    assert.equal(parsed.url, 'https://api.example.com/v1/orders');
    assert.equal(parsed.headers['Content-Type'], 'application/json');
    assert.equal(parsed.headers['Authorization'], 'Bearer dev_token_123');
    assert.equal(parsed.auth?.type, 'bearer');
    assert.equal(parsed.auth?.token, 'dev_token_123');
    assert.ok(parsed.body?.includes('item_99'));
  });

  it('should generate valid JavaScript Fetch and Axios code', () => {
    const parsed = parseCurlCommand(sampleCurl);
    const fetchCode = generateFetch(parsed);
    const axiosCode = generateAxios(parsed);

    assert.ok(fetchCode.includes('fetch("https://api.example.com/v1/orders"'));
    assert.ok(fetchCode.includes('method: "POST"'));
    assert.ok(fetchCode.includes('JSON.stringify('));

    assert.ok(axiosCode.includes("import axios from 'axios'"));
    assert.ok(axiosCode.includes("method: 'post'"));
    assert.ok(axiosCode.includes("url: 'https://api.example.com/v1/orders'"));
  });

  it('should generate valid Python Requests code', () => {
    const parsed = parseCurlCommand(sampleCurl);
    const pyCode = generatePythonRequests(parsed);

    assert.ok(pyCode.includes('import requests'));
    assert.ok(pyCode.includes('requests.post('));
    assert.ok(pyCode.includes('json=payload'));
  });

  it('should generate valid Go and Rust code snippets', () => {
    const parsed = parseCurlCommand(sampleCurl);
    const goCode = generateGoHttp(parsed);
    const rustCode = generateRustReqwest(parsed);

    assert.ok(goCode.includes('package main'));
    assert.ok(goCode.includes('http.NewRequest("POST"'));
    assert.ok(goCode.includes('req.Header.Add('));

    assert.ok(rustCode.includes('use reqwest::header::HeaderMap;'));
    assert.ok(rustCode.includes('client.post("https://api.example.com/v1/orders")'));
  });
});
