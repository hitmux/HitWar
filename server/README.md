# Cannon War Multiplayer Server

Colyseus 游戏服务器，用于 Cannon War 多人对战模式。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 配置

服务器支持以下环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 2567 | 服务器端口 |
| `HOST` | 0.0.0.0 | 监听地址 |
| `NODE_ENV` | development | 运行环境 |

## 项目结构

```
server/
├── src/
│   ├── index.ts           # 服务器入口
│   ├── config.ts          # 配置常量
│   ├── rooms/             # 房间实现
│   │   ├── GameRoom.ts    # 游戏房间
│   │   └── LobbyRoom.ts   # 大厅房间
│   ├── schema/            # Colyseus 状态定义
│   │   ├── GameState.ts   # 游戏状态
│   │   ├── PlayerState.ts # 玩家状态
│   │   └── ...
│   └── shared/            # 共享代码
│       └── types/         # 消息类型
├── package.json
└── tsconfig.json
```

## 开发

开发模式下，访问 `http://localhost:2567/colyseus` 可查看 Colyseus Monitor。

## API

### Rooms

- `lobby` - 大厅房间，用于匹配和房间列表
- `game` - 游戏房间，实际对战逻辑

### Messages

详见 `src/shared/types/messages.ts`
