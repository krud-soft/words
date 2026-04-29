---
title: State
---

# State

A `state` represents a condition the module is currently in. It is the smallest behavioral unit in a WORDS specification: the point at which the system has settled, is waiting for something to happen, and can return a context that drives the next transition. Every state declares what it expects on entry, what it can return, and what it uses while resident.

## Purpose

A state is a stable condition. The system has arrived here, and the state remains active until it returns a context. A context is a typed message or result; it may describe the outcome of work performed by the state, but it is not the action itself. The process uses that returned context to decide where the module goes next.

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

The `uses` block declares what the state activates while resident, such as a screen, an adapter, a provider, or a combination. What is used depends on whether the state is presenting UI, triggering background work, computing local data, or coordinating runtime calls.

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

When producing a returned context requires a side effect — like persisting a context — the `returns` block can expand to declare that side effect inline:

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

The side effect must complete before the context is returned. Only after the side effect succeeds does the module transition. `system.dropContext` clears the stored context. Modules may also exchange typed values through explicit APIs, handlers, and callbacks, but shared named context storage is handled through `system`.

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

Inside a state, `context` refers to the context the state received on entry. The state's `uses` block can pass that value into adapters, providers, runtime calls, or screens. A screen activated by the state also has direct access to the same `context`.

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

An example in which the state mounts a screen and changes its output based on confirmation and cancellation actions:

```wds

module CatalogModule
state OrderDisplaying receives OrderContext (
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
