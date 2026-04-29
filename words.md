<!-- 01-intro.md -->
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


---

<!-- 02-system.md -->
# System

The `system` construct is the entry point of every WORDS specification. It names the application, gives it a human-readable description and declares the modules from which the application is composed. There is exactly one `system` in a WORDS project.

## Purpose

`system` does not describe behavior, states, transitions or data. Its role is organisational: it breaks the application into named modules, each responsible for a distinct major functionality, so that any change — whether to a specification or an implementation — can live within the context of that specific functionality.

An engineer reading a `system` block can understand the shape of the entire application — what functionalities it contains, how many there are, what they are called — without reading anything else.

## Runtime Access

Beyond naming and listing modules, `system` exposes runtime access to them — such as `system.RoutingModule` — and provides a built-in interface for persisting contexts across module boundaries. The interface exposes three methods: `getContext`, which retrieves a stored context by name, `setContext`, which stores one, and `dropContext`, which removes the stored context entirely. These are the only behavioral concerns that live at the `system` level. Everything else belongs to the modules themselves.

The `system.` prefix is used wherever a reference is resolved at runtime through the module registry, rather than declared as a static design-time dependency. A state using an adapter within its own module, or a screen referencing a view from another module, are design-time dependencies and use the qualified name alone — `ModuleName.ComponentName`. A call that must be dispatched through the system at runtime — such as `system.setContext`, `system.RoutingModule.dispatch`, or an interface component loading data from another module's adapter — uses the `system.` prefix to signal that resolution happens through the registry, not statically.

Runtime calls use parenthesized named arguments:

```wds
system.getContext (
    name is AuthenticatedSession
)

system.setContext (
    name is AuthenticatedSession,
    value is context
)

system.RoutingModule.dispatch (
    path is "/home"
)
```

The dot resolves the runtime path. The parenthesized argument block invokes it.

