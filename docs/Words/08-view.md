---
title: View
---

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
