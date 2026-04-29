---
title: Overview
---

# Overview

WORDS describes software systems the way engineers explain them — in terms of what a system **is doing**, what **triggers a change**, and what **happens next**. It is not a programming language and not a diagram notation. It is a specification language: a precise way to write down behavior before any implementation decision is made.

This page gives you a working mental model of WORDS before you dive into each construct in detail.

## The Core Idea

Every system, at some level of abstraction, can be described as a machine that moves between conditions. The system is waiting for input. It receives something. It transitions. It produces an output. It waits again.

WORDS makes this structure explicit and consistent across the entire system. A `system` names the top-level product and declares which modules compose it. A module groups a functionality. A process maps out its transitions. A state represents one condition in that process. A context is the data that travels between states. Components — screens, views, providers, adapters, interfaces — are the pieces closest to implementation that interact with the world and with each other.

Nothing in a WORDS specification is implicit. If a state can produce two different outputs, both are declared. If a module needs to react to an event in another module, that contract is written down. If a component interacts with the external medium - like making a request, reading a sensor value etc. - it is an adapter — the only construct in the language permitted to do so.

This explicitness is what makes WORDS useful for both humans and models. An engineer can read a WORDS file and understand exactly what the system does in a given condition. A language model can read the same file and generate a correct implementation without guessing.

## The Constructs at a Glance

WORDS is built on constructs organised into two layers.

The first layer covers **system organisation and behavior** — these are the constructs you work with at design time, before any implementation concern enters the picture:

| Construct | What it represents |
|---|---|
| `system` | The top-level descriptor; names the product, declares which modules compose it, and exposes runtime access to them |
| `module` | Groups processes, states, contexts and components around the same functionality |
| `process` | Breaks the functionality into scenarios and specifies the transition map for each |
| `state` | A condition the module is in; defines what it receives and what it can return |
| `context` | Structured data that flows between states |

The second layer covers **components** — constructs that sit closer to implementation and interact with the runtime environment:

| Construct | What it represents |
|---|---|
| `screen` | The top-level UI unit used by a state; has direct access to state data |
| `view` | A reusable rendering unit; receives everything it needs via props |
| `provider` | Computes and exposes in-memory data — normalized models, filtered collections, or registries — originating from within the system, not from external sources |
| `adapter` | Bridges the system to external services, APIs, or hardware; the only construct permitted to perform I/O |
| `interface` | Descriptors for components that don't fit the other constructs — models, helpers, and any other named, typed contract |

These constructs compose in a strict hierarchy. A system declares its modules. A module owns its processes and states. A state uses components. This structure is not enforced by a type system — it is enforced by the language itself. There is no valid way to write a WORDS specification that violates these relationships.

## What the Syntax Looks Like

WORDS uses a lightweight parenthesis-block syntax. Every construct follows the same pattern: a keyword, a name — recommended in PascalCase — an optional description in quotes, and a body in parentheses.

