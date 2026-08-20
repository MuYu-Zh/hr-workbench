/* ============================================================
 * sw.js — Service Worker（PWA 离线缓存 + 更新协作）
 * 缓存名版本化（hr-workbench-v<版本号>）：
 *  - install 时读取 version.json 决定缓存名
 *  - activate 时清理其他版本缓存
 *  - 接收 updater.js 的 SKIP_WAITING 消息，立即接管新版本
 * ============================================================ */
'use strict';

// 发版时同步修改 SW_REV（与 version.json 的版本一起更新）。
// sw.js 内容必须随版本变化，浏览器才会重新安装 Service Worker 并重建缓存，避免旧 JS 残留。
const SW_REV = '1.3.0';

const CACHE_PREFIX = 'hr-workbench-v';
let CACHE_NAME = CACHE_PREFIX + SW_REV;

// Vite 构建产物带 hash，采用运行时缓存策略：
// 预缓存入口与静态壳，其余同源资源在首次访问时写入缓存。
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './version.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

function precacheStatic() {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(STATIC_ASSETS);
  });
}

function precacheManifest() {
  return fetch('./sw-assets.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (list) {
      if (!Array.isArray(list) || !list.length) return;
      return caches.open(CACHE_NAME).then(function (cache) {
        return cache.addAll(list);
      });
    })
    .catch(function () {
      // 开发模式或旧版本没有 sw-assets.json 时忽略，仅缓存基础壳
    });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    fetch('./version.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (v && v.version) CACHE_NAME = CACHE_PREFIX + v.version;
        return precacheStatic();
      })
      .then(function () { return precacheManifest(); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {
        // 读取版本失败：仍尝试用默认名缓存
        return precacheStatic()
          .then(function () { return precacheManifest(); })
          .then(function () { return self.skipWaiting(); });
      })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) {
          return k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME;
        }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* 接收 updater 的 SKIP_WAITING：立即激活新 SW */
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
        }
        return resp;
      }).catch(function () {
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('离线不可用', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
