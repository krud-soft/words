---
title: Module
---

# Module

A `module` groups everything related to a major functionality: its processes, states, contexts, and components. It is the primary unit of organisation in a WORDS specification below the `system` level. Every module listed in the `system` block has a corresponding module definition somewhere in the project.

## Purpose

A module is a boundary. Everything inside it — processes, states, contexts, screens, providers, adapters, interfaces — belongs to that functionality and is owned by that module. Other modules can reference its exposed components — like views or interfaces — but any interaction at the functional level is explicit and happens through the other module's interface.

This boundary is not just organisational. It determines where behavior lives, where a change needs to be made, and how the system modules communicate.

Modules can be **stateful** or **stateless**. A stateful module tracks which state it is currently in and the transitions between states. A stateless module exposes functionality — interfaces, reusable logic — without maintaining a state machine of its own.

## Syntax

The `module` keyword is followed by the module's name, an optional description in quotes, and a body in parentheses:

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

The presence of at least one process signals that the module is stateful — it defines states and transitions between them. The `start` declaration names the initial state for modules that enter one autonomously. A module without a `start` may still define processes, with its states being triggered externally through an event subscription or an exposed interface.

## Definition and Reference

A module is defined only once, in a dedicated file saved in a directory named after the module. Following the `ModuleName.wds` filename pattern is recommended, as is the case with all other constructs:

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

Constructs that belong to a module — states, processes, contexts, screens, and others — are each defined in their own file, under a directory named after the type of construct. They declare their owning module on the line above them:

```wds title="AuthModule/states/Unauthenticated.wds"
module AuthModule
state Unauthenticated receives ?AuthError (
    returns AccountCredentials
    mounts screen LoginScreen
)
```

This `module` reference is a declaration of ownership — it tells the parser and any reader which module this construct belongs to.

## File Location

A module's constructs are organised inside the module's directory. The module's directory sits at the root of the project:
```
/my-project/
  MyApplication.wds
  AuthModule/
    AuthModule.wds
    states/
      Unauthenticated.wds
      StartAuthenticating.wds
    contexts/
      AccountCredentials.wds
```

The `AuthModule.wds` file declares the module itself — its name, description, `start` state, and any cross-module wiring such as `implements` blocks. Each construct belonging to the module — states, processes, contexts, screens, and others — lives in its own file, under a directory named after the type of construct, and named after the construct it defines.

## Cross-Module Communication

Modules are isolated by design. A module does not reach into another module's states or contexts directly. Communication between modules happens through the APIs they expose.

A module's API can take two forms. The first exposes access to runtime components within the module's own scope — other modules call these directly through the module's interface. The second exposes a subscription mechanism — a module declares a handler interface describing the shape of a callback, other modules implement that interface and register themselves, and when the owning module fires the event every registered handler is called.

Context sharing across module boundaries is handled by `system` directly. A module can persist a context using `system.setContext()`, making it available to any other module that retrieves it using `system.getContext()`. This is the only mechanism through which contexts cross module boundaries.

The following example shows a products module subscribing to `RoutingModule` — implementing the `RouteSwitchHandler` interface and registering its own routes:

```wds title="ProductsModule/ProductsModule.wds"
module ProductsModule (

    implements RoutingModule.RouteSwitchHandler (
        switch path(string) (
            if path("/products")
                enter ProductList "The /products path activates the product list"
        )
    )

    system.RoutingModule.subscribeRoute path("/products") handler(ProductsModule)
)
```

This design means adding a new feature module never requires touching an existing one. Each module takes from the system or subscribes to what it needs and handles its own transitions entirely.

## Examples

A stateful module with an autonomous starting state:
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

A stateless module exposing a shared interface:
```wds title="LoggingModule/LoggingModule.wds"
module LoggingModule "Provides a structured logging interface for other modules" (
    interface LogEntry (
        level(string)
        message(string)
        timestamp(string)
    )
)
```

A stateful module subscribing to an external event:
```wds title="CatalogueModule/CatalogueModule.wds"
module CatalogueModule "Manages product browsing and search" (

    implements RoutingModule.RouteSwitchHandler (
        switch path(string) (
            if path("/catalogue")
                enter CatalogueList "The /catalogue path shows the full product list"
            if path("/catalogue/search")
                enter CatalogueSearch "The /catalogue/search path activates the search view"
        )
    )

    system.RoutingModule.subscribeRoute path("/catalogue") handler(CatalogueModule)
    system.RoutingModule.subscribeRoute path("/catalogue/search") handler(CatalogueModule)

    start CatalogueList
)
```

## What It Does Not Contain

A `module` declaration does not implement behavior — it organises it. The transition logic lives in processes. The conditions live in states. The data lives in contexts. The module block itself declares scope, ownership, an optional starting condition, and cross-module wiring. Nothing more.

A module does not own other modules. Modules are siblings within the `system`, not hierarchically nested. If two functionalities need to communicate, they do so through the explicit mechanisms described above — not through nesting or direct access.

## Relationship to Other Constructs

Every module listed in the `system` must have a corresponding module definition. That definition owns all processes, states, contexts, and components that belong to the functionality.

A module is stateful when it defines at least one process. A stateful module that enters an initial state autonomously declares a `start` state — that state must be defined as a standalone construct in the module's directory. A module without a `start` may still be stateful, with its states being triggered externally through an event subscription or an exposed interface.
