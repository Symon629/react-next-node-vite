// ── Node globals polyfill ──────────────────────────────────────
// jsdom (the DOM environment Jest uses) doesn't expose Node's
// `TextEncoder` / `TextDecoder` on the global scope. Some deps
// pulled in by Enzyme (cheerio -> undici) reference them at module
// load time, so we MUST polyfill before requiring enzyme.
//
// IMPORTANT: ES `import` statements are hoisted by the compiler
// and run BEFORE any plain code in the module body. That means
// `import Enzyme from 'enzyme'` would execute before our
// `global.TextEncoder = ...` assignment, defeating the polyfill.
// To guarantee execution order we use CommonJS `require(...)`
// for everything that depends on the polyfill — `require` runs
// in source order, not hoisted.
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

// undici (pulled in by cheerio -> enzyme) also touches Web Streams
// and the MessagePort/BroadcastChannel APIs at module load time.
// jsdom doesn't expose them, so we forward Node's built-ins.
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
if (typeof global.ReadableStream === 'undefined') global.ReadableStream = ReadableStream;
if (typeof global.WritableStream === 'undefined') global.WritableStream = WritableStream;
if (typeof global.TransformStream === 'undefined') global.TransformStream = TransformStream;

const { MessagePort, MessageChannel, BroadcastChannel } = require('worker_threads');
if (typeof global.MessagePort === 'undefined') global.MessagePort = MessagePort;
if (typeof global.MessageChannel === 'undefined') global.MessageChannel = MessageChannel;
if (typeof global.BroadcastChannel === 'undefined') global.BroadcastChannel = BroadcastChannel;

// jest-dom adds custom jest matchers for asserting on DOM nodes
// (e.g. expect(element).toHaveTextContent(/react/i)). Safe to
// load via require here too.
require('@testing-library/jest-dom');

// ── Enzyme setup ───────────────────────────────────────────────
// Enzyme needs an "adapter" that knows how to talk to a specific
// React version's internals. This project is on React 19, but we
// use the community React 18 adapter (no React 19 adapter exists);
// some Enzyme features may misbehave on React 19.
const Enzyme = require('enzyme');
const Adapter = require('@cfaester/enzyme-adapter-react-18').default;

// `configure` runs once for the whole test suite (this file is
// loaded automatically by Create React App before any test runs),
// so individual test files can just `import { shallow, mount } from 'enzyme'`.
Enzyme.configure({ adapter: new Adapter() });

