# 农膜回收补贴审核系统

围绕农膜回收补贴审核搭建的全栈 Web 应用，支持多角色切换、数据库持久化和异常复核机制。

## 快速启动

### 后端服务 (端口 3001)
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### 前端服务 (端口 3000)
```bash
cd frontend
npm install
npm run dev
```

## 测试账号 (密码均为 123456)
- 回收站: recycler1
- 乡镇审核: auditor1
- 财政复核: finance1
- 监管人员: supervisor1

## 验收测试
```bash
cd backend
npx ts-node --transpile-only tests/acceptance.ts
```
