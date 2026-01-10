# 代码审查问题清单

<!-- ## 🔴 高优先级问题

### 1. PanelDragManager 事件监听器未移除
**位置**: `src/ui/panels/panelDrag.ts:114-124`

**问题**: `bindDragEvents()` 使用匿名箭头函数添加事件监听器，`destroy()` 方法只清理了 `ResizeObserver`，没有移除 document 上的事件监听器。

```typescript
// 这些监听器无法被移除，因为没有保存引用
document.addEventListener('mousemove', (e) => this.onDragMove(e));
document.addEventListener('mouseup', () => this.onDragEnd());
document.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: false });
document.addEventListener('touchend', () => this.onDragEnd());
```

**建议**: 保存绑定函数的引用，在 `destroy()` 中移除。

---

### 2. MonsterShooter 子弹未被正确清理
**位置**: `src/monsters/base/monsterShooter.ts:65-86`

**问题**: `MonsterShooter` 持有 `bullys: Set<BulletLike>` 集合，但怪物死亡时（调用父类 `Monster.remove()`）这些子弹未被清理，成为孤儿对象。

**建议**: 覆写 `remove()` 方法清理子弹：
```typescript
remove(): void {
    for (const b of this.bullys) {
        b.remove();
    }
    this.bullys.clear();
    super.remove();
}
``` -->

<!-- ---

### 3. Vector.toTheta() 实现有误
**位置**: `src/core/math/vector.ts:87-93`

**问题**:
- 使用 `Math.atan(x/y)` 而非 `Math.atan2(y, x)` 导致象限问题
- 当 `y === 0` 时会出现除零错误
- 条件判断逻辑无法正确处理所有象限

```typescript
toTheta(): number {
    let alpha = Math.atan(this.x / this.y);  // 错误
    if (this.y < 0) {
        alpha *= -1;
    }
    return alpha;
}
```

**建议**: 使用 `Math.atan2(this.y, this.x)`

---

### 4. Vector.rotate() 方法效率低且依赖错误的 toTheta()
**位置**: `src/core/math/vector.ts:98-106`

**问题**:
- 依赖有问题的 `toTheta()` 方法
- 调用 `this.abs()` 导致额外的 `Math.sqrt()` 计算
- 创建不必要的临时 Vector 对象

**建议**: 使用标准旋转矩阵公式：
```typescript
const cos = Math.cos(a);
const sin = Math.sin(a);
return new Vector(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
``` -->

<!-- ---

### 5. Line.render() 错误使用 closePath()
**位置**: `src/core/math/line.ts:63-71`

**问题**: 对线段调用 `closePath()` 会将终点连回起点，形成闭合路径。对于线段渲染，这个调用是错误的。

```typescript
render(ctx: CanvasRenderingContext2D): void {
    // ...
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.closePath();  // 错误：线段不应该 closePath
    ctx.stroke();
}
```

---

### 6. QuadTree.getIndices() 共享静态缓冲区存在并发风险
**位置**: `src/core/physics/quadTree.ts:84-108`

**问题**: 返回共享的静态数组 `_indicesBuffer`，在 `insert()` 的双重循环中递归调用会覆盖数据。

```typescript
getIndices(obj: QuadTreeObject): number[] {
    const indices = QuadTree._indicesBuffer;
    indices.length = 0;
    // ...
    return indices;  // 返回共享数组
}
```

**建议**: 让调用者传入目标数组，或在需要持久保存时返回副本。 -->

<!-- ---

## 🟡 中优先级问题

### 7. 每帧大量创建临时 Vector/Circle 对象
**位置**: 多处

**问题**:
- `Vector.plus()`, `sub()`, `mul()`, `to1()` 每次返回新对象
- `Bullet.collide()` 每帧每子弹创建新 Circle (`src/bullets/bullet.ts:308-309`)
- `Tower.getViewCircle()` 每次创建新 Circle (`src/towers/base/tower.ts:367`)
- `World.isPositionOnObstacle()` 每次创建新 Circle (`src/game/world.ts:482-488`)

**建议**:
- 添加 in-place 变体方法 (如 `subInPlace()`, `mulInPlace()`)
- 使用静态或实例级缓存的 Circle 对象

---

### 8. Obstacle.intersectsCircle() 不必要的 sqrt
**位置**: `src/core/physics/obstacle.ts:58-63`

**问题**: 使用距离比较时不需要开方。

```typescript
intersectsCircle(circle: Circle): boolean {
    const dx = circle.x - this.pos.x;
    const dy = circle.y - this.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);  // 不必要的 sqrt
    return distance < this.radius + circle.r;
}
```

**建议**: 使用距离平方比较：
```typescript
const distSq = dx * dx + dy * dy;
const radiusSum = this.radius + circle.r;
return distSq < radiusSum * radiusSum;
``` -->
<!-- 
---

### 9. World.goTick() 每帧创建新数组过滤实体
**位置**: `src/game/world.ts:717-743`

**问题**: 每帧创建新数组来过滤存活实体：
```typescript
let tArr: TowerLike[] = [];
for (let t of this.batterys) {
    if (!t.isDead()) tArr.push(t);
}
this.batterys = tArr;
```