## Syntax
```wds title="SystemName.wds"
system SystemName "A description of the application" (
    modules (
        ModuleOne
        ModuleTwo
        ModuleThree
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

The `system` keyword is followed by the application's name, an optional description in quotes and a body in parentheses. Inside the body, the `modules` block lists every module in the application by name, one per line. The `interface` describes what the system exposes to every module.

The description is optional but recommended — it is the first thing any reader, human or model, will see when opening the specification.

## File Location

The `system` construct lives in a single file at the root of the WORDS project:
```
/my-project/SystemName.wds
```

This file should be named after the system name followed by the `.wds` extension and needs to sit at the root of the project's directory. Every other construct in the project belongs to a module and is organised within its module's directory.

## Examples

A minimal single-module application:
```wds title="NotesApp.wds"
system NotesApp "A personal note-taking application" (
    modules (
        NotesModule
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

A mid-size product covering authentication, session management, routing and catalogue functionality:
```wds title="ShopFront.wds"
system ShopFront "An e-commerce storefront" (
    modules (
        RoutingModule
        AuthModule
        SessionModule
        CatalogueModule
        CartModule
        CheckoutModule
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

A back-office tool focused on data processing:
```wds title="ReportingService.wds"
system ReportingService "Internal data reporting and export service" (
    modules (
        IngestionModule
        TransformModule
        ExportModule
        SchedulerModule
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

In each case, the `system` block communicates the scope of the application. The module names signal the functionalities involved. Nothing about how those functionalities behave needs to be understood here — that is the responsibility of each module individually.

## Relationship to Other Constructs

Every module listed in the `modules` block must have a corresponding module definition in the project root directory as the `system` construct does not define them and only declares that they exist.

The `system` file rarely needs to change. New behavior is added by creating or modifying modules. The `system` file is only updated when a module is added to or removed from the application entirely.


---

<!-- 03-module.md -->
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

The presence of at least one process signals that the module is stateful — it defines states and transitions between them. The `start` declaration names the initial state in which the module starts. A module without a `start` waits for a state to transition to be triggered through an event subscription or an exposed interface.

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
    uses screen LoginScreen
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

Context sharing across module boundaries is handled by `system` directly. A module can persist a context using `system.setContext`, making it available to any other module that retrieves it using `system.getContext`. This is the only mechanism through which contexts cross module boundaries.

The following example shows a products module subscribing to `RoutingModule` — implementing the `RouteSwitchHandler` interface and registering its own routes:

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
        level(string),
        message(string),
        timestamp(string)
    )
)
```

Example of a catalog module subscribing to a routing module with its own path:
```wds title="CatalogueModule/CatalogueModule.wds"
module CatalogueModule "Manages product browsing and search" (
    // processes listing omitted
    implements RoutingModule.RouteSwitchHandler (
        switch path(string) (
            if path is "/catalogue"
                enter CatalogueList "The /catalogue path shows the full product list"
            if path is "/catalogue/search"
                enter CatalogueSearch "The /catalogue/search path activates the search view"
        )
    )

    system.RoutingModule.subscribeRoute (
        path is "/catalogue",
        handler is CatalogueModule
    )
    system.RoutingModule.subscribeRoute (
        path is "/catalogue/search",
        handler is CatalogueModule
    )
)
```

## What It Does Not Contain

A `module` declaration does not implement behavior — it organises it. The transition logic lives in processes. The conditions live in states. The data lives in contexts. The module block itself declares scope, ownership, an optional starting condition, and cross-module wiring. Nothing more.

A module does not own other modules. Modules are siblings within the `system`, not hierarchically nested. If two functionalities need to communicate, they do so through the explicit mechanisms described above — not through nesting or direct access.

## Relationship to Other Constructs

Every module listed in the `system` must have a corresponding module definition. That definition owns all processes, states, contexts, and components that belong to the functionality.

A module is stateful when it defines at least one process. A stateful module that enters an initial state autonomously declares a `start` state — that state must be defined as a standalone construct in the module's directory. A module without a `start` may still be stateful, with its states being triggered externally through an event subscription or an exposed interface.


---

<!-- 04-process.md -->
# Process

A `process` is the transition map for a module's functionality. It declares every state the module can be in under a given scenario, and for each state it declares what context triggers a move and where the module goes next. A module can have more than one process — each covering a distinct scenario within the same functionality.

## Purpose

A process makes behavior explicit. Rather than leaving transition logic scattered across implementation files or implicit in a model's interpretation of natural language, a process collects every possible movement in one place and names each one. An engineer reading a process block can answer three questions without reading anything else: what states exist in this scenario, what does each state produce to move forward, and where does the module go when it does.

This completeness is not incidental. A WORDS specification is only as useful as its coverage of the real behavior. A process that omits an error path is a process that will produce an implementation that silently ignores that error. WORDS makes omission visible — if a transition is not written down, it does not exist.

## Syntax

The `process` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body is a sequence of `when` rules:

```wds title="AuthModule/AuthModule.wds"
module AuthModule "Handles authentication and deauthentication" (
    process Authentication "Covers the flow from an unauthenticated state through credential submission to either a successful session or a returned error" (
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

Each `when` rule reads as a sentence: *when the module is in this state and returns this context, enter this next state*. The quoted string at the end is a transition narrative — a human-readable explanation of why the system moves. It is optional but strongly recommended. A process written with narratives is readable without prior knowledge of the system. A process without them requires the reader to reconstruct intent from names alone.

## The `when` Rule

The `when` rule is the only construct inside a process body and it follows the same structure:

```
when [CurrentState] returns [Context]
    enter [NextState] "narrative"
```

- `[CurrentState]` — the state the module is currently in
- `[Context]` — the context that state produced
- `[NextState]` — the state to enter as a result
- `"narrative"` — an optional human-readable explanation of why the transition occurs

The same state can appear as `CurrentState` in multiple `when` rules, each with a different `ProducedContext`. This is how branching is expressed: a state that can produce more than one context results in more than one `when` rule, one for each outcome.

```wds title="AuthModule/AuthModule.wds"
process PasswordReset "Covers the flow from a reset request through token issuance to credential update, including rate limiting and token expiry" (
    when ResetRequested returns ResetToken
        enter ResetPending "A reset token was issued and the user is waiting"
    when ResetRequested returns RateLimitError
        enter ResetRequested "Too many attempts — the user must try again"
    when ResetPending returns NewCredentials
        enter Unauthenticated "The password was reset and the session was cleared"
    when ResetPending returns TokenExpiredError
        enter ResetRequested "The token expired — the user must restart the process"
)
```

Each branch is a first-class part of the process. There is no default path and no fallthrough. Every outcome a state can produce must be covered by a corresponding `when` rule.

## Inline Context Construction

When a state is about to be entered from an external trigger — such as an implemented interface handler — it needs a context that matches what the state `receives`. In these cases the context can be constructed inline within the `enter` block, shaping the incoming data into the form the state expects:

```wds title="AuthModule/AuthModule.wds"
module AuthModule (
    // processes omitted

    implements SessionModule.SessionExpiredHandler (
        whenSessionExpired context is SessionModule.SessionExpired (
            enter Unauthenticated "The user's session has expired" (
                // the AuthError context block for entering the Unauthenticated state
                reason is "The session has expired"
                code is "ERR:01"
            )
        )
    )
)
```

The parenthesis block after the transition narrative constructs the context inline. The properties listed must satisfy the shape of the context the receiving state expects.

## Multiple Processes

A module can define more than one process. Each process covers a distinct scenario within the same functionality. The states and contexts involved in one process may overlap with those of another — a state can appear in multiple processes, and a context produced in one scenario may trigger a transition in another.

```wds title="AuthModule/AuthModule.wds"
module AuthModule "Handles authentication and deauthentication" (
    process Authentication "Covers the flow from an unauthenticated state through credential submission to either a successful session or a returned error" (
        when Unauthenticated returns AccountCredentials
            enter StartAuthenticating "The user tries to authenticate"
        when StartAuthenticating returns SystemUser
            enter Authenticated "The user authenticated successfully"
        when StartAuthenticating returns AuthError
            enter Unauthenticated "Authentication failed"
    )

    process Deauthentication "Covers the flow from an active session to a signed-out state" (
        when Authenticated returns SignOutRequest
            enter Unauthenticated "The user signed out"
    )

    start Unauthenticated
)
```

Splitting behavior into separate processes is a design decision, not a structural requirement. A single process can cover multiple scenarios if they are tightly related. The guiding principle is readability: a process should describe one coherent story about what the module does. When a second story begins — a different trigger, a different starting condition, a different outcome — a second process is usually the clearer choice.

## File Location

A process is declared inside its owning module's file. It is not a standalone construct and does not have its own file. The module file is the only place a process appears:

```
/my-project/
  AuthModule/
    AuthModule.wds        ← processes are declared here
    states/
      Unauthenticated.wds
      StartAuthenticating.wds
      Authenticated.wds
    contexts/
      AccountCredentials.wds
      SystemUser.wds
      AuthError.wds
```

Each state and context referenced in the process must have a corresponding standalone construct file in the module's directory. The process declares the map — the individual files define the detail.

## Examples

A session module with two distinct processes — one for validating an existing session on load, one for handling expiry during an active session:

```wds title="SessionModule/SessionModule.wds"
module SessionModule "Manages session lifecycle" (
    process SessionValidation "Covers the check for an existing stored session on application load, resolving to either an active session or an unauthenticated state" (
        when SessionIdle returns StoredSession
            enter ValidatingSession "A stored session was found and is being checked"
        when ValidatingSession returns SessionUser
            enter ActiveSession "The session is valid and the user is active"
        when ValidatingSession returns SessionValidationError
            enter SessionIdle "The session was invalid or expired"
    )

    process SessionExpiry "Covers the transition out of an active session when the session token expires during use" (
        when ActiveSession returns SessionExpiredSignal
            enter SessionIdle "The session expired during use"
    )

    start SessionIdle
)
```

A checkout module handling the multi-step flow from cart review through payment confirmation:

```wds title="CheckoutModule/CheckoutModule.wds"
module CheckoutModule "Manages the purchase flow from cart to confirmation" (
    process Checkout "Covers the linear progression from cart review through shipping and payment to order confirmation, including back-navigation and payment failure" (
        when CartReview returns CartSummary
            enter ShippingDetails "The user confirmed the cart and is entering shipping details"
        when ShippingDetails returns ShippingSelection
            enter PaymentDetails "Shipping was selected and payment details are next"
        when ShippingDetails returns CartReviewRequest
            enter CartReview "The user went back to review the cart"
        when PaymentDetails returns PaymentMethod
            enter OrderConfirmation "Payment details were provided and the order is being confirmed"
        when PaymentDetails returns ShippingReviewRequest
            enter ShippingDetails "The user went back to change shipping details"
        when OrderConfirmation returns OrderReceipt
            enter OrderComplete "The order was placed successfully"
        when OrderConfirmation returns PaymentError
            enter PaymentDetails "Payment failed — the user must re-enter details"
    )

    start CartReview
)
```

## What a Process Does Not Contain

A process does not implement behavior — it maps it. The logic of what happens inside a state, what components it uses, what data it accepts, is defined in the state itself. A process only says: given this state and this output, go here next.

A process does not define contexts. Contexts are standalone constructs. A process references them by name.

A process does not define states. States are standalone constructs. A process references them by name.

This separation keeps the process readable as a map. Anyone — engineer, reviewer, or model — can read a process block and understand the full shape of a scenario without reading the detail of any individual state or context. That detail lives where it belongs: one level down.

## Relationship to Other Constructs

A process lives inside a `module`. It references `state` constructs by name — every state named in a `when` rule must have a corresponding state definition in the module's directory. It references `context` constructs by name — every context named after `returns` must have a corresponding context definition in the module's directory. The process itself is not referenced by any other construct — it is owned by the module and read as part of understanding the module's behavior.


---

<!-- 05-states.md -->
# State

A `state` represents a condition the module is currently in. It is the smallest behavioral unit in a WORDS specification — the point at which the system has settled, is waiting, and is ready to produce an output that drives the next transition. Every state declares what it expects on entry, what it can return, and what it uses while resident.

## Purpose

A state is a stable condition — the system has arrived here, something is used or in progress, and the state will hold until it produces an output. That output is a context. The context is what the process uses to decide where to go next.

This framing determines what belongs in a state and what does not. A state does not contain branching logic, control flow, or conditional behavior across states. It contains a declaration of what it receives, what it can return, and what it uses.

## Syntax

The `state` keyword is followed by a name recommended in PascalCase, an optional `receives` clause and a body in parentheses. The body declares `returns` and `uses`:

```wds title="AuthModule/states/Unauthenticated.wds"
module AuthModule
state Unauthenticated receives ?AuthError (
    returns AccountCredentials
    uses screen LoginScreen
)
```

The `module` declaration on the line above is a declaration of ownership — it tells the parser and any reader which module this state belongs to.

The `receives` clause names the context the state expects on entry. A `?` prefix marks it as optional — the state can be entered either with that context or without one. A state that always requires a context on entry omits the `?`.

The `returns` block lists every context the state can produce. A process `when` rule exists for each — if a context appears in `returns` but has no corresponding `when` rule in any process, the specification is incomplete and the parser will reject it. The same applies to states — if a state is defined but never referenced in any process, the parser will reject it.

The `uses` block declares what the state uses while resident — a screen, an adapter etc. or a combination. What is used depends on whether the state is presenting UI, triggering background work, or both.

## `receives`

`receives` declares the context the state expects when it is entered. It names a context defined in the same module:

```wds title="AuthModule/states/StartAuthenticating.wds"
module AuthModule
state StartAuthenticating receives AccountCredentials (
    returns AuthError, SystemUser
    uses screen UIModule.LoadingScreen
)
```

Here `StartAuthenticating` requires `AccountCredentials` on entry — it cannot be entered without one. The credentials are available to whatever the state uses via `context`.

A state that can be entered from more than one origin — including cold, with no prior context — marks `receives` as optional:

```wds title="AuthModule/states/Unauthenticated.wds"
module AuthModule
state Unauthenticated receives ?AuthError (
    returns AccountCredentials
    uses screen LoginScreen
)
```

The `?` prefix signals that `AuthError` may or may not be present. The state handles both cases. When present, the used screen can surface the error via `context`. When absent, the screen renders its default condition.

A state that receives no context at all omits the `receives` clause entirely.

## `returns`

`returns` lists every context the state can produce. Each context name in this block must have a corresponding `when` rule in the module's process, or the specification is incomplete:

```wds title="AuthModule/states/StartAuthenticating.wds"
module AuthModule
state StartAuthenticating receives AccountCredentials (
    returns AuthError, SystemUser
    uses (
        screen UIModule.LoadingScreen,
        adapter AuthAdapter.login (
            credentials is context
        )
    )
)
```

`StartAuthenticating` can produce either `AuthError` or `SystemUser`. Both must appear as the `returns` side of a `when` rule in the `Authentication` process.

When a returned context needs to carry a side effect — like persisting a context — the `returns` block can expand to declare it inline:

```wds title="SessionModule/states/SessionValidating.wds"
module SessionModule
state SessionValidating receives StoredSession (
    returns (
        SessionToken (
            // side effect executed before producing the SessionToken context
            system.setContext (
                name is SessionToken,
                value is context
            )
        )
        SessionValidationError (
            // side effect executed before producing the validation error
            system.dropContext (
                name is SessionToken
            )
        )
    )
    uses adapter SessionAdapter.validateSession (
        existing is context
    )
)
```

The side effect executes before the context is returned — it has priority over the state's return. Only once the side effect has completed does the module transition. `system.dropContext` clears the stored context. This is not the only mechanism through which a context crosses module boundaries — a component exposed through a module's interface can also give access to contexts.

## `uses`

`uses` declares what the state uses while resident. A state using a screen looks like this:

```wds title="AuthModule/states/Unauthenticated.wds"
module AuthModule
state Unauthenticated receives ?AuthError (
    returns AccountCredentials
    uses screen LoginScreen
)
```

A state that needs to trigger background work rather than render UI uses an adapter:

```wds title="SessionModule/states/SessionIdle.wds"
module SessionModule
state SessionIdle receives ?SessionValidationError (
    returns StoredSession
    uses adapter SessionAdapter.checkSession
)
```

A state can use multiple constructs. These can be adapters, runtime calls, or a mix of both. When multiple entries are needed, they are listed in a parenthesis block and separated by comma:

```wds title="AuthModule/states/Authenticated.wds"
module AuthModule
state Authenticated receives SystemUser (
    returns LogoutContext

    uses (
        system.setContext (
            name is SystemUser,
            value is context
        ),
        system.RoutingModule.dispatch (
            path is "/home"
        )
    )
)
```

`context` gives the used components direct access to the context the state received on entry. How components are `used` and how they consume the `context` depends on the target framework or implementation.

A state with no `uses` is valid — it may be a transient condition that exists purely to hold a position in the process map while something external resolves.

## File Location

Each state lives in its own file. The recommended location is the states directory of its owning module:

```
/my-project/
  AuthModule/
    AuthModule.wds
    states/
      Unauthenticated.wds
      StartAuthenticating.wds
      Authenticated.wds
    contexts/
      AccountCredentials.wds
      AuthError.wds
      SystemUser.wds
```

The file is named after the state it defines. The `module` declaration at the top of the file is not a repeated definition — it is the ownership declaration that binds this state to its module.

## Examples

A state that uses a screen and can receive an optional error from a previous transition:

```wds title="AuthModule/states/Unauthenticated.wds"
module AuthModule
state Unauthenticated receives ?AuthError (
    returns AccountCredentials
    uses screen LoginScreen
)
```

A state that requires a context on entry, uses a loading screen, and can produce two different outcomes:

```wds title="AuthModule/states/StartAuthenticating.wds"
module AuthModule
state StartAuthenticating receives AccountCredentials (
    returns AuthError, SystemUser
    uses screen UIModule.LoadingScreen
)
```

A state that uses an adapter to perform background work and produces a single context on completion:

```wds title="SessionModule/states/SessionIdle.wds"
module SessionModule
state SessionIdle receives ?SessionValidationError (
    returns StoredSession
    uses adapter SessionAdapter.checkSession
)
```

A state that uses an expanded `returns` block which carries a side effect for persisting a context:

```wds title="SessionModule/states/SessionValidating.wds"
module SessionModule
state SessionValidating receives StoredSession (
    returns (
        SessionToken (
            system.setContext (
                name is SessionToken,
                value is context
            )
        )
        SessionValidationError (
            system.dropContext (
                name is SessionToken
            )
        )
    )
    uses adapter SessionAdapter.validateSession (
        existing is context
    )
)
```

An example in which the state mounts a screen and changes its output based on the interaction with a confirmation and a cancellation buttons:

```wds

module CatalogModule
state OrderDiplaying receives OrderContext (
    // can return order confirmation and cancel order contexts
    returns ConfirmOrderCtx, CancelOrderCtx
    
    // mounting the order summary UI
    uses screen OrderSummaryScreen
)

```

```wds title="CatalogModule/screens/OrderSummaryScreen.wds"
module CatalogModule
screen OrderSummaryScreen "Shows the order summary screen" (
    uses (
        view AppUIModule.NavigationBar (
            currentUser is system.getContext (
                name is SystemUser
            )
        ),
        view OrderSummary (
            orderId is context.id,
            items is [],
            total is context.total,
            onConfirm is (
                state.return (
                    value is confirmDetails
                )
            ),
            onCancel is (
                state.return (
                    value is cancelDetails
                )
            ),
        )
    )
)
```

## Relationship to Other Constructs

A state belongs to a `module` and is referenced by name in that module's `process` blocks. Every context named in `returns` must appear as the `returns` side of a `when` rule in at least one process. Every context named in `receives` must be defined as a standalone `context` construct in the module's directory.

A state uses components — `screen`, `adapter`, or both. Those components are defined as standalone constructs in the module's directory, or referenced from another module by their qualified name. The state uses them; it does not define them.

A state does not define transitions. Transitions are the responsibility of the `process`. A state only declares what it is ready to produce — the process decides what that production means for the module's next condition.


---

<!-- 06-components.md -->
# Components

Components are the constructs closest to implementation in a WORDS specification. They are what a state uses — the things that render UI, compute data, perform I/O, and expose behavior to the rest of the system.

There are five component types: `screen`, `view`, `provider`, `adapter`, and `interface`. Each has a distinct role and a defined set of rules about what it can access and what it can do. What they share is a common syntax for using, composing, and passing data — described on this page before the individual construct references.

---

## The Component Layer

Components sit below the behavioral layer in the WORDS hierarchy. A `state` activates them — it does not implement them. The state declares what is used; the component defines what that means.

| Construct | Role |
|---|---|
| `screen` | Top-level UI unit; used by a state; has implicit access to the state's `context` |
| `view` | Reusable rendering unit; used by screens or other views; receives all data via props |
| `provider` | Computes and exposes in-memory derived data; no I/O |
| `adapter` | The only construct permitted to perform I/O; the only construct permitted to be async |
| `interface` | Descriptors for components that don't fit the other constructs — models, helpers, and any other named, typed contract |

A state can use any component except `view` — so `screen`, `adapter`, `provider`, and `interface` are all valid state uses. A `view` must always have a component parent that passes it what it needs.

---

## The `uses` Block

Every component that activates other components does so inside a `uses` block. The block lists what is used, one per line. When more than one thing is used, the entries are separated by a comma:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen (
    uses (
        view AppUIModule.HeaderSection,
        view UIModule.LoginForm (
            onSubmit is (
                state.return (
                    value is credentials
                )
            ),
            onForgotPassword is (
                state.return (
                    value is recoverAccount
                )
            )
        )
    )
)
```

A single entry does not require a parenthesis block:

```wds title="SessionModule/states/SessionIdle.wds"
module SessionModule
state SessionIdle receives ?SessionValidationError (
    returns StoredSession
    uses adapter SessionAdapter.checkSession
)
```

The `uses` block is available to all components and to `state`.

---

## Passing Arguments

Arguments are passed to a used component using a parenthesized named-argument block. The argument name comes first, followed by `is`, followed by the value:

```wds
view UIModule.Notification (
    type is "warning"
)
```

When more than one argument is passed, they are separated by a comma inside the block:

```wds
view UIModule.Notification (
    type is "warning",
    message is context.reason
)
```

This syntax is consistent with the rest of the WORDS language. The `is` keyword assigns a value. The same keyword is used for comparisons in conditional expressions — context determines which role it plays.

---

## Conditional Mounting

A component is conditionally mounted using `if`. The condition evaluates the current state's context — what type it is, or what value a property holds:

```wds
if context is AccountDeauthenticated (
    view UIModule.Notification (
        type is "warning",
        message is context.reason
    )
)
```

The negative form uses `is not`:

```wds
if context is not AccountRecovered (
    view UIModule.Notification (
        type is "error",
        message is context.reason
    )
)
```

A property on the context can also be evaluated directly:

```wds
if context.status is "pending" (
    view UIModule.Notification (
        type is "info",
        message is "Your request is being processed"
    )
)
```

Conditional blocks can appear inside any component's `uses` block. Each is evaluated independently. This is how components decide what they use depending on context — the state machine drives the condition, the component responds to it:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen (
    uses (
        view AppUIModule.HeaderSection,

        if context is AccountDeauthenticated (
            view UIModule.Notification (
                type is "warning",
                message is context.reason
            )
        )

        if context is AccountRecovered (
            view UIModule.Notification (
                type is "success",
                message is context.message
            )
        )

        view UIModule.LoginForm (
            onSubmit is (
                state.return (
                    value is credentials
                )
            ),
            onForgotPassword is (
                state.return (
                    value is recoverAccount
                )
            )
        )
    )
)
```

---

## Iteration

A component iterates over a collection using `for ... as`. The syntax names the collection, binds the iteration variable with `as`, then the body in parentheses:

```wds
for context.notifications as notification (
    view UIModule.NotificationCard (
        message is notification.message,
        type is notification.type
    )
)
```

The iteration variable is bound with `as` and is available inside the body block. Each item in the collection produces one instance of the child component.

`for ... as` can appear inside a `uses` block alongside other entries:

```wds title="UIModule/screens/DashboardScreen.wds"
module UIModule
screen DashboardScreen (
    uses (
        view UIModule.PageHeader (
            title is "Dashboard"
        ),

        for context.notifications as notification (
            view UIModule.NotificationCard (
                message is notification.message,
                type is notification.type
            )
        )
    )
)
```

---

## Nesting

Components compose by nesting. A `screen` uses `view` components. A `view` can use further `view` components. There is no depth limit, but the ownership direction is always the same: a parent passes data and handlers down; a child emits events or calls handlers upward.

```wds title="UIModule/screens/ProductScreen.wds"
module UIModule
screen ProductScreen (
    uses (
        view UIModule.ProductLayout (
            view UIModule.ProductHeader (
                title is context.name
            ),
            view UIModule.ProductBody (
                view UIModule.ProductDescription (
                    text is context.description
                ),
                view UIModule.ProductActions (
                    onAddToCart is (
                        state.return (
                            value is cartItem
                        )
                    )
                )
            )
        )
    )
)
```

A `screen` is always the root of a UI component tree. A `view` must always have a component parent that passes it what it needs — it cannot be used by a state directly.

---

## Data Flow

Data moves through a component tree in one direction:

- **Down** — via `props`, from parent to child
- **Up** — via `props` callbacks, from child to parent
- **Local** — via `state`, owned by the component itself

Every component can declare a `state` block for instance-level data it owns and manages internally — input values in a view, cached collections in a provider, runtime flags in an adapter. This data does not flow outward. It is the component's own concern.

```wds title="UIModule/screens/OrderScreen.wds"
module UIModule
screen OrderScreen (
    uses (
        view UIModule.OrderSummary (
            items is context.items,
            total is context.total,
            onConfirm is (
                state.return (
                    value is orderConfirmed
                )
            )
        )
    )
)
```

This unidirectional contract keeps components predictable and reusable. A view that receives everything through props can be used anywhere without depending on how the state was entered.

---

## Referencing Components Across Modules

A component defined in one module can be reused by a component in another. The reference uses the qualified name — the module name followed by a dot and the component name:

```wds
view AppUIModule.HeaderSection
view UIModule.Notification (
    type is "warning",
    message is context.reason
)
```

This applies to all component types, including `interface`. An `interface` defined in one module can be used by a state, a screen, or a view in another module using the same qualified name syntax:

```wds
uses interface UIModule.PaginationModel (
    page is context.page,
    total is context.total
)
```

Only components that are explicitly exposed by a module can be referenced this way.

---

## File Location

Each component lives in its own file, under a directory named after the component type, inside its owning module's directory:

```
/my-project/
  AuthModule/
    AuthModule.wds
    states/
      Unauthenticated.wds
    screens/
      LoginScreen.wds
    views/
      LoginFormSection.wds
    adapters/
      AuthAdapter.wds
    providers/
      AuthProvider.wds
    interfaces/
      AuthHandlerInterface.wds
      SystemUserModel.wds
```

Each file carries a `module` declaration on the line above the component definition:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen (
    ...
)
```

This declaration is not a repeated definition — it is the ownership declaration that binds the component to its module.

---

The sections that follow cover each component type in detail.


---

<!-- 07-screen.md -->
# Screen

A `screen` is the top-level UI unit in a WORDS specification. It is the equivalent of a screen in a mobile application or a page in a web application — the full visual surface the user sees when a module is in a given state. A screen controls what is rendered, what is visible under which conditions, and what actions the user can take.

A screen is always used by a state. It is never used by another component.

## Purpose

A screen's role is to control the UI for the duration of a state. It reads from the state's `context`, decides what to render based on it, and wires user interactions back to the state through `state.return`. Everything visible to the user while the module is in that state is the screen's responsibility.

A screen does not implement logic. It does not compute data, perform I/O, or make decisions about what happens next — those concerns belong to providers, adapters, and the process respectively. A screen reads what the state gives it and expresses it.

## Syntax

The `screen` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body contains a `uses` block listing everything the screen activates:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen "The sign-in surface for unauthenticated users" (
    uses (
        view AppUIModule.HeaderSection,
        view UIModule.LoginForm (
            onSubmit is (
                state.return (
                    value is credentials
                )
            )
        )
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this screen to its module.

## Accessing State

A screen has implicit access to two runtime values:

**`context`** — the context the state received on entry. The screen reads from it to decide what to render and what data to pass to child views:

```wds
view UIModule.UserGreeting (
    name is context.fullName
)
```

**`state.return`** — the mechanism through which the screen drives a state transition. Passing a context value to `state.return` produces that context and triggers the corresponding `when` rule in the process:

```wds
view UIModule.LogoutButton (
    onPress is (
        state.return (
            value is signOutRequest
        )
    )
)
```

Both are available anywhere inside the screen's `uses` block — in direct uses, in conditional blocks, and inside nested view arguments.

## Conditional Rendering

A screen adapts what it uses based on the state's received context. The `if` keyword conditionally activates a component when the context matches:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen (
    uses (
        if context is AccountDeauthenticated (
            view UIModule.Notification (
                type is "warning",
                message is context.reason
            )
        )

        if context is AccountRecovered (
            view UIModule.Notification (
                type is "success",
                message is context.message
            )
        )

        view UIModule.LoginForm (
            onSubmit is (
                state.return (
                    value is credentials
                )
            )
        )
    )
)
```

The same screen renders differently depending on how the state was entered — with a warning if the user was deauthenticated, with a success message if they just recovered their account, and with neither if they arrive cold. The state machine determines the condition; the screen responds to it.

For the full conditional and iteration syntax, see [Components](/words/docs/Words/components).

## Examples

A screen that uses a loading indicator while authentication is in progress:

```wds title="AuthModule/screens/AuthenticatingScreen.wds"
module AuthModule
screen AuthenticatingScreen "Shown while credentials are being verified" (
    uses (
        view UIModule.LoadingSpinner,
        view UIModule.StatusMessage (
            text is "Verifying your credentials"
        )
    )
)
```

A screen for an active session with navigation and user-specific content:

```wds title="SessionModule/screens/ActiveSessionScreen.wds"
module SessionModule
screen ActiveSessionScreen "The main surface for an authenticated user" (
    uses (
        view AppUIModule.NavigationBar (
            currentUser is context.fullName
        ),
        view AppUIModule.MainContent,
        view UIModule.LogoutButton (
            onPress is (
                state.return (
                    value is signOutRequest
                )
            )
        )
    )
)
```

A screen that iterates over a collection and renders a card for each item:

```wds title="NotificationsModule/screens/NotificationsScreen.wds"
module NotificationsModule
screen NotificationsScreen "Lists all notifications for the current user" (
    uses (
        view UIModule.PageHeader (
            title is "Notifications"
        ),

        for context.notifications as notification (
            view UIModule.NotificationCard (
                message is notification.message,
                type is notification.type,
                onDismiss is (
                    state.return (
                        value is dismissed
                    )
                )
            )
        )
    )
)
```

## File Location

Each screen lives in its own file under the `screens` directory of its owning module:

```
/my-project/
  AuthModule/
    AuthModule.wds
    screens/
      LoginScreen.wds
      AuthenticatingScreen.wds
    states/
      Unauthenticated.wds
      StartAuthenticating.wds
```

The file is named after the screen it defines.

## Relationship to Other Constructs

A screen is used by a `state`. The state determines when the screen is active and what context it receives. A screen cannot be used by any other component.

A screen uses `view` components, passing them data from `context` and wiring their interactions to `state.return`. Views have no access to the state — the screen is the only point of contact between the state and the view tree.

A screen can reference components from other modules using their qualified name — `ModuleName.ComponentName` — provided those components are exposed by their module.


---

<!-- 08-view.md -->
# View

A `view` is a reusable rendering unit. It is used by screens or other views, and receives everything it needs — data, configuration, and interaction callbacks — via props. A view has no access to the state.

A view must always have a component parent. It cannot be used by a state directly.

## Purpose

A view's role is to render a discrete piece of UI and forward interactions upward to its parent. It knows nothing about the state of the application — it knows only what it has been given.

Where a screen is the full surface the user sees, a view is a part of that surface. A form section, a card, a navigation bar, a notification banner — these are views. They render what they receive and emit what the user does.

## Syntax

The `view` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body declares the view's data contract across two blocks — `props` and `state`:

```wds title="AuthModule/views/LoginFormSection.wds"
module AuthModule
view LoginFormSection "Renders the login form and surfaces submission interactions" (
    props (
        error(AuthError),
        onSubmit credentials(AccountCredentials),
        onForgotPassword details(RecoverAccount)
    )
    state (
        inputEmail(string) is "",
        inputPassword(string) is ""
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this view to its module.

## Data Contract

A view's data contract is defined across two blocks. Each covers a distinct concern:

### `props`

`props` declares the data and interaction callbacks the view receives from its parent. Every prop is typed. Props are always passed in by the parent and they cannot be assigned a default value inside the view definition:

```wds title="UIModule/views/NotificationBanner.wds"
module UIModule
view NotificationBanner "Displays a contextual message to the user" (
    props (
        type(string),
        message(string),
        onDismiss notification(NotificationDismissed)
    )
)
```

A screen passes the module's state data and callbacks through props. A view passes its own props or derived values down to any views it uses.

### `state`

`state` declares local mutable data owned by the view itself. It is not visible to the parent and does not flow upward. Each entry is typed and can declare a default value with `is`:

```wds title="AuthModule/views/LoginFormSection.wds"
module AuthModule
view LoginFormSection (
    props (
        onSubmit credentials(AccountCredentials)
    )
    state (
        inputEmail(string) is "",
        inputPassword(string) is "",
        isSubmitting(boolean) is false
    )
)
```

Local state is for concerns that belong entirely to the view — input values, toggle states, hover conditions. It is not a mechanism for storing application data.

## Nesting

A view can use other views inside its own `uses` block, composing larger UI units from smaller ones. In this example, `OrderSummary` is a view that threads its own props down to three child views, and forwards interaction callbacks back up to its parent:

```wds title="CatalogModule/views/OrderSummary.wds"
module CatalogModule
view OrderSummary "Renders a summary of the current order" (
    props (
        orderId(integer),
        items(list(OrderItem)),
        total(float),
        onConfirm confirmDetails(OrderConfirmed),
        onCancel cancelDetails(OrderCancelled)
    )
    uses (
        view UIModule.OrderItemList (
            items is props.items
        ),
        view UIModule.OrderTotal (
            total is props.total
        ),
        view UIModule.OrderActions (
            // shapes the arguments to type of confirmDetails, OrderConfirmed
            onConfirm is props.onConfirm (
                orderId is props.orderId, 
                action is "Confirmed"
            ),
            // shapes the arguments to type of cancelDetails, OrderCancelled
            onCancel is props.onCancel (
                orderId is props.orderId,
                action is "Canceled"
            )
        )
    )
)
```

`OrderActions` declares its callbacks as typed props, which is what allows the parent to pass handlers through and what the parser uses to infer the argument names available inside each handler body:

```wds title="UIModule/views/OrderActions.wds"
module UIModule
view OrderActions "Renders the confirm and cancel controls for an order" (
    props (
        // not type for props means these are callback functions with no arguments
        onConfirm,
        onCancel
    )
    uses (
        view UIModule.PrimaryButton (
            onClick is props.onConfirm
        ),
        view UIModule.SecondaryButton (
            onClick is props.onCancel
        )
    )
)
```

Data passed to a view via `props` is referenced inside the view as `props.propertyName`. This is how a view threads data down to its own children without having access to the state.

## Examples

A simple presentational view with no interactions:

```wds title="UIModule/views/UserGreeting.wds"
module UIModule
view UserGreeting "Displays a personalised greeting for the current user" (
    props (
        fullName(string),
        lastLoginAt(string)
    )
)
```

A form view with local input state and a submission callback:

```wds title="AuthModule/views/LoginFormSection.wds"
module AuthModule
view LoginFormSection "Renders the login form and surfaces submission interactions" (
    props (
        error(AuthError),
        onSubmit credentials(AccountCredentials),
        onForgotPassword accountDetails(RecoverAccount)
    )
    state (
        inputEmail(string) is "",
        inputPassword(string) is ""
    )
)
```

A reusable card view with interaction callbacks declared in props:

```wds title="UIModule/views/NotificationCard.wds"
module UIModule
view NotificationCard "Displays a single notification with dismiss and action controls" (
    props (
        message(string),
        type(string),
        onDismiss notification(NotificationDismissed),
        onAction notification(NotificationActioned)
    )
)
```

## File Location

Each view lives in its own file under the `views` directory of its owning module:

```
/my-project/
  AuthModule/
    AuthModule.wds
    screens/
      LoginScreen.wds
    views/
      LoginFormSection.wds
  UIModule/
    views/
      NotificationBanner.wds
      NotificationCard.wds
  CatalogModule/
    views/
      OrderSummary.wds
```

The file is named after the view it defines.

## Relationship to Other Constructs

A view is used by a `screen` or by another `view`. It cannot be used by a `state` directly — a screen is always the entry point between the state and the view tree.

A view receives data from its parent via `props` and surfaces interactions upward via `props` callbacks. It has no access to `context` or `state.return` — those are available only to the screen.

A view can use other views, composing larger UI units. It can reference views from other modules using their qualified name — `ModuleName.ViewName` — provided those views are exposed by their module.


---

<!-- 09-provider.md -->
# Provider

A `provider` computes and exposes in-memory derived data to other components. It does not perform I/O — it works only with data already available within the system, transforming it into models, collections, or other shaped contracts that screens, views, and other components can consume.

## Purpose

A provider's role is to own the computation and representation of data inside the system boundary. Where an adapter brings data in from the outside, a provider works with what is already there — normalising it, filtering it, aggregating it, or mapping it into a form that is ready for display or further processing.

A provider exposes its data through an `interface`, which declares the methods other components can call. It receives its dependencies through `props` — adapters, other interfaces, or configuration values — and maintains its own in-memory `state` for data it needs to hold between calls.

## Syntax

The `provider` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body declares `props`, `state`, and `interface`:

```wds title="ProductsModule/providers/ProductsProvider.wds"
module ProductsModule
provider ProductsProvider "Supplies product data to the products UI" (
    props (
        productsAdapter(ProductsAdapter)
    )
    state (
        products(list(Product)) is [],
        selectedProduct(?Product)
    )
    interface (
        getProducts returns(list(Product))
            "Returns the full list of available products"
        getSelectedProduct returns(Product)
            "Returns the currently selected product"
        selectProduct product(Product)
            "Sets the selected product"
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this provider to its module.

## `props`

`props` declares the dependencies the provider receives at initialisation. These are typically adapters that perform the I/O the provider depends on, or interface components that supply typed data contracts:

```wds title="SessionModule/providers/SessionProvider.wds"
module SessionModule
provider SessionProvider "Manages the active session and exposes user data" (
    props (
        sessionAdapter(SessionAdapter),
        userModel(UserModel)
    )
    interface (
        getActiveSession returns(SessionToken)
            "Returns the current active session token"
        getCurrentUser returns(UserModel)
            "Returns the authenticated user"
    )
)
```

A provider never performs I/O directly. When it needs external data, it delegates to an adapter received through `props`.

## `state`

`state` declares the in-memory data the provider owns and manages internally. It is not visible to other components directly — it is exposed only through the `interface`. Each entry is typed and can declare a default value with `is`. An entry that may be absent is marked with `?` — no default value is needed:

```wds title="CatalogueModule/providers/CatalogueProvider.wds"
module CatalogueModule
provider CatalogueProvider "Manages the product catalogue and search results" (
    props (
        catalogueAdapter(CatalogueAdapter)
    )
    state (
        catalogue(list(CatalogueItem)) is [],
        searchResults(list(CatalogueItem)) is [],
        activeFilter(?CatalogueFilter)
    )
    interface (
        getCatalogue returns(list(CatalogueItem))
            "Returns the full product catalogue"
        getSearchResults returns(list(CatalogueItem))
            "Returns the current search results"
        search query(string)
            "Filters the catalogue by the given query"
        applyFilter filter(CatalogueFilter)
            "Applies a filter to the catalogue"
    )
)
```

## `interface`

`interface` declares the methods the provider exposes to other components. Each method is named, lists its parameters if any, and declares its return type if it produces one. Return types can be any `interface`, primitives or lists or collections:

```wds title="CartModule/providers/CartProvider.wds"
module CartModule
provider CartProvider "Manages the shopping cart contents and totals" (
    props (
        cartAdapter(CartAdapter)
    )
    state (
        items(list(CartItem)) is [],
        total(float) is 0
    )
    interface (
        getItems returns(list(CartItem))
            "Returns all items currently in the cart"
        getTotal returns(float)
            "Returns the current cart total"
        addItem item(CartItem)
            "Adds an item to the cart"
        removeItem item(CartItem)
            "Removes an item from the cart"
        clear
            "Empties the cart"
    )
)
```

A method that produces no output omits the `returns` clause. A method that takes no parameters lists only its name and description.

## Examples

A provider that normalises data from an adapter into a display-ready model:

```wds title="OrdersModule/providers/OrdersProvider.wds"
module OrdersModule
provider OrdersProvider "Supplies order history and order detail to the orders UI" (
    props (
        ordersAdapter(OrdersAdapter)
    )
    state (
        orders(list(OrderSummary)) is [],
        activeOrder(?OrderDetail)
    )
    interface (
        getOrders returns(list(OrderSummary))
            "Returns the list of past orders"
        getActiveOrder returns(OrderDetail)
            "Returns the currently selected order in full detail"
        selectOrder id(string)
            "Sets the active order by id"
    )
)
```

A provider that aggregates data from multiple adapters:

```wds title="DashboardModule/providers/DashboardProvider.wds"
module DashboardModule
provider DashboardProvider "Aggregates data from multiple sources for the dashboard" (
    props (
        analyticsAdapter(AnalyticsAdapter),
        notificationsAdapter(NotificationsAdapter)
    )
    state (
        metrics(?DashboardMetrics),
        notifications(list(Notification)) is []
    )
    interface (
        getMetrics returns(DashboardMetrics)
            "Returns the current dashboard metrics"
        getNotifications returns(list(Notification))
            "Returns all active notifications"
        dismissNotification id(string)
            "Dismisses a notification by id"
    )
)
```

## File Location

Each provider lives in its own file under the `providers` directory of its owning module:

```
/my-project/
  ProductsModule/
    ProductsModule.wds
    providers/
      ProductsProvider.wds
    adapters/
      ProductsAdapter.wds
    interfaces/
      Product.wds
      CatalogueFilter.wds
```

The file is named after the provider it defines.

## Relationship to Other Constructs

A provider is used by a `state` or consumed by another component through its `interface`. It receives adapters and interface components through `props` and delegates all I/O to them — a provider never performs I/O directly.

A provider exposes its data through `interface` methods whose return types are `interface` components — models, collections, or other typed contracts defined in the module. Its internal `state` is not accessible directly from outside — only through the methods the `interface` declares.


---

<!-- 10-adapter.md -->
# Adapter

An `adapter` is the I/O boundary of the system. It is the only construct permitted to communicate with the outside world — HTTP APIs, databases, local storage, hardware, or operating system services. Every external call in a WORDS specification is traceable to an adapter.

## Purpose

An adapter's role is to bridge the system to external services and resources. Where a provider works with data already inside the system, an adapter reaches outside it. It is the only construct in the language permitted to perform I/O, and the only one permitted to be async.

This constraint is deliberate. By concentrating all external communication in adapters, a WORDS specification makes the system boundary explicit. Every point at which the system touches the outside world is named, typed, and visible in the specification. Nothing is hidden inside a state, a provider, or a view.

## Syntax

The `adapter` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body declares `props`, `state`, and `interface`:

```wds title="AuthModule/adapters/AuthAdapter.wds"
module AuthModule
adapter AuthAdapter "Connects to the authentication service" (
    props (
        baseUrl(string),
        timeoutMs(integer) is 5000
    )
    interface (
        login credentials(AccountCredentials) returns(SystemUser)
            "Authenticates the user against the backend"
        logout session(SessionToken)
            "Invalidates the current session"
        refreshToken token(SessionToken) returns(SessionToken)
            "Exchanges an expiring token for a new one"
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this adapter to its module.

## `props`

`props` declares the environment-level configuration the adapter receives at initialisation. These are stable values that do not change at runtime — base URLs, timeouts, API keys, and similar settings:

```wds title="SessionModule/adapters/SessionAdapter.wds"
module SessionModule
adapter SessionAdapter "Connects to external systems for synchronising the session" (
    props (
        baseUrl(string),
        timeoutMs(integer) is 5000,
        retryAttempts(integer) is 3
    )
    interface (
        checkSession returns(?StoredSession)
            "Checks for any previous sessions"
        validateSession existing(StoredSession) returns(SessionToken)
            "Validates the stored session against the backend"
        refreshSession expiring(SessionToken) returns(SessionToken)
            "Exchanges the refresh token for a new access token"
    )
)
```

Props on an adapter are configuration, not runtime data. They are set once when the adapter is initialised and do not change during the lifetime of the session.

## `state`

`state` declares instance-level data the adapter owns and manages internally — connection state, cached tokens, retry counters, or any other runtime value the adapter needs to track between calls:

```wds title="CatalogueModule/adapters/CatalogueAdapter.wds"
module CatalogueModule
adapter CatalogueAdapter "Connects to the product catalogue service" (
    props (
        baseUrl(string),
        apiKey(string)
    )
    state (
        lastFetchedAt(?integer),
        cachedEtag(?string)
    )
    interface (
        fetchCatalogue returns(list(CatalogueItem))
            "Fetches the full product catalogue"
        fetchItem id(string) returns(?CatalogueItem)
            "Fetches a single catalogue item by id"
    )
)
```

## `interface`

`interface` declares the methods the adapter exposes to other components. Each method is named, lists its parameters if any, and declares its return type if it produces one. Return types are `interface` components — models, collections, or any other named, typed contract:

```wds title="OrdersModule/adapters/OrdersAdapter.wds"
module OrdersModule
adapter OrdersAdapter "Connects to the orders service" (
    props (
        baseUrl(string),
        timeoutMs(integer) is 8000
    )
    interface (
        fetchOrders returns(list(OrderSummary))
            "Fetches the full order history for the current user"
        fetchOrder id(string) returns(OrderDetail)
            "Fetches a single order in full detail"
        placeOrder cart(CartSummary) returns(OrderReceipt)
            "Submits a new order"
        cancelOrder id(string) returns(OrderCancelled)
            "Cancels an existing order by id"
    )
)
```

A method that produces no output omits the `returns` clause. A method that takes no parameters lists only its name and description. All methods on an adapter are implicitly async — they reach outside the system and may not resolve immediately.

## The Async Rule

An adapter is the only construct in WORDS permitted to be async. Every other construct — providers, views, screens, states — operates synchronously within the system boundary. When a component needs data from outside the system, it does so through an adapter, and the async concern is contained there.

This rule has a direct consequence for how the system is modelled. A state that needs to wait for an external response uses an adapter directly and produces its output context only when the adapter resolves. The adapter handles the async; the state handles the transition.

## Examples

A notifications adapter with state for tracking delivery status:

```wds title="NotificationsModule/adapters/NotificationsAdapter.wds"
module NotificationsModule
adapter NotificationsAdapter "Connects to the push notification service" (
    props (
        serviceUrl(string),
        apiKey(string)
    )
    state (
        deviceToken(?string),
        isRegistered(boolean) is false
    )
    interface (
        register deviceId(string) returns(string)
            "Registers the device and returns a push token"
        send notification(Notification) returns(boolean)
            "Sends a push notification; returns true on success"
        unregister
            "Removes the device registration"
    )
)
```

A storage adapter bridging the system to local device storage:

```wds title="StorageModule/adapters/StorageAdapter.wds"
module StorageModule
adapter StorageAdapter "Reads and writes data to local device storage" (
    props (
        namespace(string)
    )
    interface (
        get key(string) returns(?string)
            "Reads a value from storage by key"
        set key(string) value(string)
            "Writes a value to storage"
        remove key(string)
            "Removes a value from storage by key"
        clear
            "Clears all values in the adapter's namespace"
    )
)
```

## File Location

Each adapter lives in its own file under the `adapters` directory of its owning module:

```
/my-project/
  AuthModule/
    AuthModule.wds
    adapters/
      AuthAdapter.wds
    interfaces/
      AccountCredentials.wds
      SystemUser.wds
      SessionToken.wds
```

The file is named after the adapter it defines.

## Relationship to Other Constructs

An adapter is used by a `state` or consumed by a `provider` through its `props`. It is the only construct permitted to perform I/O and the only one permitted to be async — all external communication in the system flows through adapters.

An adapter exposes its methods through `interface`, whose parameter and return types are `interface` components — models, collections, or other typed contracts defined in the module. Its internal `state` is not accessible from outside — it is the adapter's own concern.


---

<!-- 11-interface.md -->
# Interface

An `interface` is a contract component — a named, typed construct for anything that does not fit the role of a screen, view, provider, or adapter. It can represent a data model, a helper, a handler shape, a callable contract, or any other typed concept the system needs to name explicitly.

An `interface` component is distinct from the `interface` block that appears inside a module definition. The module-level `interface` block declares a module's API — what other modules can call or implement. The `interface` component is a construct in its own right, with its own `props`, `state`, and `uses`, that lives in the component layer alongside screens, views, providers, and adapters.

## Purpose

An `interface` component gives a name and a shape to concepts that exist in the system but don't perform I/O, don't render UI, and don't compute derived data. A `Product` model, a `CatalogueFilter` helper, a `RouteSwitchHandler` callback shape — these are all `interface` components. They are the typed vocabulary the rest of the system uses.

Because every other component's `interface` block declares parameter and return types using named constructs, `interface` components are what give those types their shape. A provider that returns `list(Product)` depends on `Product` being defined as an `interface` component somewhere in the module.

## Syntax

The `interface` keyword is followed by a name in PascalCase, an optional `includes` clause, an optional description in quotes, and a body in parentheses. The body declares `props`, optionally `state`, any methods the contract exposes, and optionally a `uses` block:

```wds title="ProductsModule/interfaces/Product.wds"
module ProductsModule
interface Product "Represents a single product in the catalogue" (
    props (
        id(string),
        name(string),
        price(float),
        description(string),
        imageUrl(string)
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this interface to its module.

An interface can explicitly include one or more other interfaces. This is the only polymorphism mechanism in WORDS:

```wds title="UsersModule/interfaces/AdminUser.wds"
module UsersModule
interface AdminUser includes UserIdentity "Represents an administrator account" (
    props (
        permissions(list(Permission))
    )
)
```

The `includes` clause is nominal and explicit. `AdminUser` can be used anywhere `UserIdentity` is expected because it declares that relationship by name. WORDS does not infer polymorphism from matching property names alone.

When more than one interface is included, the included names are separated by commas:

```wds
interface StaffAdmin includes UserIdentity, AuditActor (
    props (
        permissions(list(Permission))
    )
)
```

## `props`

`props` declares the typed properties that define the shape of the contract. For a data model, these are the fields — accessible via dot notation anywhere the interface is referenced. For a helper or handler, these are the parameters it expects:

```wds title="ProductsModule/interfaces/Product.wds"
module ProductsModule
interface Product "Represents a single product in the catalogue" (
    props (
        id(string),
        name(string),
        price(float),
        description(string),
        imageUrl(string)
    )
)
```

A component that receives a `Product` can access its fields directly — `product.name`, `product.price`, `product.id` — the same way `context` properties and `props` properties are accessed elsewhere in the language.

```wds title="CartModule/interfaces/CartItem.wds"
module CartModule
interface CartItem "Represents a single item in the shopping cart" (
    props (
        productId(string),
        name(string),
        quantity(integer),
        unitPrice(float),
        totalPrice(float)
    )
)
```

```wds title="CatalogueModule/interfaces/CatalogueFilter.wds"
module CatalogueModule
interface CatalogueFilter "Defines the shape of a filter applied to the catalogue" (
    props (
        category(?string),
        minPrice(?float),
        maxPrice(?float),
        inStockOnly(boolean) is false
    )
)
```

## Polymorphism

Interface polymorphism is expressed with `includes`. It allows one data interface to declare that it satisfies another interface's shape:

```wds title="UsersModule/interfaces/UserIdentity.wds"
module UsersModule
interface UserIdentity "Identifies a user anywhere in the system" (
    props (
        id(string),
        fullName(string)
    )
)
```

```wds title="UsersModule/interfaces/AdminUser.wds"
module UsersModule
interface AdminUser includes UserIdentity "Represents a user with administrative permissions" (
    props (
        permissions(list(Permission))
    )
)
```

A value of type `AdminUser` can now be passed wherever `UserIdentity` is expected:

```wds title="UsersModule/views/AdminHeader.wds"
module UsersModule
view AdminHeader "Displays the active administrator" (
    props (
        admin(AdminUser)
    )
    uses (
        view UsersModule.UserBadge (
            user is props.admin
        )
    )
)
```

```wds title="UsersModule/views/UserBadge.wds"
module UsersModule
view UserBadge "Displays a user identity" (
    props (
        user(UserIdentity)
    )
)
```

For semantic analysis, assignment is valid when the actual type is the same as the expected type, or when the actual interface includes the expected interface directly or transitively.

`includes` is deliberately limited to data interfaces — interfaces that declare `props` only. An interface that declares methods, `state`, or `uses` cannot be included and cannot include another interface. This avoids behavioral inheritance, override rules, lifecycle ambiguity, and hidden runtime behavior.

When an interface includes another interface:

- The included interface's props are readable on the including interface.
- Cycles are invalid.
- Duplicate prop names are invalid unless they have the exact same type.
- Cross-module includes use the qualified name, such as `SharedModule.UserIdentity`.

WORDS does not support inheritance for modules, states, processes, screens, views, providers, or adapters. Reuse in those constructs is expressed through explicit composition with `uses`, module contracts, callbacks, and runtime calls.

## Methods

An `interface` component can expose methods directly in its body after `props`. Methods declare behavior — actions the contract can perform or values it can compute — not data access. Data access is handled through `props` directly via dot notation. Each method is named, lists its parameters if any, and declares a return type if it produces one:

```wds title="RoutingModule/interfaces/Router.wds"
module RoutingModule
interface Router "A callable routing contract" (
    props (
        basePath(string)
    )
    navigate path(string)
        "Navigates to the given path"
    back
        "Navigates to the previous path"
    getCurrentPath returns(string)
        "Returns the current active path"
)
```

A method that produces no output omits `returns`. A method that takes no parameters lists only its name and description.

## `state`

`state` declares private instance-level data the interface component owns and manages internally. It is not accessible from outside — it is exposed only through the methods the component declares:

```wds title="OrdersModule/interfaces/OrderDetail.wds"
module OrdersModule
interface OrderDetail "Represents a fully detailed order" (
    props (
        id(string),
        placedAt(integer),
        status(string),
        total(float)
    )
    state (
        items(list(OrderItem)) is [],
        shippingAddress(?ShippingAddress)
    )
    uses (
        adapter system.OrdersModule.OrdersAdapter.loadOrderItems (
            orderId is props.id,
            onLoad is (
                state.items is items
            )
        ),
        adapter system.OrdersModule.OrdersAdapter.loadShippingAddress (
            orderId is props.id,
            onLoad is (
                state.shippingAddress is shippingAddress
            )
        )
    )
    getItems returns(list(OrderItem))
        "Returns the order items once loaded"
    getShippingAddress returns(?ShippingAddress)
        "Returns the shipping address once loaded"
)
```

When the adapter method resolves, `onLoad` fires and receives the adapter's return value. The parameter name inside the callback body is inferred from the adapter method's return type signature. The body assigns it directly into the interface's `state` using the standard `is` keyword. The methods `getItems` and `getShippingAddress` expose that state to the outside. The consumer calls the methods without any knowledge of how or when the data was fetched — the interface component manages its own lifecycle entirely.

## `uses`

A `uses` block activates adapters or providers that supply the interface component's internal data. Each adapter call declares an `onLoad` argument whose body fires when the adapter resolves. The parameter name is inferred from the adapter method's return type signature, and the body assigns it directly into `state`:

```wds
onLoad is (
    state.<field> is <name>
)
```

- `<name>` — the identifier inferred from the adapter method's return type, available inside the callback body
- `state.<field>` — the state field to write into
- `is` — the assignment operator, consistent with the rest of the language

A full example:

```wds title="ProductsModule/interfaces/ProductDetails.wds"
module ProductsModule
interface ProductDetails "Loads and exposes full product details" (
    props (
        id(string)
    )
    state (
        reviews(list(ProductReview)) is [],
        relatedProducts(list(Product)) is []
    )
    uses (
        adapter system.ProductsModule.ProductsAdapter.loadReviews (
            productId is props.id,
            onLoad is (
                state.reviews is reviews
            )
        ),
        adapter system.ProductsModule.ProductsAdapter.loadRelated (
            productId is props.id,
            onLoad is (
                state.relatedProducts is relatedProducts
            )
        )
    )
    getReviews returns(list(ProductReview))
        "Returns the product reviews once loaded"
    getRelatedProducts returns(list(Product))
        "Returns the related products once loaded"
)
```

The parameter name inside the callback body is inferred from the adapter method's return type and is scoped to that body alone.

## Module-Level Use

Beyond the component layer, `interface` plays a role in cross-module communication. A module can declare a handler interface — a contract that other modules implement and register against. When the owning module fires the event, every registered handler is called.

A module declares the handler interface in its own definition:

```wds title="RoutingModule/RoutingModule.wds"
module RoutingModule (
    interface RouteSwitchHandler (
        switch path(string) (
            if path is "/home"
                enter Home "The /home path activates the home screen"
        )
    )
)
```

Another module implements it and registers itself:

```wds title="ProductsModule/ProductsModule.wds"
module ProductsModule (
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

This is the subscription pattern — a module declares the shape of the callback, other modules implement it and register themselves, and the owning module fires the event to all registered handlers. Adding a new module never requires touching an existing one.

## Examples

A data model whose fields are accessed via dot notation:

```wds title="SessionModule/interfaces/AuthSession.wds"
module SessionModule
interface AuthSession "Represents an active session token" (
    props (
        token(string),
        expiresAt(integer),
        userId(string)
    )
)
```

A typed error contract:

```wds title="AuthModule/interfaces/AuthenticationError.wds"
module AuthModule
interface AuthenticationError "Represents an authentication failure" (
    props (
        code(string),
        reason(string)
    )
)
```

A callable contract that exposes behavior through methods:

```wds title="SharedModule/interfaces/Pagination.wds"
module SharedModule
interface Pagination "A callable pagination contract" (
    props (
        page(integer) is 0,
        pageSize(integer) is 20,
        total(integer)
    )
    nextPage
        "Advances to the next page"
    previousPage
        "Goes back to the previous page"
    goToPage page(integer)
        "Navigates to a specific page"
    hasMore returns(boolean)
        "Returns true if there are more pages"
)
```

## File Location

Each interface component lives in its own file under the `interfaces` directory of its owning module:

```
/my-project/
  ProductsModule/
    ProductsModule.wds
    interfaces/
      Product.wds
      CatalogueFilter.wds
  CartModule/
    interfaces/
      CartItem.wds
  OrdersModule/
    interfaces/
      OrderDetail.wds
      OrderItem.wds
      OrderSummary.wds
  SharedModule/
    interfaces/
      Pagination.wds
```

The file is named after the interface it defines.

## Relationship to Other Constructs

An `interface` component can be used by a `state`, a `screen`, a `view`, a `provider`, or an `adapter`. It provides the typed vocabulary — models, helpers, handler shapes, callable contracts — that all other components reference in their own `props` and method declarations.

At the module level, `interface` is also the mechanism through which modules expose APIs and declare subscription contracts. This is a different role from the component — it is the module's boundary, not a construct that lives in the component layer — but both share the same keyword and the same principle: a named, typed shape that the rest of the system can depend on.
