# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Cyber Buddha 项目规范

## 项目概述

赛博佛祖 - 基于 x402 协议的链上上香许愿应用

## V2 重构计划

### 目标
- 部署到 Cloudflare Workers
- TypeScript 优先
- 代码优雅、简洁、有设计思维

### 技术栈
- **运行时**: Cloudflare Workers
- **语言**: TypeScript (前后端统一)
- **后端框架**: Hono (Cloudflare Workers 友好)
- **支付**: x402-hono 中间件
- **前端**: 纯 TypeScript + HTML，无框架，极简极客风格

### 分支策略
- `main`: 当前 Python + FastAPI 版本
- `v2`: TypeScript + Cloudflare Workers 重构版本

## 代码风格与工程要求

### 核心原则
- **优雅简洁**: 代码即文档，命名清晰，逻辑直观
- **类型安全**: 严格 TypeScript，零 any，充分利用类型推导
- **模块化**: 单一职责，高内聚低耦合
- **可测试**: 纯函数优先，依赖注入，便于单元测试

### 架构思维
- 分层清晰: 路由 → 业务逻辑 → 数据/外部服务
- 配置与代码分离
- 错误处理统一，用户友好的错误信息
- 日志规范，便于调试和监控

### 开发者视角
- 以高级工程师标准审视每一行代码
- 不仅仅是"能跑"，而是"优雅地跑"
- 考虑边界情况、安全性、可维护性
- 代码评审友好，PR 可读性高

## 参考资源

### x402 协议
- 官方文档: https://x402.gitbook.io/x402
- GitHub: https://github.com/coinbase/x402
- NPM 包: `x402-hono`, `@coinbase/x402`

### Cloudflare Workers
- 文档: https://developers.cloudflare.com/workers/
- TypeScript 示例: https://developers.cloudflare.com/workers/examples/?languages=TypeScript
- Hono 框架: https://hono.dev/

### Cloudflare x402 集成
- Cloudflare x402 文档: https://developers.cloudflare.com/agents/x402/
- Cloudflare x402 博客: https://blog.cloudflare.com/x402/

### Facilitator
- **PayAI** (主网+测试网，无需认证): https://facilitator.payai.network
- ~~x402.org~~ (不再需要，PayAI 已覆盖所有网络)

## 多链支持要求

### 目标
支持所有 PayAI Facilitator 兼容的链和代币，不限于 Base 链

### 支持的网络

| 网络 | 主网 | 测试网 |
|------|------|--------|
| Base | base | base-sepolia |
| Polygon | polygon | polygon-amoy |
| Avalanche | avalanche | avalanche-fuji |
| Solana | solana | solana-devnet |
| Sei | sei | sei-testnet |
| IoTeX | iotex | - |
| Peaq | peaq | - |
| XLayer | xlayer | xlayer-testnet |

### 代币支持
- EVM 链: 任何实现 EIP-3009 的 ERC-20 代币 (主要是 USDC)
- Solana: 所有 SPL 代币和 Token 2022 代币

### 实现要求
- 用户可选择网络
- 前端自动切换钱包网络
- 后端根据配置动态支持多链

## 当前状态

### V1 (main 分支)
- [x] Python + FastAPI 后端
- [x] x402 支付中间件
- [x] Base 主网支持 (PayAI facilitator)
- [x] 部署到 Render
- [x] ASCII 佛祖前端

### V2 (待开发)
- [ ] TypeScript 重写 (前后端统一)
- [ ] Cloudflare Workers 部署
- [ ] Hono + x402-hono 集成
- [ ] 多链支持 (所有 PayAI 支持的链)
- [ ] 用户自定义金额
- [ ] 多语言支持 (中文 / English)

### 未来可选功能
- [ ] 许愿记录 (Cloudflare KV/D1)
- [ ] 主题切换 (绿色/琥珀色/赛博粉)
- [ ] 分享功能 (生成许愿卡片)
- [ ] 支付成功动效 (ASCII 烟雾)
- [ ] 移动端钱包支持 (WalletConnect)
- [ ] 统计面板
