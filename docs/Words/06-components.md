---
title: Components
---

# Components

Components are the constructs closest to implementation in a WORDS specification. They are what a state uses — the things that render UI, compute data, perform I/O, and expose behavior to the rest of the system.

There are five component types: `screen`, `view`, `provider`, `adapter`, and `interface`. Each has a distinct role and a defined set of rules about what it can access and what it can do. What they share is a common syntax for mounting, composing, and passing data — described on this page before the individual construct references.

---

## The Component Layer

Components sit below the behavioral layer in the WORDS hierarchy. A `state` activates them — it does not implement them. The state declares what is used; the component defines what that means.

| Construct | Role |
|---|---|
| `screen` | Top-level UI unit; used by a state; has implicit access to `state.context` |
| `view` | Reusable rendering unit; used by screens or other views; receives all data via props |
| `provider` | Computes and exposes in-memory derived data; no I/O |
| `adapter` | The only construct permitted to perform I/O; the only construct permitted to be async |
| `interface` | Descriptors for components that don't fit the other constructs — models, helpers, and any other named, typed contract |

A state can use any component except `view` — so `screen`, `adapter`, `provider`, and `interface` are all valid state mounts. A `view` must always have a component parent that passes it what it needs.

---

## The `uses` Block

Every component that activates other components does so inside a `uses` block. The block lists what is used, one per line. When more than one thing is used, the entries are separated by a comma:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen (
    uses (
        view AppUIModule.HeaderSection,
        view UIModule.LoginForm (
            onSubmit callback is (
                state.return(AccountCredentials)
            ),
            onForgotPassword callback is (
                state.return(RecoverAccount)
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

Arguments are passed to a mounted component using the `is` keyword. The argument name comes first, followed by `is`, followed by the value:

```wds
view UIModule.Notification type is "warning"
```

When more than one argument is passed, they are separated by a comma:

```wds
view UIModule.Notification type is "warning", message is state.context.reason
```

This syntax is consistent with the rest of the WORDS language. The `is` keyword assigns a value. The same keyword is used for comparisons in conditional expressions — context determines which role it plays.

---

## Conditional Mounting

A component is conditionally useed using `if`. The condition evaluates the current state's context — what type it is, or what value a property holds:

```wds
if state.context is AccountDeauthenticated (
    view UIModule.Notification type is "warning", message is state.context.reason
)
```

The negative form uses `is not`:

```wds
if state.context is not AccountRecovered (
    view UIModule.Notification type is "error", message is state.context.reason
)
```

A property on the context can also be evaluated directly:

```wds
if state.context.status is "pending" (
    view UIModule.Notification type is "info", message is "Your request is being processed"
)
```

Conditional blocks can appear inside any component's `uses` block. Each is evaluated independently. This is how components adapt what they mount depending on context — the state machine drives the condition, the component responds to it:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen (
    uses (
        view AppUIModule.HeaderSection,

        if state.context is AccountDeauthenticated (
            view UIModule.Notification type is "warning", message is state.context.reason
        )

        if state.context is AccountRecovered (
            view UIModule.Notification type is "success", message is state.context.message
        )

        view UIModule.LoginForm (
            onSubmit callback is (
                state.return(AccountCredentials)
            ),
            onForgotPassword callback is (
                state.return(RecoverAccount)
            )
        )
    )
)
```

---

## Iteration

A component iterates over a collection using `for ... as`. The syntax names the collection, binds the iteration variable with `as`, then the body in parentheses:

```wds
for state.context.notifications as notification (
    view UIModule.NotificationCard (
        message is notification.message,
        type is notification.type
    )
)
```

The iteration variable is bound with `as` and is available inside the body block. Each item in the collection produces one mounted instance of the child component.

`for ... as` can appear inside a `uses` block alongside other entries:

```wds title="UIModule/screens/DashboardScreen.wds"
module UIModule
screen DashboardScreen (
    uses (
        view UIModule.PageHeader title is "Dashboard",

        for state.context.notifications as notification (
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

Components compose by nesting. A `screen` uses `view` components. A `view` can mount further `view` components. There is no depth limit, but the ownership direction is always the same: a parent passes data and handlers down; a child emits events or calls handlers upward.

```wds title="UIModule/screens/ProductScreen.wds"
module UIModule
screen ProductScreen (
    uses (
        view UIModule.ProductLayout (
            view UIModule.ProductHeader title is state.context.name,
            view UIModule.ProductBody (
                view UIModule.ProductDescription text is state.context.description,
                view UIModule.ProductActions (
                    onAddToCart callback is (
                        state.return(CartItem)
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
            items is state.context.items,
            total is state.context.total,
            onConfirm callback is (
                state.return(OrderConfirmed)
            )
        )
    )
)
```

This unidirectional contract keeps components predictable and reusable. A view that receives everything through props can be mounted anywhere without depending on how the state was entered.

---

## Referencing Components Across Modules

A component defined in one module can be mounted by a component in another. The reference uses the qualified name — the module name followed by a dot and the component name:

```wds
view AppUIModule.HeaderSection
view UIModule.Notification type is "warning", message is state.context.reason
```

This applies to all component types, including `interface`. An `interface` defined in one module can be used by a state, a screen, or a view in another module using the same qualified name syntax:

```wds
uses interface UIModule.PaginationModel page is state.context.page, total is state.context.total
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
