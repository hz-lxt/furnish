import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pages = ["index.html", "src/index.html", "src/timeline.html"];
const failures = [];

for (const page of pages) {
  const path = resolve(root, page);
  if (!existsSync(path)) {
    failures.push(`${page}: 文件不存在`);
    continue;
  }

  const html = readFileSync(path, "utf8");
  if (!/<title>.+?<\/title>/s.test(html)) failures.push(`${page}: 缺少标题`);
  if (!/<meta\s+name=["']viewport["']/i.test(html)) failures.push(`${page}: 缺少 viewport`);

  for (const match of html.matchAll(/(?:href|src)=["']([^"'#]+)["']/gi)) {
    const reference = match[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(reference)) continue;
    if (!existsSync(resolve(dirname(path), reference))) {
      failures.push(`${page}: 本地链接不存在 (${reference})`);
    }
  }

  for (const [index, match] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries()) {
    try {
      new Function(match[1]);
    } catch (error) {
      failures.push(`${page}: 第 ${index + 1} 段脚本语法错误 (${error.message})`);
    }
  }
}

const redirect = readFileSync(resolve(root, "index.html"), "utf8");
if (!redirect.includes("url=src/index.html")) failures.push("index.html: 未跳转到预算表入口");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`检查通过：${pages.length} 个页面、内部链接和内联脚本均正常。`);
