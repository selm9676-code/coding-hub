---
id: variables
title: Variables & Data Types
tier: easy
duration: 20
xp: 100
prerequisites: []
tags: ["basics", "memory"]
---

# Variables

Unlike Python or JavaScript, C++ is **statically typed**: you must
declare a variable's type, and that type can never change.

```cpp
int count = 10;
double price = 19.99;
std::string label = "widget";
bool inStock = true;
```

## Why this matters

The compiler checks types at compile time, before your program ever
runs. This catches a whole category of bugs early, but it also means you
can't reassign a variable to a value of a different type the way you
can in Python.

```cpp
int x = 5;
x = "hello"; // compile error: cannot convert const char* to int
```

## Core types

- `int` — whole numbers
- `double` / `float` — decimal numbers
- `char` — a single character
- `bool` — `true` or `false`
- `std::string` — text (requires `#include <string>`)

Always initialize variables when you declare them. An uninitialized
local variable in C++ contains garbage memory, not a predictable default
like `0` or `None`.