At the top of a WORDS project, the `system` construct names the application and lists its modules:
```wds title="MyApplication.wds"
system MyApplication "A full-stack web application" (
    modules (
        AuthModule
        SessionModule
        RoutingModule
        ProductsModule
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

Each module in the system describes a distinct functionality. Here is an authentication module showing the process of authentication:
```wds title="AuthModule/AuthModule.wds"
module AuthModule "Handles authentication and deauthentication" (

    process Authentication (
        when Unauthenticated returns AccountCredentials
            enter StartAuthenticating "The user tries to authenticate"
        when StartAuthenticating returns SystemUser
            enter Authenticated "The user authenticated successfully"
        when StartAuthenticating returns AuthError
            enter Unauthenticated "Authentication failed"
    )

    start Unauthenticated
)
```

A few things are worth noticing here even before reading the full syntax reference:

- The `when` rules in a process read almost like plain English. Each one names the current state, the context it produced, and the state to enter next — followed by a reason.
- The quoted strings after a `when` rule are transition narratives — a human-readable explanation of why the system moves.
- `start` names the initial state of the module, when one exists.

Constructs that belong to a module are written in their own files and carry a `module` declaration on one line before their declaration:
```wds title="AuthModule/states/Unauthenticated.wds"
module AuthModule
state Unauthenticated receives ?AuthError (
    returns AccountCredentials
    uses screen LoginScreen
)
```

## How Modules Communicate

Modules are isolated by design. A module does not reach into another module's states or contexts directly. Communication between modules happens through the APIs they expose.

A module's API can take two forms. The first exposes access to runtime components within the module's own scope — other modules call these directly through the module's interface. The second exposes a subscription mechanism — a module declares a handler interface describing the shape of a callback, other modules implement that interface and register themselves, and when the owning module fires the event every registered handler is called.

Context sharing across module boundaries is handled by `system` directly. A module can persist a context using `system.setContext`, making it available to any other module that retrieves it using `system.getContext`.

The routing example illustrates the subscription mechanism: `RoutingModule` dispatches URL changes, and each module implements the handler interface, registers its own paths, and owns its own transitions entirely.

```wds title="ProductsModule/ProductsModule.wds"
module ProductsModule (
    // processes listing omitted
    implements RoutingModule.RouteSwitchHandler (
        switch path(string) (
            if path is "/products"
                enter ProductList "The /products path activates the product list"
        )
    )

    system.RoutingModule.subscribeRoute (
        path is "/products",
        handler is ProductsModule
    )

)
```

Through this design, modules can be added or removed with minimal coupling, and implementations can safely check for their existence at runtime.

## The Role of Context

Context is the information exchange unit in WORDS. It defines what a state receives and returns, and reaches beyond module boundaries through `system.setContext` and `system.getContext`. It is the structured, typed data that drives process transitions.

Every context is explicitly declared with named properties and their types defined in a parenthesis block — nothing is inferred or anonymous. A state can produce none, one, or multiple contexts, each declared in its `returns` block. A state that receives a context declares it in `receives`, marking it with `?` if it is optional.
```wds title="AuthModule/contexts/AccountCredentials.wds"
module AuthModule
context AccountCredentials (
    user(string),
    password(string)
)
```
```wds title="SessionModule/states/SessionIdle.wds"
module SessionModule
state SessionIdle receives ?SessionValidationError (
    returns StoredSession
    uses adapter SessionAdapter.checkSession
)
```

WORDS uses a consistent typing structure across all constructs: a name followed by its type in parentheses, such as `user(string)` or `expiresAt(integer)`.

### Types

| Type | Description | Default |
|---|---|---|
| `string` | Text value | `is ""` |
| `integer` | Whole number | `is 0` |
| `float` | Decimal number | `is 0.0` |
| `boolean` | True or false | `is false` |
| `list(Type)` | Ordered collection | `is []` |
| `map(KeyType, ValueType)` | Key-value pairs | `is {}` |

A named `interface` component acts as a custom type anywhere a type is expected — `list(Product)`, `map(string, OrderSummary)`, and so on. Interfaces can also be polymorphic through explicit `includes` declarations: a value whose interface includes another interface can be used wherever the included interface is expected.

A `?` prefix marks a value as optional — `?Product` means the value may or may not be present. Optional values do not need a default.

Default values are declared with `is` — `total(float) is 0.0`, `items(list(Product)) is []`, `active(boolean) is false`.

### Keywords

The `is` keyword assigns a named argument in a call — `path is "/home"` or `handler is ProductsModule`. When used after `if`, it becomes a comparison — `if path is "/home"` or `if path is not "/home"`. A block or expression preceded by `if` is a conditional evaluation.

### Calls

Runtime calls use a resolved path followed by a parenthesized named-argument block:

```wds
system.setContext (
    name is AuthenticatedSession,
    value is context
)
```

All call arguments are named. A single-argument call uses the same shape as a multi-argument call:

```wds
system.getContext (
    name is AuthenticatedSession
)
```

The dot in a call path only resolves ownership or runtime access. The argument block is what makes the path a call.

WORDS specifications are written in `.wds` files, organised under a root directory. Each module has its own folder named after it, with subdirectories for each construct type — `states`, `processes`, `contexts`, `screens`, `views`, `providers`, `adapters`, and `interfaces`. The `system` declaration lives at the root of the directory. This structure mirrors the language hierarchy directly, making any WORDS project navigable without prior knowledge of the codebase.

### Inference

WORDS infers information from declarations so that call sites stay concise without losing precision. The primary source of inference is the callback prop declaration on a `view`.

A callback prop declared with a named argument — `onSubmit credentials(AccountCredentials)` — tells the parser two things: the name of the variable that will carry the callback's payload (`credentials`), and its type (`AccountCredentials`). Both are available downstream without being restated.

At the **call site**, the argument name is inferred directly from the prop declaration. A screen wiring up `onSubmit` writes:

```wds
view UIModule.LoginForm (
    onSubmit is (
        state.return (
            value is credentials
        )
    )
)
```

The parser knows `credentials` is of type `AccountCredentials` because `LoginForm` declared it that way. The screen does not restate the type — it uses the name the view established.

When a view forwards a callback to a child, it can shape the arguments inline. The prop declaration on the child tells the parser what argument names are available inside the shaping block:

```wds
view UIModule.OrderActions (
    onConfirm is props.onConfirm (
        orderId is props.orderId,
        action is "Confirmed"
    )
)
```

Here `props.onConfirm` was declared as `onConfirm confirmDetails(OrderConfirmed)` — so the parser knows the inline block must satisfy the shape of `OrderConfirmed`, and validates the properties accordingly.

A callback prop with **no argument declaration** — `onConfirm` with no name or type — signals that the callback carries no payload. The parser infers that no variable is available inside its handler body, and no argument shaping is permitted at the call site.

### Iteration

The `for ... as` construct iterates over a collection and binds each item to a variable for use inside the body block:
```wds
for context.notifications as notification (
    view UIModule.NotificationCard (
        message is notification.message,
        type is notification.type
    )
)
```

When iterating over a `map`, the `as` clause binds two variables — the key and the value, separated by a comma:
```wds
for context.productsByCategoryMap as category, products (
    view UIModule.CategorySection (
        title is category,
        items is products
    )
)
```

The collection is referenced by its full path — `context.propertyName` inside a screen, or `props.propertyName` inside a view. Variables bound with `as` are scoped to the body block and are not accessible outside it. Each item in the collection produces one instance of the child component.

`for ... as` can appear inside any `uses` block alongside other entries, conditional blocks, and nested components.

## What You Will Find in This Documentation

The rest of this documentation covers each construct in depth, with full syntax rules, examples, and design guidance. The recommended reading order follows the natural hierarchy of a WORDS system:

1. **System** — the top-level descriptor and module registry
2. **Modules** — the boundary of a functionality
3. **Processes** — the transition maps that define behavior
4. **States** — the conditions a module can be in
5. **Contexts** — the data that drives transitions
6. **Screens** — the top-level UI unit used by a state
7. **Views** — reusable rendering units composed by screens
8. **Providers** — in-memory data computation and exposure
9. **Adapters** — the I/O boundary to the outside world
10. **Interfaces** — the shape of what modules expose

By now, you should have the mental model. The sections ahead fill in the details.
