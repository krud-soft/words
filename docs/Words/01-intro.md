---
title: Overview
sidebar_position: 1
---

# Overview

WORDS describes software systems the way engineers explain them — in terms of what a system **is doing**, what **triggers a change**, and what **happens next**. It is not a programming language and not a diagram notation. It is a specification language: a precise way to write down behavior before any implementation decision is made.

This page gives you a working mental model of WORDS before you dive into each construct in detail.

## The Core Idea

Every system, at some level of abstraction, can be described as a machine that moves between conditions. The system is waiting for input. It receives something. It transitions. It produces an output. It waits again.

WORDS makes this structure explicit and consistent across the entire system. A `system` names the top-level product and declares which modules compose it. A module groups a domain. A process maps out its transitions. A state represents one condition in that process. A context is the data that travels between states. Components — screens, views, providers, adapters, interfaces — are the pieces closest to implementation that interact with the world and with each other.

Nothing in a WORDS specification is implicit. If a state can produce two different outputs, both are declared. If a module needs to react to an event in another module, that contract is written down. If a component performs a network call, it is an adapter — the only construct in the language permitted to do so.

This explicitness is what makes WORDS useful for both humans and models. An engineer can read a WORDS file and understand exactly what the system does in a given condition. A language model can read the same file and generate a correct implementation without guessing.

## The Constructs at a Glance

WORDS is built on constructs organised into two layers.

The first layer covers **system organisation and behavior** — these are the constructs you work with at design time, before any implementation concern enters the picture:

| Construct | What it represents |
|---|---|
| `system` | The top-level descriptor; names the product and declares which modules compose it |
| `module` | Groups processes, states, contexts and components around the same functionality |
| `process` | Breaks the functionality into scenarios and specifies the transition map for each |
| `state` | A condition the module is in; defines what it receives and what it can return |
| `context` | Structured data that flows between states |

The second layer covers **components** — constructs that sit closer to implementation and interact with the runtime environment:

| Construct | What it represents |
|---|---|
| `screen` | The top-level UI unit mounted by a state; has direct access to state data |
| `view` | A reusable rendering unit; receives everything it needs via props |
| `provider` | Computes and exposes in-memory data — normalized models, filtered collections, or registries — originating from within the system, not from external sources |
| `adapter` | Bridges the system to external services, APIs, or hardware; the only construct permitted to perform async I/O |
| `interface` | Defines the shape of components exposed by modules |

These constructs compose in a strict hierarchy. A system declares its modules. A module owns its processes and states. A state mounts components. This structure is not enforced by a type system — it is enforced by the language itself. There is no valid way to write a WORDS specification that violates these relationships.

## What the Syntax Looks Like

WORDS uses a lightweight parenthesis-block syntax. Every construct follows the same pattern: a keyword, a name, an optional description in quotes, and a body in parentheses.

At the top of a WORDS project, the `system` construct names the application and lists its modules:

```wds title="MyApplication.wds"
system MyApplication "A full-stack web application" (
    modules (
        AuthModule
        SessionModule
        RoutingModule
        ProductsModule
    )
)
```

Each module in the system describes a distinct functionality. Here is an authentication module  showing the process of authentication:

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
- `start` names the initial state of the module.

Constructs that belong to a module are written in their own files and carry a `module` declaration on one line before their declaration:

```wds title="AuthModule/states/Unauthenticated.wds"
module AuthModule
state Unauthenticated receives ?AuthError (
    returns (AccountCredentials)
    mounts screen LoginScreen
)
```

## How Modules Communicate

Modules are isolated by design. A module does not reach into another module's states or contexts directly. Instead, communication happens through two explicit mechanisms.

The first is the **interface**. A module can expose methods that other modules call — for navigation, for accessing shared data, for triggering system-level behavior. The `AppModule`, present in every WORDS application, exposes two system-level interfaces: one for accessing any module by name, and one for persisting contexts across module boundaries.

The second is **publisher-subscriber**. A module declares a handler interface describing the shape of a callback. Other modules implement that interface and register themselves. When the owning module fires the event, every registered handler is called. The routing system works this way: `RoutingModule` dispatches URL changes, and each feature module registers its own paths and owns its own transitions entirely.

```wds title="ProductsModule/ProductsModule.wds"
module ProductsModule (

    implements RoutingModule.RouteSwitchHandler (
        switch path(string) (
            if path("/products")
                enter ProductList "The /products path activates the product list"
        )
    )

    RoutingModule.subscribeRoute path("/products") handler(ProductsModule)

)
```

Through this design, modules can be added or removed with minimal coupling, and implementations can safely check for their existence at runtime.

## The Role of Context

Context is the information exchange unit in WORDS. It defines what a state receives and returns, and reaches beyond module boundaries through the `ContextProvider`. It is the structured, typed data that drives process transitions.

Every context is explicitly declared with named properties and their types defined in a parenthesis block — nothing is inferred or anonymous. A state can produce none, one, or multiple contexts, each declared in its `returns` block. A state that receives a context declares it in `receives`, marking it with `?` if it is optional.

```wds title="AuthModule/contexts/AccountCredentials.wds"
module AuthModule
context AccountCredentials (
    user(string)
    password(string)
)
```

```wds title="AuthModule/states/SessionIdle.wds"
module SessionModule
state SessionIdle receives ?SessionValidationError (
    returns (StoredSession)
    mounts adapter SessionAdapter.checkSession
)
```

WORDS uses a consistent typing structure across all constructs: a name followed by its type in parentheses, such as `user(string)`, `expiresAt(number)`, or `returns(Module)`. A `?` prefix marks something as optional. A block or expression preceded by `if` or `if not` becomes a conditional evaluation, such as `if path("/home") enter Dashboard`.

WORDS specifications are written in `.wds` files, organised under a root directory. Each module has its own folder named after it, with subdirectories for each construct type — `states`, `processes`, `contexts`, `screens`, `views`, `providers`, `adapters`, and `interfaces`. The `system` declaration lives at the root of directory. This structure mirrors the language hierarchy directly, making any WORDS project navigable without prior knowledge of the codebase.

## What You Will Find in This Documentation

The rest of this documentation covers each construct in depth, with full syntax rules, examples, and design guidance. The recommended reading order follows the natural hierarchy of a WORDS system:

1. **System** — the top-level descriptor and module registry
2. **Modules** — the boundary of a functionality
3. **Processes** — the transition maps that define behavior
4. **States** — the conditions a module can be in
5. **Contexts** — the data that drives transitions
6. **Screens** — the top-level UI unit mounted by a state
7. **Views** — reusable rendering units composed by screens
8. **Providers** — in-memory data computation and exposure
9. **Adapters** — the I/O boundary to the outside world
10. **Interfaces** — the shape of what modules expose

By now, you should have the mental model. The sections ahead fill in the details.
