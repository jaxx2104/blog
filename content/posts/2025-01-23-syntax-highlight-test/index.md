---
title: シンタックスハイライトのテスト投稿
created_at: "2025-01-23T00:00:00+00:00"
updated_at: "2025-01-23T00:00:00+00:00"
path: /2025-01-23-syntax-highlight-test
category: 開発
tags:
  - テスト
  - シンタックスハイライト
---

この投稿はシンタックスハイライト機能のテスト用です。

## JavaScript

```js
// コメント
function calculateSum(numbers) {
  return numbers.reduce((sum, num) => sum + num, 0);
}

const data = [1, 2, 3, 4, 5];
const result = calculateSum(data);
console.log(`合計: ${result}`);
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  findUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
```

## React (JSX)

```jsx
import React, { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};

export default Counter;
```

## CSS

```css
/* カスタムテーマ */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f5f5;
}

.highlight {
  background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
  padding: 0.2em 0.4em;
  border-radius: 3px;
}
```

## インラインコード
通常のテキストの中に `const variable = "value"` のようなコードを含められます。

## Bash

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## JSON

```json
{
  "name": "blog",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}
```