**建议**: 使用 in-place 过滤：
```typescript
let writeIdx = 0;
for (let i = 0; i < this.batterys.length; i++) {
    if (!this.batterys[i].isDead()) {
        this.batterys[writeIdx++] = this.batterys[i];
    }
}
this.batterys.length = writeIdx;
```

--- -->

<!-- ### 10. SpatialHashGrid._computeCells() 每次创建 Set
**位置**: `src/core/physics/spatialHashGrid.ts:126-139`

**问题**: 频繁移动的对象会导致大量 Set 对象创建。

**建议**: 复用 Set 对象或使用对象池。

---

### 11. EnergyRenderer 四角重复绘制
**位置**: `src/systems/energy/energyRenderer.ts:21-46`

**问题**: 四个边框的角落区域被绘制了两次，约 10000 像素重复绘制。

**建议**: 重构为不重叠的区域。

---

### 12. Circle.getStyleKey() 缓存失效问题
**位置**: `src/core/math/circle.ts:92-97`

**问题**: `_styleKeyCache` 没有在颜色变化时被清除，可能返回过期的 key。

---

### 13. Vector.rotatePoint() 冗余计算
**位置**: `src/core/math/vector.ts:111-122`

**问题**:
- 每次调用都创建 `cos` 和 `sin` 闭包函数
- `Math.cos(a)` 和 `Math.sin(a)` 各被调用两次

--- -->

### 14. endlessMode.ts 文件过大
**位置**: `src/ui/interfaces/endlessMode.ts`

**问题**: 1300+ 行代码在单个文件中，违反模块化原则。

**建议**: 拆分为独立模块（游戏循环、UI管理、事件处理等）。

---

### 15. FogRenderer 每次视野孔洞创建新渐变
**位置**: `src/systems/fog/fogRenderer.ts:250-265`

**问题**: 每次挖洞都创建新的 `RadialGradient` 对象。

**建议**: 缓存常用半径的渐变或使用简单圆形 + alpha 混合。

---

### 16. TowerLaser.target 可能持有已死亡怪物引用
**位置**: `src/towers/base/towerLaser.ts:74`

**问题**: 虽然 `haveTarget()` 会检查 `isDead()`，但对象本身不会被 GC。

**建议**: 在 `goStep()` 中主动检查并清除失效的 target。

---

## 🟢 低优先级问题

### 17. Circle/Line 冗余坐标存储
**位置**:
- `src/core/math/circle.ts:9-13`
- `src/core/math/line.ts:10-15`

**问题**: 同时存储 Vector 对象和独立 x/y 坐标是冗余的，容易造成不一致。

---

### 18. BulletRegistry 风格不一致
**位置**: `src/bullets/bulletRegistry.ts`

**问题**: 使用对象字面量而不是类，与其他 Registry 风格不一致。

---

### 19. QuadTree.retrieve() 返回类型不一致
**位置**: `src/core/physics/quadTree.ts:142-163`

**问题**: 有时返回数组，有时返回 Set，调用者需要处理两种情况。

---

### 20. Rectangle.render() 冗余的 closePath()
**位置**: `src/core/math/rectangle.ts:36-45`

**问题**: `ctx.rect()` 已经是闭合路径，`closePath()` 是冗余调用。

---

<!-- ### 21. Circle.renderView() 无用的 fillStyle 设置
**位置**: `src/core/math/circle.ts:78-85`

**问题**: 设置 `fillStyle = 'transparent'` 但没有调用 `fill()`，是无用设置。

--- -->

### 22. Monster.move() 中常量未预计算
**位置**: `src/monsters/base/monster.ts:386-392`

**问题**: `Math.log(1 + Math.E)` 是常量，应预计算，避免每帧每怪物都计算。

---

### 23. Bullet.split() 对象创建密集
**位置**: `src/bullets/bullet.ts:407-430`

**问题**: 一次 split 调用可能创建 20+ 个临时 Vector 对象。

<!-- ---

### 24. 存档系统反序列化缺乏验证
**位置**: `src/systems/save/saveManager.ts`

**问题**: 恶意构造的存档文件可能导致问题，缺乏足够验证。

---

### 25. 保存系统可能遗漏 MonsterShooter 的子弹
**位置**: `src/systems/save/saveManager.ts`

**问题**: 序列化怪物时只保存基本属性，不保存 `MonsterShooter.bullys` 集合。

--- -->

## ✅ 已有的良好实践

- Effect 对象池 (`EffectCircle`, `EffectLine`)
- MyColor 字符串缓存 (`_rgbaCache`, `_rgbCache`)
- HP 字符串缓存 (`_hpStr`, `_lastHpInt`)
- 批处理渲染 (`_renderEntitiesBatch`)
- 视口剔除 (`_isObjectVisible`, `_visibleBounds`)
- 空间网格查询 (`monsterGrid`, `bullyGrid`)
- 离屏渲染缓存 (`TerritoryRenderer`, `FogRenderer`, `_staticLayerCache`)
- 脏标记系统 (`_uiDirty`, `_staticLayerDirty`)
